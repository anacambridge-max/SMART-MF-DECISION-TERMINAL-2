import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardCache, appSettings, funds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllIndices } from "@/lib/nseClient";
import { fetchHistoricalNav, computeTechnicals, type FundTechnicals } from "@/lib/amfiClient";
import { scoreFunds, computeMarketRegime, type IndexData, type ScoringWeights } from "@/lib/scoringEngine";
import { DEFAULT_FUNDS } from "@/lib/fundConfig";

const TARGET_INDICES = [
  "NIFTY 50", "NIFTY NEXT 50", "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250", "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY FMCG", "NIFTY METAL", "NIFTY REALTY", "NIFTY FINANCIAL SERVICES", "NIFTY ENERGY", "NIFTY PSU BANK", "NIFTY INFRASTRUCTURE", "NIFTY LARGEMIDCAP 250", "NIFTY 500", "NIFTY MEDIA",
];

const INDEX_ALIASES: Record<string, string[]> = {
  "NIFTY INFRASTRUCTURE": ["NIFTY INFRASTRUCTURE", "NIFTY INFRA", "NIFTYINFRA"],
};

function findNseIndex(map: Map<string, any>, target: string) {
  const aliases = INDEX_ALIASES[target] ?? [target];
  for (const alias of aliases) {
    const hit = map.get(alias.toUpperCase());
    if (hit) return hit;
  }
  return undefined;
}

async function getSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(appSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

async function getActiveFunds() {
  try {
    const rows = await db.select().from(funds).where(eq(funds.isActive, true));
    if (rows.length === 0) return DEFAULT_FUNDS;
    return rows.map((r) => ({ id: r.id, name: r.name, amfiCode: r.amfiCode ?? "", proxyIndex: r.proxyIndex, category: r.category ?? "Other" }));
  } catch {
    return DEFAULT_FUNDS;
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    const settings = await getSettings();
    const strategicWeight = parseFloat(settings["strategic_weight"] ?? "0.6");
    const opportunityWeight = parseFloat(settings["opportunity_weight"] ?? "0.4");
    const weights: ScoringWeights = { strategicWeight, opportunityWeight };
    const activeFunds = await getActiveFunds();

    let cachedPayload: any = null;
    try {
      const cachedRows = await db.select().from(dashboardCache).limit(1);
      cachedPayload = cachedRows[0]?.payload ?? null;
    } catch {
      cachedPayload = null;
    }

    const cachedIndices: IndexData[] = Array.isArray(cachedPayload?.indices) ? cachedPayload.indices : [];
    const cachedFunds: any[] = Array.isArray(cachedPayload?.allFunds) ? cachedPayload.allFunds : [];
    const cachedIndexMap = new Map<string, IndexData>(cachedIndices.map((i) => [i.name.toUpperCase(), i]));
    const cachedFundMap = new Map<number, any>(cachedFunds.map((f) => [Number(f.fundId), f]));

    let rawIndices: IndexData[] = [];
    let dataSourceStatus = "live";

    try {
      const nseData = await fetchAllIndices();
      if (nseData.length === 0) throw new Error("No index data returned from NSE");

      const nseMap = new Map(nseData.map((i) => [i.name.toUpperCase(), i]));
      rawIndices = TARGET_INDICES.map((name) => {
        const q = findNseIndex(nseMap, name);
        if (q) {
          return { name, pChange: q.pChange, last: q.last, previousClose: q.previousClose, yearHigh: q.yearHigh, yearLow: q.yearLow };
        }
        const cached = cachedIndexMap.get(name.toUpperCase());
        return cached ?? { name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 };
      });
    } catch {
      if (cachedIndices.length > 0) {
        rawIndices = TARGET_INDICES.map((name) => cachedIndexMap.get(name.toUpperCase()) ?? { name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 });
        dataSourceStatus = "cached";
      } else {
        rawIndices = TARGET_INDICES.map((name) => ({ name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 }));
        dataSourceStatus = "unavailable";
      }
    }

    const fundTechnicalsMap = new Map<number, FundTechnicals>();

    await Promise.allSettled(activeFunds.map(async (fund) => {
      try {
        if (fund.amfiCode && fund.amfiCode.length > 0) {
          const history = await fetchHistoricalNav(fund.amfiCode);
          if (history.length > 10) {
            fundTechnicalsMap.set(fund.id, computeTechnicals(history));
            return;
          }
        }

        const cachedTech = cachedFundMap.get(Number(fund.id))?.technicals as FundTechnicals | undefined;
        fundTechnicalsMap.set(fund.id, cachedTech ?? computeTechnicals([]));
      } catch {
        const cachedTech = cachedFundMap.get(Number(fund.id))?.technicals as FundTechnicals | undefined;
        fundTechnicalsMap.set(fund.id, cachedTech ?? computeTechnicals([]));
      }
    }));

    const fundInputs = activeFunds.map((f) => ({
      id: f.id,
      name: f.name,
      proxyIndex: f.proxyIndex,
      category: f.category,
      // Always provide the required type. If historical NAV is unavailable,
      // computeTechnicals([]) returns an explicit all-null technical state;
      // no invented prices or technical values are used.
      technicals: fundTechnicalsMap.get(f.id) ?? computeTechnicals([]),
    }));

    const scoredFunds = scoreFunds(fundInputs, rawIndices, weights);
    const sortedFunds = [...scoredFunds].sort((a, b) => b.finalScore - a.finalScore || a.fundId - b.fundId);

    // Explicitly separate the Top 5 investment candidates from the full watchlist.
    const topFunds = sortedFunds.filter((f) => !f.isAvoid).slice(0, 5);
    const avoidFunds = sortedFunds.filter((f) => f.isAvoid);
    const regime = computeMarketRegime(rawIndices);

    const now = new Date();
    const payload = {
      timestamp: now.toISOString(),
      dataSourceStatus,
      regime,
      indices: rawIndices,
      topFunds,
      avoidFunds,
      allFunds: sortedFunds,
      weights,
      computedInMs: Date.now() - startTime,
    };

    try {
      const existing = await db.select().from(dashboardCache).limit(1);
      if (existing.length > 0) {
        await db.update(dashboardCache).set({ payload, updatedAt: now }).where(eq(dashboardCache.id, existing[0].id));
      } else {
        await db.insert(dashboardCache).values({ payload, updatedAt: now });
      }
    } catch {
      // Cache failure is non-fatal.
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("Dashboard refresh error:", error);

    try {
      const cached = await db.select().from(dashboardCache).limit(1);
      if (cached.length > 0) {
        return NextResponse.json({ success: false, fromCache: true, error: "Live data fetch failed. Showing last cached snapshot.", data: cached[0].payload });
      }
    } catch {
      // DB also failed.
    }

    return NextResponse.json({ success: false, error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
