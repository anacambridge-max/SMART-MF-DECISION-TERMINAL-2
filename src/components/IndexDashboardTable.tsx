"use client";

import type { IndexData } from "@/types/dashboard";

type Props = {
  indices: IndexData[];
};

function pct(v: number): string {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function fmt(v: number): string {
  if (!v || v === 0) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function pctFromHigh(last: number, high: number): string {
  if (!high || high === 0) return "—";
  const pct = ((last - high) / high) * 100;
  return pct.toFixed(1) + "%";
}

export function IndexDashboardTable({ indices }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          📊 Index Dashboard
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="text-left py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Index</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Today</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Last</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Prev Close</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">52W High</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">52W Low</th>
              <th className="text-right py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">From High</th>
              <th className="text-center py-2 px-3 text-slate-400 font-semibold whitespace-nowrap">Trend</th>
            </tr>
          </thead>
          <tbody>
            {indices.map((idx, i) => {
              const isPos = idx.pChange >= 0;
              const fromHigh = idx.yearHigh > 0 ? ((idx.last - idx.yearHigh) / idx.yearHigh) * 100 : 0;

              return (
                <tr
                  key={idx.name}
                  className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}
                >
                  <td className="py-2 px-3 font-medium text-slate-200 whitespace-nowrap">{idx.name}</td>
                  <td className={`py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {pct(idx.pChange)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300 tabular-nums whitespace-nowrap">
                    {fmt(idx.last)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400 tabular-nums whitespace-nowrap">
                    {fmt(idx.previousClose)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400 tabular-nums whitespace-nowrap">
                    {fmt(idx.yearHigh)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400 tabular-nums whitespace-nowrap">
                    {fmt(idx.yearLow)}
                  </td>
                  <td className={`py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${fromHigh < -15 ? "text-amber-400" : fromHigh < -5 ? "text-yellow-400" : "text-slate-400"}`}>
                    {pctFromHigh(idx.last, idx.yearHigh)}
                  </td>
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${isPos ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                      {isPos ? "↗ UP" : "↘ DOWN"}
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
