"use client";

import type { FundScore } from "@/types/dashboard";

type Props = {
  topFunds: FundScore[];
  sipAmount: number;
};

export function TacticalAllocation({ topFunds, sipAmount }: Props) {
  if (!sipAmount || sipAmount <= 0 || topFunds.length === 0) return null;

  const totalScore = topFunds.reduce((sum, f) => sum + f.finalScore, 0);

  const allocations = topFunds.map((f) => ({
    fund: f,
    pct: totalScore > 0 ? (f.finalScore / totalScore) * 100 : 100 / topFunds.length,
    amount: totalScore > 0 ? (f.finalScore / totalScore) * sipAmount : sipAmount / topFunds.length,
  }));

  return (
    <div className="bg-slate-900 border border-blue-700 rounded-xl p-4">
      <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
        💰 Suggested Tactical Allocation
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        Based on Final Score weighting across Top 5 funds. Total amount: ₹{sipAmount.toLocaleString("en-IN")}
      </p>
      <div className="space-y-2">
        {allocations.map((a) => (
          <div key={a.fund.fundId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-300 truncate">{a.fund.fundName}</span>
                <span className="text-blue-400 font-bold shrink-0 ml-2">
                  ₹{Math.round(a.amount).toLocaleString("en-IN")} ({a.pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${a.pct}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-amber-400 mt-3">
        ⚠ This is a probability-based allocation suggestion, not investment advice. Please consult a qualified financial advisor.
      </p>
    </div>
  );
}
