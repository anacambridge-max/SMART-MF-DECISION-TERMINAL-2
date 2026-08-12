"use client";

import type { FundScore } from "@/types/dashboard";

type Props = {
  funds: FundScore[];
};

export function FundVsMarketMap({ funds }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          🗺 Fund vs Market Map — NAV Impact Signals
        </h2>
        <p className="text-xs text-amber-400 mt-1">
          ⚠ "Potential same-day NAV opportunity" only — intraday fund NAV does not exist. Today&apos;s market movement is likely to be reflected in the closing NAV.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="text-left py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Fund</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Proxy Index</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Today&apos;s Move</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Expected NAV Impact</th>
              <th className="text-left py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Action Signal</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((fund, i) => {
              const move = fund.indexMove ?? 0;
              const isNeg = move < 0;

              let navImpactNote = "";
              if (move < -2) navImpactNote = "Likely significant NAV pressure today — potential opportunity";
              else if (move < -1) navImpactNote = "Moderate NAV pressure likely in closing NAV";
              else if (move < -0.5) navImpactNote = "Mild downward pressure may reflect in NAV";
              else if (move > 2) navImpactNote = "Likely strong NAV appreciation today";
              else if (move > 1) navImpactNote = "Moderate NAV appreciation likely";
              else navImpactNote = "Minimal expected NAV movement";

              const actionColors: Record<string, string> = {
                "BUY ON DIP": "bg-emerald-500 text-black",
                "SIP": "bg-blue-500 text-white",
                "WAIT": "bg-amber-500 text-black",
                "AVOID": "bg-red-600 text-white",
              };

              return (
                <tr
                  key={fund.fundId}
                  className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                >
                  <td className="py-2 px-3 font-medium text-slate-200 max-w-[180px]">
                    <div className="truncate">{fund.fundName}</div>
                    <div className="text-xs text-slate-500">{fund.category}</div>
                  </td>
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{fund.proxyIndex}</td>
                  <td className={`py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap ${isNeg ? "text-red-400" : "text-emerald-400"}`}>
                    {move >= 0 ? "+" : ""}{move.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 text-slate-300 max-w-[200px]">
                    <span className={isNeg && move < -0.5 ? "text-amber-300" : "text-slate-300"}>
                      {navImpactNote}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${actionColors[fund.actionLabel] ?? "bg-slate-600 text-white"}`}>
                      {fund.actionLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
