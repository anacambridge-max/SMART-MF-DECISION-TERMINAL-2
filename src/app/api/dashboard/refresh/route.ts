import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardCache, appSettings, funds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllIndices } from "@/lib/nseClient";
import { fetchHistoricalNav, computeTechnicals, type FundTechnicals } from "@/lib/amfiClient";
import { scoreFunds, computeMarketRegime, type IndexData, type ScoringWeights } from "@/lib/scoringEngine";
import { DEFAULT_FUNDS } from "@/lib/fundConfig";

// Canonical names used by the dashboard. These must match the actual NSE index names,
// not ETF prices or similarly named thematic proxies.
const TARGET_INDICES = [
  "NIFTY 50",
  "NIFTY NEXT 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250",
  "NIFTY BANK",
  "NIFTY IT",
  "NIFTY AUTO",
  "NIFTY PHARMA",
  "NIFTY HEALTHCARE",
  "NIFTY FMCG",
  "NIFTY METAL",
  "NIFTY REALTY",
  "NIFTY FINANCIAL SERVICES",
  "NIFTY ENERGY",
  "NIFTY PSU BANK",
  "NIFTY INFRASTRUCTURE",
  "NIFTY LARGEMIDCAP 250",
  "NIFTY 500",
  "NIFTY MEDIA",
  "NIFTY SERVICES SECTOR",
];

// NSE sometimes exposes the infrastructure index using the legacy/short form.
// Accept only known aliases and normalize them to the official dashboard name.
const INDEX_ALIASES: Record<string, string> = {
  "NIFTY INFRA": "NIFTY INFRASTRUCTURE",
  "NIFTY INFRASTRUCTURE": "NIFTY INFRASTRUCTURE",
  "NIFTY INFRASTRUCTURE TRI": "NIFTY INFRASTRUCTURE",
  "NIFTY HEALTHCARE": "NIFTY HEALTHCARE",
  "NIFTY SERVICES SECTOR": "NIFTY SERVICES SECTOR",
};

function canonicalIndexName(name: string): string {
  const key = name.trim().toUpperCase();
  return INDEX_ALIASES[key] ?? key;
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
    return rows.map((r) => ({ id: r.id, name: r.name, amfiCode: r.amfiCode ?? "", proxyIndex: canonicalIndexName(r.proxyIndex), category: r.category ?? "Other" }));
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

    // Previous real snapshot is allowed as a stale-data fallback, but NEVER invent a new price.
    let cachedPayload: any = null;
    try {
      const cachedRows = await db.select().from(dashboardCache).limit(1);
      cachedPayload = cachedRows[0]?.payload ?? null;
    } catch {
      cachedPayload = null;
    }

    const cachedIndices: IndexData[] = Array.isArray(cachedPayload?.indices) ? cachedPayload.indices : [];
    const cachedFunds: any[] = Array.isArray(cachedPayload?.allFunds) ? cachedPayload.allFunds : [];
    const cachedIndexMap = new Map<string, IndexData>(cachedIndices.map((i) => [canonicalIndexName(i.name), { ...i, name: canonicalIndexName(i.name) }]));
    const cachedFundMap = new Map<number, any>(cachedFunds.map((f) => [Number(f.fundId), f]));

    let rawIndices: IndexData[] = [];
    let dataSourceStatus = "live";

    try {
      const nseData = await fetchAllIndices();
      if (nseData.length === 0) throw new Error("No index data returned from NSE");

      const nseMap = new Map<string, (typeof nseData)[number]>();
      for (const item of nseData) {
        const canonical = canonicalIndexName(item.name);
        if (!nseMap.has(canonical)) nseMap.set(canonical, item);
      }

      // Build ONLY from actual NSE rows. Missing indices remain unavailable rather than being fabricated.
      rawIndices = TARGET_INDICES.map((name) => {
        const q = nseMap.get(name);
        if (q) {
          return {
            name,
            pChange: q.pChange,
            last: q.last,
            previousClose: q.previousClose,
            yearHigh: q.yearHigh,
            yearLow: q.yearLow,
          };
        }

        const cached = cachedIndexMap.get(name);
        if (cached) return { ...cached, name };

        return { name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 };
      });
    } catch {
      if (cachedIndices.length > 0) {
        rawIndices = TARGET_INDICES.map((name) => cachedIndexMap.get(name) ?? { name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 });
        dataSourceStatus = "cached";
      } else {
        // No fake fallback. The UI will explicitly show unavailable data.
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
        if (cachedTech) fundTechnicalsMap.set(fund.id, cachedTech);
      } catch {
        const cachedTech = cachedFundMap.get(Number(fund.id))?.technicals as FundTechnicals | undefined;
        if (cachedTech) fundTechnicalsMap.set(fund.id, cachedTech);
      }
    }));

    const fundInputs = activeFunds.map((f) => ({
      id: f.id,
      name: f.name,
      proxyIndex: f.proxyIndex,
      category: f.category,
      technicals: fundTechnicalsMap.get(f.id) ?? (cachedFundMap.get(Number(f.id))?.technicals as FundTechnicals | undefined),
    }));

    const scoredFunds = scoreFunds(fundInputs, rawIndices, weights);
    const sortedFunds = [...scoredFunds].sort((a, b) => b.finalScore - a.finalScore || a.fundId - b.fundId);

    // Explicitly separate the Top 5 investment candidates from the full watchlist.
    // These are the five highest-scoring non-avoid funds only.
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
