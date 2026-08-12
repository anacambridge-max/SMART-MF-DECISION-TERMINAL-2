import type { FundTechnicals } from "./amfiClient";
import type { IndexQuote } from "./nseClient";

export type ScoringWeights = {
  strategicWeight: number; // 0–1, default 0.6
  opportunityWeight: number; // 0–1, default 0.4
};

export type FundScore = {
  fundId: number;
  fundName: string;
  proxyIndex: string;
  category: string;
  strategicScore: number;
  opportunityScore: number;
  finalScore: number;
  indexMove: number | null; // today's % change for mapped index
  trendStatus: "uptrend" | "downtrend" | "sideways";
  actionLabel: "BUY ON DIP" | "SIP" | "WAIT" | "AVOID";
  classification: "Healthy Correction" | "Structural Breakdown" | "Neutral";
  reason: string;
  technicals: FundTechnicals;
  isAvoid: boolean;
};

// Clamp value between 0–100
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// Compute Strategic Score (0–100)
// Weights: trend (30), return consistency (25), drawdown position (25), relative strength (20)
export function computeStrategicScore(tech: FundTechnicals, relativeStrengthVsNifty: number | null): number {
  let score = 50; // neutral base

  // 1. Trend quality (30 pts max)
  if (tech.trendStatus === "uptrend") score += 30;
  else if (tech.trendStatus === "sideways") score += 10;
  else score -= 20; // downtrend penalised

  // 2. Return consistency (25 pts max)
  // Positive across multiple horizons = quality
  let returnBonus = 0;
  if (tech.return1M !== null && tech.return1M > 0) returnBonus += 5;
  if (tech.return1M !== null && tech.return1M < -10) returnBonus -= 5;
  if (tech.return3M !== null && tech.return3M > 0) returnBonus += 7;
  if (tech.return3M !== null && tech.return3M < -15) returnBonus -= 7;
  if (tech.return6M !== null && tech.return6M > 0) returnBonus += 8;
  if (tech.return1Y !== null && tech.return1Y > 0) returnBonus += 5;
  if (tech.return1Y !== null && tech.return1Y < -20) returnBonus -= 5;
  score += clamp(returnBonus + 25) - 25; // normalize

  // 3. Drawdown position (25 pts max)
  // Deep drawdown from ATH with trend intact = cheap + quality
  if (tech.drawdown52W !== null) {
    if (tech.drawdown52W > -5) score += 5; // Near highs = good
    else if (tech.drawdown52W > -15) score += 15; // Moderate dip = very attractive
    else if (tech.drawdown52W > -25) score += 20; // Significant correction
    else if (tech.drawdown52W > -40) score += 10; // Deep drawdown, caution
    else score -= 5; // Extreme drawdown = danger
  }

  // 4. Relative strength vs Nifty (20 pts max)
  if (relativeStrengthVsNifty !== null) {
    if (relativeStrengthVsNifty > 5) score += 20;
    else if (relativeStrengthVsNifty > 0) score += 12;
    else if (relativeStrengthVsNifty > -5) score += 5;
    else score -= 10;
  }

  return clamp(score);
}

// Compute Daily NAV Opportunity Score (0–100)
// Higher score = better opportunity to invest today
export function computeOpportunityScore(
  tech: FundTechnicals,
  indexMoveToday: number | null
): number {
  // Base: starts neutral
  let score = 50;

  // 1. Today's index/sector move (bigger fall = higher opportunity, if trend intact)
  if (indexMoveToday !== null) {
    if (indexMoveToday < -3) score += 35; // Major fall = big opportunity
    else if (indexMoveToday < -2) score += 25;
    else if (indexMoveToday < -1) score += 15;
    else if (indexMoveToday < -0.5) score += 8;
    else if (indexMoveToday > 2) score -= 15; // Strong rally = less opportunity
    else if (indexMoveToday > 1) score -= 8;
    else if (indexMoveToday > 0) score -= 3;
  }

  // 2. Drawdown position (deeper dip from 52W high = more room for recovery)
  if (tech.drawdown52W !== null) {
    if (tech.drawdown52W < -20) score += 20; // Deep correction
    else if (tech.drawdown52W < -10) score += 12;
    else if (tech.drawdown52W < -5) score += 5;
    else score -= 5; // Near highs — less opportunistic entry
  }

  // 3. SMA structure / trend confirmation
  if (tech.trendStatus === "uptrend") score += 10; // Trend intact = safe dip
  else if (tech.trendStatus === "downtrend") score -= 30; // Structural concern

  // 4. Short-term momentum (10D/20D)
  if (tech.momentum10D !== null) {
    if (tech.momentum10D < -5) score += 8; // Short-term oversold
    else if (tech.momentum10D < -2) score += 4;
    else if (tech.momentum10D > 5) score -= 5;
  }

  return clamp(score);
}

export type IndexData = {
  name: string;
  pChange: number;
  last: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
};

export type FundInput = {
  id: number;
  name: string;
  proxyIndex: string;
  category: string;
  technicals: FundTechnicals;
};

export function scoreFunds(
  funds: FundInput[],
  indices: IndexData[],
  weights: ScoringWeights
): FundScore[] {
  // Build index map
  const indexMap = new Map<string, IndexData>();
  for (const idx of indices) {
    indexMap.set(idx.name.toUpperCase(), idx);
  }

  // Get Nifty 50 for relative strength
  const nifty50 = indexMap.get("NIFTY 50");
  const nifty50Change = nifty50?.pChange ?? null;

  return funds.map((fund) => {
    const tech = fund.technicals;
    const proxyKey = fund.proxyIndex.toUpperCase();
    const proxyData = indexMap.get(proxyKey);
    const indexMove = proxyData?.pChange ?? nifty50Change;

    // Relative strength of fund vs Nifty (using 50D momentum)
    const relStrength =
      tech.momentum50D !== null && nifty50Change !== null
        ? tech.momentum50D - (nifty50Change * 10) // rough proxy for 50D nifty move
        : null;

    const strategicScore = computeStrategicScore(tech, relStrength);
    const opportunityScore = computeOpportunityScore(tech, indexMove);
    const finalScore =
      weights.strategicWeight * strategicScore +
      weights.opportunityWeight * opportunityScore;

    // Classification rules — explicit filter, not just blended score
    let isAvoid = false;
    let classification: FundScore["classification"] = "Neutral";
    let actionLabel: FundScore["actionLabel"] = "SIP";
    let reason = "";

    if (tech.trendStatus === "downtrend") {
      isAvoid = true;
      classification = "Structural Breakdown";
      actionLabel = "AVOID";
      reason = `Fund below 50D & 200D SMA — structural downtrend. ${
        tech.drawdown52W !== null
          ? `52W drawdown: ${tech.drawdown52W.toFixed(1)}%`
          : ""
      }`;
    } else if (indexMove !== null && indexMove < -1.5 && tech.trendStatus === "uptrend") {
      classification = "Healthy Correction";
      actionLabel = "BUY ON DIP";
      reason = `${fund.proxyIndex} down ${indexMove.toFixed(2)}% today — trend intact. Potential same-day NAV opportunity.`;
    } else if (indexMove !== null && indexMove < -0.5) {
      classification = "Healthy Correction";
      actionLabel = "SIP";
      reason = `Mild correction in ${fund.proxyIndex}. Good SIP entry point.`;
    } else {
      actionLabel = "SIP";
      reason = "Market stable. Suitable for regular SIP.";
    }

    // Force WAIT for sideways with negative momentum
    if (!isAvoid && tech.trendStatus === "sideways" && tech.momentum20D !== null && tech.momentum20D < -5) {
      actionLabel = "WAIT";
      reason = `Sideways trend with negative 20D momentum (${tech.momentum20D.toFixed(1)}%). Monitor before deploying.`;
    }

    return {
      fundId: fund.id,
      fundName: fund.name,
      proxyIndex: fund.proxyIndex,
      category: fund.category,
      strategicScore: Math.round(strategicScore),
      opportunityScore: Math.round(opportunityScore),
      finalScore: Math.round(finalScore),
      indexMove,
      trendStatus: tech.trendStatus,
      actionLabel,
      classification,
      reason,
      technicals: tech,
      isAvoid,
    };
  });
}

export type MarketRegime = {
  label: "RISK ON" | "RISK OFF" | "NEUTRAL";
  breadthPercent: number;
  strategyNote: string;
  color: "green" | "red" | "yellow";
};

export function computeMarketRegime(indices: IndexData[]): MarketRegime {
  if (indices.length === 0) {
    return {
      label: "NEUTRAL",
      breadthPercent: 50,
      strategyNote: "Market data unavailable. Maintain regular SIP.",
      color: "yellow",
    };
  }

  const greenCount = indices.filter((i) => i.pChange > 0).length;
  const breadthPercent = Math.round((greenCount / indices.length) * 100);

  // Nifty 50 & broad market check
  const nifty = indices.find((i) => i.name.toUpperCase() === "NIFTY 50");
  const midcap = indices.find((i) => i.name.toUpperCase().includes("MIDCAP 150"));
  const smallcap = indices.find((i) => i.name.toUpperCase().includes("SMALLCAP"));

  const broadMarketNegative =
    (nifty?.pChange ?? 0) < -1 &&
    (midcap?.pChange ?? 0) < -1 &&
    (smallcap?.pChange ?? 0) < -1;

  const broadMarketPositive =
    (nifty?.pChange ?? 0) > 0.5 &&
    breadthPercent > 60;

  if (broadMarketNegative || breadthPercent < 35) {
    return {
      label: "RISK OFF",
      breadthPercent,
      strategyNote:
        "Broad market weakness. Continue core SIP, reduce tactical allocation, avoid chasing sector funds.",
      color: "red",
    };
  } else if (broadMarketPositive || breadthPercent > 65) {
    return {
      label: "RISK ON",
      breadthPercent,
      strategyNote:
        "Markets trending up. Continue SIP + deploy corrections selectively.",
      color: "green",
    };
  } else {
    return {
      label: "NEUTRAL",
      breadthPercent,
      strategyNote:
        "Mixed market signals. Stick to SIP, await clearer direction before tactical deployment.",
      color: "yellow",
    };
  }
}

// Generate mock/simulated index data when NSE is unreachable
export function generateMockIndices(): IndexData[] {
  const INDICES = [
    { name: "NIFTY 50", base: 24000 },
    { name: "NIFTY NEXT 50", base: 67000 },
    { name: "NIFTY MIDCAP 150", base: 20000 },
    { name: "NIFTY SMALLCAP 250", base: 16000 },
    { name: "NIFTY BANK", base: 52000 },
    { name: "NIFTY IT", base: 38000 },
    { name: "NIFTY AUTO", base: 22000 },
    { name: "NIFTY PHARMA", base: 21000 },
    { name: "NIFTY FMCG", base: 57000 },
    { name: "NIFTY METAL", base: 8500 },
    { name: "NIFTY REALTY", base: 950 },
    { name: "NIFTY FINANCIAL SERVICES", base: 24000 },
    { name: "NIFTY ENERGY", base: 38000 },
    { name: "NIFTY PSU BANK", base: 6500 },
    { name: "NIFTY INFRA", base: 550 },
    { name: "NIFTY LARGEMIDCAP 250", base: 16000 },
    { name: "NIFTY 500", base: 22000 },
    { name: "NIFTY MEDIA", base: 1800 },
  ];

  return INDICES.map((idx) => {
    const pChange = (Math.random() - 0.5) * 4; // -2% to +2%
    const prevClose = idx.base;
    const last = prevClose * (1 + pChange / 100);
    return {
      name: idx.name,
      pChange: parseFloat(pChange.toFixed(2)),
      last: parseFloat(last.toFixed(2)),
      previousClose: prevClose,
      yearHigh: prevClose * 1.25,
      yearLow: prevClose * 0.75,
    };
  });
}

export function generateMockTechnicals(fundId: number): FundTechnicals {
  const base = 100 + fundId * 50 + Math.random() * 200;
  const trend = Math.random() > 0.3 ? "uptrend" : Math.random() > 0.5 ? "sideways" : "downtrend";
  const drawdown52W = trend === "downtrend" ? -(15 + Math.random() * 25) : -(5 + Math.random() * 15);

  return {
    sma20: base * 0.98,
    sma50: base * 0.95,
    sma100: base * 0.92,
    sma200: base * 0.88,
    return1M: (Math.random() - 0.3) * 10,
    return3M: (Math.random() - 0.2) * 20,
    return6M: (Math.random() - 0.1) * 30,
    return1Y: (Math.random() + 0.1) * 25,
    drawdown52W,
    allTimeDrawdown: drawdown52W * 1.5,
    momentum10D: (Math.random() - 0.4) * 8,
    momentum20D: (Math.random() - 0.35) * 12,
    momentum50D: (Math.random() - 0.25) * 20,
    latestNav: base,
    navDate: new Date().toLocaleDateString("en-IN"),
    trendStatus: trend as "uptrend" | "downtrend" | "sideways",
  };
}
