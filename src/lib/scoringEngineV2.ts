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
  scoreBand: "Strong" | "Good" | "Watch" | "Weak";
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
  if (trend === "uptrend") return 76;
  if (trend === "sideways") return 54;
  return 24;
}

function returnsComponent(tech: FundTechnicals): number {
  const values = [
    [tech.return1M, 0.15],
    [tech.return3M, 0.25],
    [tech.return6M, 0.25],
    [tech.return1Y, 0.35],
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
  return clamp(50 + (weighted / weight) * 2.2);
}

function drawdownQualityComponent(drawdown: number | null): number {
  if (drawdown === null || !Number.isFinite(drawdown)) return 50;
  if (drawdown >= -5) return 68;
  if (drawdown >= -10) return 64;
  if (drawdown >= -20) return 58;
  if (drawdown >= -30) return 47;
  if (drawdown >= -40) return 37;
  return 28;
}

function relativeStrengthComponent(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 50;
  if (value > 8) return 82;
  if (value > 5) return 74;
  if (value > 2) return 67;
  if (value > 0) return 60;
  if (value > -3) return 50;
  if (value > -7) return 41;
  return 32;
}

export function computeStrategicScore(tech: FundTechnicals, relativeStrengthVsNifty: number | null): number {
  // Strategic score = longer-term fund quality/trend. It is intentionally independent of today's dip.
  const score =
    trendComponent(tech.trendStatus) * 0.30 +
    returnsComponent(tech) * 0.30 +
    drawdownQualityComponent(tech.drawdown52W) * 0.15 +
    relativeStrengthComponent(relativeStrengthVsNifty) * 0.25;
  return clamp(score);
}

function dipComponent(indexMoveToday: number | null): number {
  if (indexMoveToday === null || !Number.isFinite(indexMoveToday)) return 50;
  if (indexMoveToday <= -3) return 95;
  if (indexMoveToday <= -2) return 84;
  if (indexMoveToday <= -1) return 72;
  if (indexMoveToday <= -0.5) return 61;
  if (indexMoveToday <= 0) return 50;
  if (indexMoveToday <= 1) return 43;
  if (indexMoveToday <= 2) return 35;
  return 28;
}

function drawdownOpportunityComponent(drawdown: number | null): number {
  if (drawdown === null || !Number.isFinite(drawdown)) return 50;
  if (drawdown <= -30) return 94;
  if (drawdown <= -20) return 84;
  if (drawdown <= -15) return 76;
  if (drawdown <= -10) return 68;
  if (drawdown <= -5) return 57;
  return 45;
}

function momentumComponent(momentum10D: number | null): number {
  if (momentum10D === null || !Number.isFinite(momentum10D)) return 50;
  if (momentum10D <= -8) return 82;
  if (momentum10D <= -5) return 75;
  if (momentum10D <= -2) return 65;
  if (momentum10D <= 2) return 54;
  if (momentum10D <= 5) return 44;
  return 34;
}

function trendConfirmationComponent(trend: FundTechnicals["trendStatus"]): number {
  if (trend === "uptrend") return 72;
  if (trend === "sideways") return 50;
  return 22;
}

export function computeOpportunityScore(tech: FundTechnicals, indexMoveToday: number | null): number {
  const score =
    dipComponent(indexMoveToday) * 0.35 +
    drawdownOpportunityComponent(tech.drawdown52W) * 0.30 +
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

function calibrateOverallScore(raw: number, strategic: number, opportunity: number): number {
  // Expand the useful middle of the scale so a 19-fund universe does not collapse into 60-65.
  // The calibration is bounded and does not manufacture scores: stronger raw inputs receive more lift,
  // weak inputs receive less. Missing-data neutral scores therefore remain near the middle.
  const qualityTilt = (strategic - 50) * 0.12;
  const opportunityTilt = (opportunity - 50) * 0.08;
  const expanded = 50 + (raw - 50) * 1.22 + qualityTilt + opportunityTilt;
  return clamp(expanded);
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
    const weightedRaw = clamp(
      strategicScore * weights.strategicWeight + opportunityScore * weights.opportunityWeight,
    );
    const finalScore = Math.round(calibrateOverallScore(weightedRaw, strategicScore, opportunityScore));
    const band = scoreBand(finalScore);

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
    } else if (band === "Weak") {
      actionLabel = "WAIT";
      reason = "Overall score is weak. Wait for stronger trend or better correction confirmation.";
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
      finalScore,
      scoreBand: band,
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
