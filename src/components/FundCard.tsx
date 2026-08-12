"use client";

import type { FundScore } from "@/types/dashboard";

type Props = {
  fund: FundScore;
  rank?: number;
};

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${color}`}>{value}/100</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.includes("emerald") ? "bg-emerald-400" : color.includes("amber") ? "bg-amber-400" : "bg-blue-400"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function FundCard({ fund, rank }: Props) {
  const actionColors: Record<string, string> = {
    "BUY ON DIP": "bg-emerald-500 text-black",
    "SIP": "bg-blue-500 text-white",
    "WAIT": "bg-amber-500 text-black",
    "AVOID": "bg-red-600 text-white",
  };

  const trendIcon =
    fund.trendStatus === "uptrend"
      ? "↗ Uptrend"
      : fund.trendStatus === "downtrend"
      ? "↘ Downtrend"
      : "→ Sideways";

  const trendColor =
    fund.trendStatus === "uptrend"
      ? "text-emerald-400"
      : fund.trendStatus === "downtrend"
      ? "text-red-400"
      : "text-amber-400";

  const indexMoveColor =
    (fund.indexMove ?? 0) < 0 ? "text-red-400" : "text-emerald-400";

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {rank !== undefined && (
            <span className="text-2xl font-black text-slate-600 shrink-0 w-6">
              {rank}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {fund.fundName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{fund.category}</p>
          </div>
        </div>
        <span
          className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${actionColors[fund.actionLabel] ?? "bg-slate-600 text-white"}`}
        >
          {fund.actionLabel}
        </span>
      </div>

      {/* Scores */}
      <div className="space-y-1.5 mb-3">
        <ScoreBar
          label="Strategic Score"
          value={fund.strategicScore}
          color={fund.strategicScore > 65 ? "text-emerald-400" : fund.strategicScore > 40 ? "text-amber-400" : "text-red-400"}
        />
        <ScoreBar
          label="NAV Opportunity Score"
          value={fund.opportunityScore}
          color={fund.opportunityScore > 65 ? "text-emerald-400" : fund.opportunityScore > 40 ? "text-amber-400" : "text-red-400"}
        />
        <div className="flex justify-between items-center pt-1 border-t border-slate-700">
          <span className="text-xs text-slate-400">Final Score</span>
          <span className="text-lg font-black text-white">{fund.finalScore}<span className="text-xs text-slate-400">/100</span></span>
        </div>
      </div>

      {/* Proxy + move */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-400">
          📌 {fund.proxyIndex}
        </span>
        {fund.indexMove !== null && (
          <span className={`font-bold ${indexMoveColor}`}>
            {fund.indexMove >= 0 ? "+" : ""}{fund.indexMove.toFixed(2)}% today
          </span>
        )}
      </div>

      {/* Trend */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className={`font-medium ${trendColor}`}>{trendIcon}</span>
        {fund.technicals.drawdown52W !== null && (
          <span className="text-slate-400">
            52W DD:{" "}
            <span className={fund.technicals.drawdown52W < -10 ? "text-amber-400" : "text-slate-300"}>
              {fund.technicals.drawdown52W.toFixed(1)}%
            </span>
          </span>
        )}
      </div>

      {/* Classification */}
      <div className={`text-xs px-2 py-1 rounded-lg border ${
        fund.classification === "Healthy Correction"
          ? "border-emerald-700 bg-emerald-950/50 text-emerald-300"
          : fund.classification === "Structural Breakdown"
          ? "border-red-700 bg-red-950/50 text-red-300"
          : "border-slate-700 bg-slate-800/50 text-slate-300"
      }`}>
        {fund.classification === "Healthy Correction" && "🟢 "}
        {fund.classification === "Structural Breakdown" && "🔴 "}
        {fund.classification === "Neutral" && "⚪ "}
        {fund.classification}
      </div>

      {/* Reason */}
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{fund.reason}</p>

      {/* NAV info */}
      {fund.technicals.latestNav !== null && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-500">
          <span>NAV: ₹{fund.technicals.latestNav.toFixed(2)}</span>
          <span>{fund.technicals.navDate}</span>
        </div>
      )}
    </div>
  );
}
