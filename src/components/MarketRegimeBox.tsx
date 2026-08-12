"use client";

import type { MarketRegime } from "@/types/dashboard";

type Props = {
  regime: MarketRegime;
};

export function MarketRegimeBox({ regime }: Props) {
  const isRiskOn = regime.label === "RISK ON";
  const isRiskOff = regime.label === "RISK OFF";

  const bgClass = isRiskOn
    ? "bg-emerald-950/80 border-emerald-500"
    : isRiskOff
    ? "bg-red-950/80 border-red-500"
    : "bg-amber-950/80 border-amber-500";

  const badgeBg = isRiskOn
    ? "bg-emerald-500 text-black"
    : isRiskOff
    ? "bg-red-500 text-white"
    : "bg-amber-400 text-black";

  const emoji = isRiskOn ? "🟢" : isRiskOff ? "🔴" : "🟡";

  return (
    <div className={`rounded-xl border-2 ${bgClass} p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3`}>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl">{emoji}</span>
        <div>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeBg}`}>
            MARKET REGIME
          </span>
          <div className="mt-1">
            <span className={`text-xl font-black tracking-wide ${isRiskOn ? "text-emerald-300" : isRiskOff ? "text-red-300" : "text-amber-300"}`}>
              {regime.label}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 border-l border-white/10 pl-4">
        <p className="text-sm text-slate-300">{regime.strategyNote}</p>
        <p className="text-xs text-slate-400 mt-1">
          Market breadth: <span className={`font-bold ${regime.breadthPercent > 60 ? "text-emerald-400" : regime.breadthPercent < 40 ? "text-red-400" : "text-amber-400"}`}>
            {regime.breadthPercent}% indices positive today
          </span>
        </p>
      </div>
    </div>
  );
}
