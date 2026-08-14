import type { FundTechnicals } from "./amfiClient";

export type ScoringWeights = {
  strategicWeight: number;
  opportunityWeight: number;
};

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

export type FundScore = {
  fundId: number;
  fundName: string;
  proxyIndex: string;
  category: string;
  strategicScore: number;
  opportunityScore: number;
  finalScore: number;
  indexMove: number | null;
  trendStatus: "uptrend" | "downtrend" | "sideways";
  actionLabel: "BUY ON DIP" | "SIP" | "WAIT" | "AVOID";
  classification: "Healthy Correction" | "Structural Breakdown" | "Neutral";
  reason: string;
  technicals: FundTechnicals;
  isAvoid: boolean;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function trendComponent(trend: FundTechnicals["trendStatus"]): number {
  if (trend === "uptrend") return 72;
  if (trend === "sideways") return 50;
  return 28;
}

function returnsComponent(tech: FundTechnicals): number {
  const values = [
    [tech.return1M, 0.20],
    [tech.return3M, 0.30],
    [tech.return6M, 0.25],
    [tech.return1Y, 0.25],
  ] as const;
  let weighted = 0;
  let weight = 0;
  for (const [value, w] of values) {
    if (value !== null && Number.isFinite(value)) {
      weighted += value * w;
      weight += w;
    }
  }
  if (!weight) return 50;
  return clamp(50 + (weighted / weight) * 1.8);
}

function drawdownQualityComponent(drawdown: number | null): number {
  if (drawdown === null || !Number.isFinite(drawdown)) return 50;
  if (drawdown >= -5) return 66;
  if (drawdown >= -10) return 62;
  if (drawdown >= -20) return 55;
  if (drawdown >= -30) return 46;
  if (drawdown >= -40) return 38;
  return 30;
}

function relativeStrengthComponent(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 50;
  if (value > 5) return 72;
  if (value > 2) return 65;
  if (value > 0) return 59;
  if (value > -5) return 48;
  return 36;
}

export function computeStrategicScore(tech: FundTechnicals, relativeStrengthVsNifty: number | null): number {
  // Strategic score measures underlying quality/trend, not whether today's NAV is cheap.
  // This deliberately avoids stacking many additive bonuses that previously pushed most funds to 80-100.
  const score =
    trendComponent(tech.trendStatus) * 0.40 +
    returnsComponent(tech) * 0.30 +
    drawdownQualityComponent(tech.drawdown52W) * 0.15 +
    relativeStrengthComponent(relativeStrengthVsNifty) * 0.15;
  return clamp(score);
}

function dipComponent(indexMoveToday: number | null): number {
  if (indexMoveToday === null || !Number.isFinite(indexMoveToday)) return 50;
  if (indexMoveToday <= -3) return 90;
  if (indexMoveToday <= -2) return 80;
  if (indexMoveToday <= -1) return 70;
  if (indexMoveToday <= -0.5) return 60;
  if (indexMoveToday <= 0) return 52;
  if (indexMoveToday <= 1) return 44;
  if (indexMoveToday <= 2) return 35;
  return 25;
}

function drawdownOpportunityComponent(drawdown: number | null): number {
  if (drawdown === null || !Number.isFinite(drawdown)) return 50;
  if (drawdown <= -30) return 88;
  if (drawdown <= -20) return 80;
  if (drawdown <= -10) return 68;
  if (drawdown <= -5) return 58;
  return 45;
}

function momentumComponent(momentum10D: number | null): number {
  if (momentum10D === null || !Number.isFinite(momentum10D)) return 50;
  if (momentum10D <= -5) return 76;
  if (momentum10D <= -2) return 66;
  if (momentum10D <= 2) return 55;
  if (momentum10D <= 5) return 45;
  return 35;
}

function trendConfirmationComponent(trend: FundTechnicals["trendStatus"]): number {
  if (trend === "uptrend") return 68;
  if (trend === "sideways") return 50;
  return 25;
}

export function computeOpportunityScore(tech: FundTechnicals, indexMoveToday: number | null): number {
  // Opportunity is a separate tactical score: correction + drawdown + momentum + trend confirmation.
  const score =
    dipComponent(indexMoveToday) * 0.40 +
    drawdownOpportunityComponent(tech.drawdown52W) * 0.25 +
    momentumComponent(tech.momentum10D) * 0.20 +
    trendConfirmationComponent(tech.trendStatus) * 0.15;
  return clamp(score);
}

export function scoreBand(score: number): "Strong" | "Good" | "Watch" | "Weak" {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Watch";
  return "Weak";
}

export function scoreFunds(funds: FundInput[], indices: IndexData[], weights: ScoringWeights): FundScore[] {
  const indexMap = new Map<string, IndexData>();
  for (const idx of indices) indexMap.set(idx.name.toUpperCase(), idx);

  const nifty50 = indexMap.get("NIFTY 50");
  const nifty50Change = nifty50?.pChange ?? null;

  return funds.map((fund) => {
    const tech = fund.technicals;
    const proxyData = indexMap.get(fund.proxyIndex.toUpperCase());
    const indexMove = proxyData?.pChange ?? nifty50Change;
    const relativeStrength =
      tech.momentum50D !== null && nifty50Change !== null
        ? tech.momentum50D - nifty50Change * 10
        : null;

    const strategicScore = computeStrategicScore(tech, relativeStrength);
    const opportunityScore = computeOpportunityScore(tech, indexMove);
    const finalScore = clamp(
      strategicScore * weights.strategicWeight + opportunityScore * weights.opportunityWeight,
    );

    let isAvoid = false;
    let classification: FundScore["classification"] = "Neutral";
    let actionLabel: FundScore["actionLabel"] = "SIP";
    let reason = "";

    if (tech.trendStatus === "downtrend") {
      isAvoid = true;
      classification = "Structural Breakdown";
      actionLabel = "AVOID";
      reason = `Fund below 50D & 200D SMA — structural downtrend.${tech.drawdown52W !== null ? ` 52W drawdown: ${tech.drawdown52W.toFixed(1)}%` : ""}`;
    } else if (indexMove !== null && indexMove < -1.5 && tech.trendStatus === "uptrend") {
      classification = "Healthy Correction";
      actionLabel = "BUY ON DIP";
      reason = `${fund.proxyIndex} down ${indexMove.toFixed(2)}% today while trend remains intact. Potential accumulation window.`;
    } else if (indexMove !== null && indexMove < -0.5) {
      classification = "Healthy Correction";
      actionLabel = "SIP";
      reason = `Mild correction in ${fund.proxyIndex}. Suitable for staggered SIP deployment.`;
    } else {
      actionLabel = "SIP";
      reason = "Market stable. Prefer regular SIP over chasing the move.";
    }

    if (!isAvoid && tech.trendStatus === "sideways" && tech.momentum20D !== null && tech.momentum20D < -5) {
      actionLabel = "WAIT";
      reason = `Sideways trend with negative 20D momentum (${tech.momentum20D.toFixed(1)}%). Wait for confirmation.`;
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
    return { label: "NEUTRAL", breadthPercent: 50, strategyNote: "Market data unavailable. Maintain regular SIP.", color: "yellow" };
  }

  const greenCount = indices.filter((i) => i.pChange > 0).length;
  const breadthPercent = Math.round((greenCount / indices.length) * 100);
  const nifty = indices.find((i) => i.name.toUpperCase() === "NIFTY 50");
  const midcap = indices.find((i) => i.name.toUpperCase().includes("MIDCAP 150"));
  const smallcap = indices.find((i) => i.name.toUpperCase().includes("SMALLCAP"));

  const broadMarketNegative = (nifty?.pChange ?? 0) < -1 && (midcap?.pChange ?? 0) < -1 && (smallcap?.pChange ?? 0) < -1;
  const broadMarketPositive = (nifty?.pChange ?? 0) > 0.5 && breadthPercent > 60;

  if (broadMarketNegative || breadthPercent < 35) {
    return { label: "RISK OFF", breadthPercent, strategyNote: "Broad market weakness. Continue core SIP, reduce tactical allocation, avoid chasing sector funds.", color: "red" };
  }
  if (broadMarketPositive || breadthPercent > 65) {
    return { label: "RISK ON", breadthPercent, strategyNote: "Markets trending up. Continue SIP + deploy corrections selectively.", color: "green" };
  }
  return { label: "NEUTRAL", breadthPercent, strategyNote: "Mixed market signals. Stick to SIP, await clearer direction before tactical deployment.", color: "yellow" };
}
