"use client";

import type { FundScore } from "@/types/dashboard";

type Props = {
  funds: FundScore[];
};

export function FundVsMarketMap({ funds }: Props) {
  // Explicitly separate the five highest-scoring investable candidates from the full map.
  const top5ToInvest = [...funds]
    .filter((fund) => !fund.isAvoid && (fund.actionLabel === "BUY ON DIP" || fund.actionLabel === "SIP"))
    .sort((a, b) => b.finalScore - a.finalScore || a.fundId - b.fundId)
    .slice(0, 5);

  const actionColors: Record<string, string> = {
    "BUY ON DIP": "bg-emerald-500 text-black",
    "SIP": "bg-blue-500 text-white",
    "WAIT": "bg-amber-500 text-black",
    "AVOID": "bg-red-600 text-white",
  };

  return (
    <div className="space-y-4">
      {/* SEPARATE TOP 5 INVESTMENT PANEL */}
      <div className="bg-[#071b16] border border-emerald-900/70 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-emerald-900/60 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-emerald-300 uppercase tracking-wider">
              💰 TOP 5 TO INVEST TODAY
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Separate shortlist — highest-scoring investable funds from the 19-fund universe.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 border border-emerald-800 rounded-md px-2 py-1">
            RESEARCH SIGNAL
          </span>
        </div>

        {top5ToInvest.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No fund currently meets the investable signal criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 p-3">
            {top5ToInvest.map((fund, i) => (
              <div key={fund.fundId} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-emerald-400">#{i + 1}</span>
                  <span className="text-lg font-black text-sky-300">{Math.round(fund.finalScore)}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-100 leading-4 min-h-[48px]">
                  {fund.fundName}
                </div>
                <div className="mt-2 text-[9px] text-slate-500 truncate">{fund.proxyIndex}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[9px] font-black px-2 py-1 rounded ${actionColors[fund.actionLabel]}`}>
                    {fund.actionLabel}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {fund.indexMove == null ? "—" : `${fund.indexMove >= 0 ? "+" : ""}${fund.indexMove.toFixed(2)}%`}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-500 line-clamp-2">{fund.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULL FUND VS MARKET MAP */}
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
                let navImpactNote = "Minimal expected NAV movement";
                if (move < -2) navImpactNote = "Likely significant NAV pressure today — potential opportunity";
                else if (move < -1) navImpactNote = "Moderate NAV pressure likely in closing NAV";
                else if (move < -0.5) navImpactNote = "Mild downward pressure may reflect in NAV";
                else if (move > 2) navImpactNote = "Likely strong NAV appreciation today";
                else if (move > 1) navImpactNote = "Moderate NAV appreciation likely";

                return (
                  <tr key={fund.fundId} className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}>
                    <td className="py-2 px-3 font-medium text-slate-200 max-w-[180px]">
                      <div className="truncate">{fund.fundName}</div>
                      <div className="text-xs text-slate-500">{fund.category}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{fund.proxyIndex}</td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap ${isNeg ? "text-red-400" : "text-emerald-400"}`}>
                      {move >= 0 ? "+" : ""}{move.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-[200px]">
                      <span className={isNeg && move < -0.5 ? "text-amber-300" : "text-slate-300"}>{navImpactNote}</span>
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
    </div>
  );
}
