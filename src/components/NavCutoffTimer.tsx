"use client";

import { useEffect, useState } from "react";

export function NavCutoffTimer() {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isPast, setIsPast] = useState<boolean>(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(now.getTime() + istOffset);

      const cutoff = new Date(ist);
      cutoff.setHours(15, 0, 0, 0); // 3:00 PM IST

      const marketOpen = new Date(ist);
      marketOpen.setHours(9, 15, 0, 0); // 9:15 AM IST

      const totalMs = cutoff.getTime() - marketOpen.getTime();
      const elapsedMs = ist.getTime() - marketOpen.getTime();
      const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
      setProgress(pct);

      const diff = cutoff.getTime() - ist.getTime();

      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft("Cutoff passed");
        return;
      }

      setIsPast(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-amber-700 rounded-xl p-4">
      <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        ⏰ Same-Day NAV Cut-off Window
      </h2>

      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs text-slate-400">Cut-off time: </span>
          <span className="text-sm font-bold text-white">3:00 PM IST</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Time remaining: </span>
          <span className={`text-lg font-black ${isPast ? "text-red-400" : progress > 80 ? "text-amber-400" : "text-emerald-400"}`}>
            {timeLeft || "Calculating..."}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${progress > 90 ? "bg-red-500" : progress > 70 ? "bg-amber-400" : "bg-emerald-400"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>
          🏦 <span className="text-amber-300 font-semibold">AMFI/SEBI Disclaimer:</span>{" "}
          Applicable NAV depends on the applicable cut-off time and funds-realisation conditions per AMFI/SEBI rules.
        </p>
        <p>
          📋 For same-day NAV, transaction must be submitted and funds must be realised by <strong className="text-white">3:00 PM IST</strong> on a business day.
          For liquid/overnight funds, the cut-off is <strong className="text-white">1:30 PM IST</strong>.
        </p>
        <p className="text-amber-400">
          ⚠ Today&apos;s market weakness is <em>likely</em> to be reflected in the fund&apos;s closing NAV. This is an estimate, not a guaranteed outcome.
        </p>
      </div>
    </div>
  );
}
