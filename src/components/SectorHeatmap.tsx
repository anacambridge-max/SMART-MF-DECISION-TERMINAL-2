"use client";

import type { IndexData } from "@/types/dashboard";

type Props = {
  indices: IndexData[];
};

function getColor(pChange: number): string {
  if (pChange <= -3) return "bg-red-900 border-red-700 text-red-200";
  if (pChange <= -2) return "bg-red-800 border-red-600 text-red-100";
  if (pChange <= -1) return "bg-red-700 border-red-500 text-white";
  if (pChange < 0) return "bg-red-900/60 border-red-800 text-red-200";
  if (pChange === 0) return "bg-slate-700 border-slate-600 text-slate-300";
  if (pChange < 1) return "bg-emerald-900/60 border-emerald-800 text-emerald-200";
  if (pChange < 2) return "bg-emerald-700 border-emerald-500 text-white";
  if (pChange < 3) return "bg-emerald-600 border-emerald-400 text-white";
  return "bg-emerald-500 border-emerald-300 text-black";
}

function shortName(name: string): string {
  return name
    .replace("NIFTY ", "")
    .replace(" INDEX", "")
    .replace("FINANCIAL SERVICES", "FIN SVC")
    .replace("LARGEMIDCAP 250", "LG+MID")
    .replace("SMALLCAP 250", "SC 250")
    .replace("MIDCAP 150", "MC 150")
    .replace("NEXT 50", "NEXT50")
    .replace("PSU BANK", "PSU BNK");
}

export function SectorHeatmap({ indices }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        🔥 Sector Heatmap
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {indices.map((idx) => (
          <div
            key={idx.name}
            className={`rounded-lg border p-2 text-center ${getColor(idx.pChange)}`}
          >
            <div className="text-xs font-bold truncate">{shortName(idx.name)}</div>
            <div className="text-sm font-black mt-0.5">
              {idx.pChange >= 0 ? "+" : ""}{idx.pChange.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <span>Legend:</span>
        {[
          { label: "≤-3%", cls: "bg-red-900 border-red-700" },
          { label: "-2%", cls: "bg-red-800 border-red-600" },
          { label: "-1%", cls: "bg-red-700 border-red-500" },
          { label: "Flat", cls: "bg-slate-700 border-slate-600" },
          { label: "+1%", cls: "bg-emerald-700 border-emerald-500" },
          { label: "+2%", cls: "bg-emerald-600 border-emerald-400" },
          { label: "≥+3%", cls: "bg-emerald-500 border-emerald-300" },
        ].map((l) => (
          <span key={l.label} className={`inline-block px-1.5 py-0.5 rounded border text-white ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
