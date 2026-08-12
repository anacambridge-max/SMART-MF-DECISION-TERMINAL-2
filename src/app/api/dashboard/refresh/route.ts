import { NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardCache, appSettings, funds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllIndices } from "@/lib/nseClient";
import {
  fetchHistoricalNav,
  computeTechnicals,
  type FundTechnicals,
} from "@/lib/amfiClient";
import {
  scoreFunds,
  computeMarketRegime,
  generateMockIndices,
  generateMockTechnicals,
  type IndexData,
  type ScoringWeights,
} from "@/lib/scoringEngine";
import { DEFAULT_FUNDS } from "@/lib/fundConfig";

const TARGET_INDICES = [
  "NIFTY 50",
  "NIFTY NEXT 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250",
  "NIFTY BANK",
  "NIFTY IT",
  "NIFTY AUTO",
  "NIFTY PHARMA",
  "NIFTY FMCG",
  "NIFTY METAL",
  "NIFTY REALTY",
  "NIFTY FINANCIAL SERVICES",
  "NIFTY ENERGY",
  "NIFTY PSU BANK",
  "NIFTY INFRA",
  "NIFTY LARGEMIDCAP 250",
  "NIFTY 500",
  "NIFTY MEDIA",
];

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
    const rows = await db
      .select()
      .from(funds)
      .where(eq(funds.isActive, true));
    if (rows.length === 0) return DEFAULT_FUNDS;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      amfiCode: r.amfiCode ?? "",
      proxyIndex: r.proxyIndex,
      category: r.category ?? "Other",
    }));
  } catch {
    return DEFAULT_FUNDS;
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Load settings
    const settings = await getSettings();
    const strategicWeight = parseFloat(settings["strategic_weight"] ?? "0.6");
    const opportunityWeight = parseFloat(
      settings["opportunity_weight"] ?? "0.4"
    );
    const weights: ScoringWeights = { strategicWeight, opportunityWeight };

    // 2. Fetch active funds
    const activeFunds = await getActiveFunds();

    // 3. Fetch NSE index data (server-side proxy)
    let rawIndices: IndexData[] = [];
    let dataSourceStatus = "live";

    try {
      const nseData = await fetchAllIndices();
      if (nseData.length > 0) {
        // Filter to our target indices
        const nseMap = new Map(nseData.map((i) => [i.name.toUpperCase(), i]));
        rawIndices = TARGET_INDICES.map((name) => {
          const q = nseMap.get(name.toUpperCase());
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
          // Use simulated for this specific index
          const mock = generateMockIndices().find(
            (m) => m.name.toUpperCase() === name.toUpperCase()
          );
          return mock ?? { name, pChange: 0, last: 0, previousClose: 0, yearHigh: 0, yearLow: 0 };
        });
        if (rawIndices.every((i) => i.last === 0)) {
          throw new Error("NSE returned empty data");
        }
      } else {
        throw new Error("No index data returned from NSE");
      }
    } catch {
      // Fallback to simulated/mock data
      rawIndices = generateMockIndices();
      dataSourceStatus = "simulated";
    }

    // 4. Fetch historical NAVs and compute technicals
    const fundTechnicalsMap = new Map<number, FundTechnicals>();

    await Promise.allSettled(
      activeFunds.map(async (fund) => {
        try {
          if (fund.amfiCode && fund.amfiCode.length > 0) {
            const history = await fetchHistoricalNav(fund.amfiCode);
            if (history.length > 10) {
              const tech = computeTechnicals(history);
              fundTechnicalsMap.set(fund.id, tech);
              return;
            }
          }
          // Fallback to mock
          fundTechnicalsMap.set(fund.id, generateMockTechnicals(fund.id));
        } catch {
          fundTechnicalsMap.set(fund.id, generateMockTechnicals(fund.id));
        }
      })
    );

    // 5. Score all funds
    const fundInputs = activeFunds.map((f) => ({
      id: f.id,
      name: f.name,
      proxyIndex: f.proxyIndex,
      category: f.category,
      technicals: fundTechnicalsMap.get(f.id) ?? generateMockTechnicals(f.id),
    }));

    const scoredFunds = scoreFunds(fundInputs, rawIndices, weights);

    // Sort by finalScore
    const sortedFunds = [...scoredFunds].sort(
      (a, b) => b.finalScore - a.finalScore
    );
    const topFunds = sortedFunds.filter((f) => !f.isAvoid).slice(0, 5);
    const avoidFunds = sortedFunds.filter((f) => f.isAvoid);

    // 6. Compute market regime
    const regime = computeMarketRegime(rawIndices);

    // 7. Build response payload
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

    // 8. Cache to DB
    try {
      const existing = await db.select().from(dashboardCache).limit(1);
      if (existing.length > 0) {
        await db
          .update(dashboardCache)
          .set({ payload, updatedAt: now })
          .where(eq(dashboardCache.id, existing[0].id));
      } else {
        await db.insert(dashboardCache).values({ payload, updatedAt: now });
      }
    } catch {
      // Cache failure is non-fatal
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("Dashboard refresh error:", error);

    // Try to return cached data
    try {
      const cached = await db.select().from(dashboardCache).limit(1);
      if (cached.length > 0) {
        return NextResponse.json({
          success: false,
          fromCache: true,
          error: "Live data fetch failed. Showing last cached snapshot.",
          data: cached[0].payload,
        });
      }
    } catch {
      // DB also failed
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
