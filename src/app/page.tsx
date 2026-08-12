"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import { MarketRegimeBox } from "@/components/MarketRegimeBox";
import { HeadlineIndices } from "@/components/HeadlineIndices";
import { TopBottomIndices } from "@/components/TopBottomIndices";
import { FundCard } from "@/components/FundCard";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { IndexDashboardTable } from "@/components/IndexDashboardTable";
import { FundVsMarketMap } from "@/components/FundVsMarketMap";
import { NavCutoffTimer } from "@/components/NavCutoffTimer";
import { TacticalAllocation } from "@/components/TacticalAllocation";
import { SettingsPanel } from "@/components/SettingsPanel";

const REFRESH_TIMEOUT_MS = 30000;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tacticalAmount, setTacticalAmount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load cached data on mount
  useEffect(() => {
    async function loadCached() {
      try {
        const resp = await fetch("/api/dashboard/cached");
        const json = await resp.json() as { success: boolean; data: DashboardPayload | null; fromCache?: boolean };
        if (json.success && json.data) {
          setData(json.data as DashboardPayload);
          setFromCache(true);
        }
      } catch {
        // No cached data — that's OK
      } finally {
        setInitialLoad(false);
      }
    }
    loadCached();
  }, []);

  // Load tactical amount from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { settings?: Record<string, string> }) => {
        const amt = parseFloat(d.settings?.tactical_sip_amount ?? "0");
        if (!isNaN(amt)) setTacticalAmount(amt);
      })
      .catch(() => {});
  }, []);

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      setError("Request timed out. Showing last available data.");
      setLoading(false);
    }, REFRESH_TIMEOUT_MS);

    try {
      const resp = await fetch("/api/dashboard/refresh");
      clearTimeout(timeoutId);

      const json = await resp.json() as {
        success: boolean;
        data?: DashboardPayload;
        error?: string;
        fromCache?: boolean;
      };

      if (json.data) {
        setData(json.data as DashboardPayload);
        setFromCache(json.fromCache ?? false);
        if (!json.success && json.error) {
          setError(json.error);
        }
      } else {
        setError(json.error ?? "Failed to fetch data.");
      }
    } catch {
      clearTimeout(timeoutId);
      setError("Network error. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  function formatTimestamp(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentWeights={data?.weights ?? { strategicWeight: 0.6, opportunityWeight: 0.4 }}
        onSettingsSaved={() => {
          setSettingsOpen(false);
          handleRefresh();
        }}
      />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h1 className="text-base font-black text-white tracking-tight">
                Smart MF Daily Decision Terminal
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Timestamp */}
            {data && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">
                  Last updated:{" "}
                  <span className="text-slate-200 font-mono">
                    {formatTimestamp((data as DashboardPayload).timestamp)}
                  </span>{" "}
                  IST
                </p>
                {fromCache && (
                  <p className="text-xs text-amber-400">📦 From cache</p>
                )}
                {(data as DashboardPayload).dataSourceStatus === "simulated" && (
                  <p className="text-xs text-orange-400">⚠ Simulated data</p>
                )}
              </div>
            )}

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              ⚙️
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm px-4 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile timestamp */}
        {data && (
          <div className="sm:hidden px-4 pb-2 flex items-center gap-3 text-xs text-slate-400">
            <span>Updated: {formatTimestamp((data as DashboardPayload).timestamp)} IST</span>
            {fromCache && <span className="text-amber-400">📦 Cached</span>}
            {(data as DashboardPayload).dataSourceStatus === "simulated" && (
              <span className="text-orange-400">⚠ Simulated</span>
            )}
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="bg-red-950 border border-red-700 rounded-xl p-3 flex items-start gap-3">
            <span className="text-red-400 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm text-red-300 font-semibold">Data fetch issue</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Initial load spinner */}
      {initialLoad && !data && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-4xl animate-pulse">📊</div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      )}

      {/* Empty state — no cache + not loading */}
      {!initialLoad && !data && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <div className="text-5xl">📈</div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white mb-2">No Data Yet</h2>
            <p className="text-slate-400 text-sm mb-4">
              Click Refresh to load live NSE index data and compute fund scores.
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm"
            >
              🔄 Load Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-4xl animate-spin">⟳</div>
          <div className="text-center">
            <p className="text-slate-300 font-semibold">Fetching live data...</p>
            <p className="text-slate-500 text-xs mt-1">
              Connecting to NSE India & AMFI servers
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {data && (
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">

          {/* 1. Market Regime */}
          <MarketRegimeBox regime={data.regime} />

          {/* 2. Headline Indices */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              📌 Key Indices
            </h2>
            <HeadlineIndices indices={data.indices} />
          </div>

          {/* 3. Top / Bottom Indices */}
          <TopBottomIndices indices={data.indices} />

          {/* 4. Top 5 Funds Today */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                🔥 Top 5 Funds Today
              </h2>
              <span className="text-xs text-slate-500">
                Ranked by Final Score = {Math.round((data.weights.strategicWeight) * 100)}% Strategic + {Math.round((data.weights.opportunityWeight) * 100)}% NAV Opportunity
              </span>
            </div>

            {data.topFunds.length === 0 ? (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400">No fund recommendations available. Try refreshing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.topFunds.map((fund, i) => (
                  <FundCard key={fund.fundId} fund={fund} rank={i + 1} />
                ))}
              </div>
            )}
          </div>

          {/* 5. Tactical Allocation */}
          {tacticalAmount > 0 && (
            <TacticalAllocation
              topFunds={data.topFunds}
              sipAmount={tacticalAmount}
            />
          )}

          {/* 6. Avoid Today */}
          {data.avoidFunds.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                ⚠️ Avoid Today — Structural Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.avoidFunds.map((fund) => (
                  <FundCard key={fund.fundId} fund={fund} />
                ))}
              </div>
            </div>
          )}

          {/* 7. Sector Heatmap */}
          <SectorHeatmap indices={data.indices} />

          {/* 8. Index Dashboard Table */}
          <IndexDashboardTable indices={data.indices} />

          {/* 9. Fund vs Market Map */}
          <FundVsMarketMap funds={data.allFunds} />

          {/* 10. NAV Cutoff Timer */}
          <NavCutoffTimer />

          {/* ── FOOTER ── */}
          <footer className="border-t border-slate-800 pt-6 pb-8 mt-4">
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                ⚠️ Important Disclaimers
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">1.</span>
                  <span>
                    <strong className="text-slate-300">Not Investment Advice:</strong> This dashboard provides probability-based decision signals, not investment advice or a guaranteed NAV prediction. Past performance is not indicative of future results.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">2.</span>
                  <span>
                    <strong className="text-slate-300">NAV Disclaimer:</strong> Today&apos;s market weakness is likely to be reflected in the fund&apos;s closing NAV. This is an estimate only. Applicable NAV depends on the applicable cut-off time and funds-realisation conditions per AMFI/SEBI rules.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">3.</span>
                  <span>
                    <strong className="text-slate-300">Proxy Mapping:</strong> Sector/proxy mapping is a category approximation and is not a substitute for the fund&apos;s actual portfolio holdings. The fund may not perfectly track its mapped benchmark index.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">4.</span>
                  <span>
                    <strong className="text-slate-300">Data Sources:</strong> Free/unofficial NSE data sources may be delayed, incomplete, or temporarily unavailable. AMFI NAV data is updated once daily after market close (~9–11 PM IST) and is not intraday. All data is &quot;best effort, delayed.&quot;
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 shrink-0">5.</span>
                  <span>
                    <strong className="text-slate-300">Cut-off Conditions:</strong> For same-day NAV, your transaction must be submitted and funds must be realised by the applicable cut-off time on a business day, per SEBI/AMFI regulations.
                  </span>
                </li>
              </ul>

              <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>
                  📡 NSE Index Data:{" "}
                  <a
                    href="https://www.nseindia.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    nseindia.com
                  </a>{" "}
                  (unofficial, best-effort)
                </span>
                <span>
                  📋 MF NAV Data:{" "}
                  <a
                    href="https://www.amfiindia.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    amfiindia.com
                  </a>{" "}
                  (official, daily)
                </span>
                <span>
                  🔢 Historical NAV:{" "}
                  <a
                    href="https://www.mfapi.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    mfapi.in
                  </a>
                </span>
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
