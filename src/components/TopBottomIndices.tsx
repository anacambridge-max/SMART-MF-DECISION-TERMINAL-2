"use client";

import type { IndexData } from "@/types/dashboard";

type Props = {
  indices: IndexData[];
};

export function TopBottomIndices({ indices }: Props) {
  const sorted = [...indices].sort((a, b) => a.pChange - b.pChange);
  const falling = sorted.slice(0, 5);
  const rising = sorted.slice(-3).reverse();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Biggest Fallers */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📉</span> Biggest Falling Indices
        </h3>
        <div className="space-y-2">
          {falling.map((idx, i) => (
            <div key={idx.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="text-sm text-slate-200 truncate max-w-[160px]">{idx.name}</span>
              </div>
              <span className="text-sm font-bold text-red-400 tabular-nums">
                {idx.pChange >= 0 ? "+" : ""}{idx.pChange.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Gainers */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📈</span> Strongest Indices Today
        </h3>
        <div className="space-y-2">
          {rising.map((idx, i) => (
            <div key={idx.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="text-sm text-slate-200 truncate max-w-[160px]">{idx.name}</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {idx.pChange >= 0 ? "+" : ""}{idx.pChange.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
