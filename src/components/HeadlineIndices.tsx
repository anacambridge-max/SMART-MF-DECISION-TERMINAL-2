"use client";

import type { IndexData } from "@/types/dashboard";

type Props = {
  indices: IndexData[];
};

const HEADLINE_INDICES = [
  "NIFTY 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250",
  "NIFTY BANK",
];

function formatNumber(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function HeadlineIndices({ indices }: Props) {
  const indexMap = new Map(indices.map((i) => [i.name.toUpperCase(), i]));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {HEADLINE_INDICES.map((name) => {
        const idx = indexMap.get(name.toUpperCase());
        const pChange = idx?.pChange ?? 0;
        const isPos = pChange >= 0;
        const colorClass = isPos ? "text-emerald-400" : "text-red-400";
        const bgClass = isPos
          ? "bg-emerald-950/60 border-emerald-800"
          : "bg-red-950/60 border-red-800";

        return (
          <div
            key={name}
            className={`rounded-xl border ${bgClass} p-4`}
          >
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">{name}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatNumber(idx?.last ?? 0)}
            </p>
            <p className={`text-sm font-semibold mt-0.5 ${colorClass}`}>
              {isPos ? "+" : ""}{pChange.toFixed(2)}%{" "}
              <span className="text-xs opacity-70">
                {isPos ? "▲" : "▼"}{" "}
                {idx ? Math.abs(idx.last - idx.previousClose).toFixed(2) : "—"}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
