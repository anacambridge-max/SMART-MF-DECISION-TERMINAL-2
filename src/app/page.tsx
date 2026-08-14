"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardPayload, FundScore, IndexData } from "@/types/dashboard";

const REFRESH_TIMEOUT_MS = 30000;

const TICKER = [
  "NIFTY 50", "NIFTY BANK", "NIFTY NEXT 50", "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250", "NIFTY FINANCIAL SERVICES", "NIFTY IT", "NIFTY PHARMA",
  "NIFTY AUTO", "NIFTY FMCG", "NIFTY METAL", "NIFTY REALTY", "NIFTY ENERGY", "NIFTY INFRA",
  "NIFTY 500", "NIFTY MEDIA",
];

const SECTOR_ORDER = [
  "NIFTY FINANCIAL SERVICES", "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA",
  "NIFTY FMCG", "NIFTY METAL", "NIFTY REALTY", "NIFTY ENERGY", "NIFTY INFRA",
  "NIFTY PSU BANK", "NIFTY MEDIA",
];

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
function pct(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function tone(v: number | null | undefined) {
  if ((v ?? 0) > 0.05) return "text-emerald-400";
  if ((v ?? 0) < -0.05) return "text-rose-400";
  return "text-slate-300";
}
function tileTone(v: number) {
  if (v <= -2) return "bg-rose-950/80 border-rose-800/80";
  if (v < -0.75) return "bg-rose-950/45 border-rose-900/60";
  if (v < 0) return "bg-slate-900 border-slate-700";
  if (v < 0.75) return "bg-emerald-950/30 border-emerald-900/50";
  if (v < 2) return "bg-emerald-950/55 border-emerald-800/70";
  return "bg-emerald-950/80 border-emerald-700/80";
}
function correctionScore(indices: IndexData[]) {
  const negative = indices.filter((x) => x.pChange < 0);
  if (!indices.length) return 0;
  const avgFall = negative.length ? Math.abs(negative.reduce((s, x) => s + x.pChange, 0) / negative.length) : 0;
  const breadth = negative.length / indices.length;
  return Math.max(0, Math.min(100, Math.round(breadth * 55 + avgFall * 18)));
}
function correctionLabel(score: number) {
  if (score >= 81) return "SEVERE CORRECTION";
  if (score >= 61) return "SIGNIFICANT CORRECTION";
  if (score >= 41) return "MODERATE CORRECTION";
  if (score >= 21) return "MILD CORRECTION";
  return "NO MEANINGFUL CORRECTION";
}

function MiniBar({ value }: { value: number }) {
  const width = Math.min(100, Math.abs(value) * 25);
  return <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${value < 0 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(4, width)}%` }} /></div>;
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  return <div className="relative h-24 w-24 shrink-0 rounded-full border-8 border-slate-800 flex items-center justify-center" style={{ background: `conic-gradient(#38bdf8 ${value * 3.6}deg, transparent 0)` }}><div className="absolute inset-1 rounded-full bg-slate-950 flex flex-col items-center justify-center"><span className="text-xl font-black text-white">{value}</span><span className="text-[9px] text-slate-500">{label}</span></div></div>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState<"score" | "fall">("score");

  const refresh = useCallback(async () => {
    if (loading) return;
    setLoading(true); setError(null);
    const timer = setTimeout(() => { setLoading(false); setError("Live request timed out. Showing the last available snapshot."); }, REFRESH_TIMEOUT_MS);
    try {
      const r = await fetch("/api/dashboard/refresh", { cache: "no-store" });
      clearTimeout(timer);
      const j = await r.json();
      if (j.data) { setData(j.data); setLastUpdated(new Date(j.data.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })); }
      else setError(j.error ?? "Data unavailable");
    } catch { clearTimeout(timer); setError("Network error while loading market data."); }
    finally { setLoading(false); }
  }, [loading]);

  useEffect(() => { refresh(); const id = window.setInterval(refresh, 60000); return () => window.clearInterval(id); }, [refresh]);

  const map = useMemo(() => new Map((data?.indices ?? []).map((x) => [x.name.toUpperCase(), x])), [data]);
  const correction = useMemo(() => correctionScore(data?.indices ?? []), [data]);
  const sectors = useMemo(() => SECTOR_ORDER.map((n) => map.get(n)).filter(Boolean) as IndexData[], [map]);
  const headline = ["NIFTY 50", "NIFTY BANK", "NIFTY NEXT 50", "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250", "NIFTY 500"].map((n) => map.get(n)).filter(Boolean) as IndexData[];
  const funds = useMemo(() => {
    let list = [...(data?.allFunds ?? [])];
    if (filter === "DIP") list = list.filter((f) => f.finalScore >= 65 && !f.isAvoid);
    if (filter === "WATCH") list = list.filter((f) => f.finalScore >= 50 && f.finalScore < 65 && !f.isAvoid);
    if (filter === "AVOID") list = list.filter((f) => f.isAvoid);
    if (filter === "NAV") list = list.filter((f) => (f.technicals.drawdown52W ?? 0) <= -5);
    return list.sort((a, b) => sort === "score" ? b.finalScore - a.finalScore : (a.indexMove ?? 0) - (b.indexMove ?? 0));
  }, [data, filter, sort]);
  const topFalls = useMemo(() => [...(data?.indices ?? [])].sort((a, b) => a.pChange - b.pChange).slice(0, 6), [data]);

  const marketStatus = (() => {
    const now = new Date(); const parts = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now); const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0); const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0); const t = h * 60 + m;
    if (t < 555) return "PRE-MARKET"; if (t >= 915 && t <= 930) return "2:30 PM DIP WINDOW"; if (t < 930) return "MARKET OPEN"; return "MARKET CLOSED";
  })();

  return <div className="min-h-screen bg-[#050b14] text-slate-100 selection:bg-sky-500/30">
    <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-[#050b14]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-sky-500/15 border border-sky-500/30 grid place-items-center text-sky-400 font-black">MF</div><div><h1 className="text-sm lg:text-base font-black tracking-tight">SMART MF DECISION TERMINAL</h1><p className="text-[10px] text-slate-500 uppercase tracking-[0.18em]">Indian Mutual Fund Dip-Buying Research System</p></div></div></div>
        <div className="hidden md:flex items-center gap-3 text-[11px]"><span className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300">{marketStatus}</span><span className="text-slate-500">IST</span><span className="font-mono text-slate-300">{lastUpdated || "--:--:--"}</span></div>
        <button onClick={refresh} disabled={loading} className="h-9 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-black text-xs">{loading ? "REFRESHING…" : "↻ REFRESH LIVE DATA"}</button>
      </div>
      <div className="border-t border-slate-900 overflow-hidden"><div className="mx-auto max-w-[1600px] px-4 lg:px-6 flex gap-7 py-2 whitespace-nowrap overflow-x-auto text-[10px] font-bold tracking-wide">{TICKER.map((n) => { const x = map.get(n); return <div key={n} className="flex gap-2 items-center"><span className="text-slate-500">{n.replace("NIFTY ", "")}</span><span className="text-slate-200">{x ? fmt(x.last, 2) : "—"}</span><span className={tone(x?.pChange)}>{x ? pct(x.pChange) : "—"}</span></div>; })}</div></div>
    </header>

    <main className="mx-auto max-w-[1600px] px-4 lg:px-6 py-5 space-y-5">
      {error && <div className="border border-rose-900/70 bg-rose-950/40 text-rose-300 rounded-lg px-4 py-3 text-xs flex justify-between"><span>⚠ {error}</span><button onClick={() => setError(null)}>×</button></div>}

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        {headline.map((x) => <div key={x.name} className="bg-[#0a1320] border border-slate-800 rounded-lg p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{x.name}</div><div className="mt-1 text-lg font-black">{fmt(x.last)}</div><div className={`text-xs font-bold ${tone(x.pChange)}`}>{pct(x.pChange)}</div><div className="mt-2"><MiniBar value={x.pChange} /></div></div>)}
      </section>

      <section className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-[#0a1320] border border-slate-800 rounded-xl p-4 lg:p-5"><div className="flex justify-between items-start gap-3"><div><div className="text-[10px] font-black tracking-[0.2em] text-sky-400">2:30 PM MARKET DIP WINDOW</div><h2 className="text-xl font-black mt-1">WHAT IS FALLING TODAY?</h2><p className="text-xs text-slate-500 mt-1">Live/current index weakness mapped to your mutual-fund watchlist.</p></div><div className="text-right"><div className="text-3xl font-black text-white">{correction}</div><div className="text-[9px] text-slate-500">MARKET CORRECTION SCORE</div></div></div><div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-2">{topFalls.map((x) => <div key={x.name} className="rounded-lg bg-slate-950/70 border border-slate-800 p-3"><div className="text-[10px] text-slate-500 truncate">{x.name}</div><div className={`mt-1 text-lg font-black ${tone(x.pChange)}`}>{pct(x.pChange)}</div><div className="text-[10px] text-slate-600">{fmt(x.last)}</div></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3"><span className={`text-xs font-black ${correction >= 61 ? "text-rose-400" : correction >= 41 ? "text-amber-400" : "text-emerald-400"}`}>{correctionLabel(correction)}</span><span className="text-[10px] text-slate-600">Proxy score based on available index data</span></div></div>
        <div className="bg-[#0a1320] border border-slate-800 rounded-xl p-4 lg:p-5"><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">MARKET REGIME</div><div className="mt-2 flex items-center gap-4"><ScoreRing value={data?.regime?.breadthPercent ?? 0} label="REGIME"/><div><div className="text-2xl font-black">{data?.regime?.label ?? "—"}</div><p className="text-xs text-slate-500 mt-1 max-w-xs">{data?.regime?.strategyNote ?? "Waiting for market data."}</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="bg-slate-950 rounded-lg p-3"><div className="text-lg font-black">{data?.regime?.breadthPercent ?? 0}%</div><div className="text-[9px] text-slate-600">BREADTH PROXY</div></div><div className="bg-slate-950 rounded-lg p-3"><div className="text-lg font-black">{data?.indices?.filter(x => x.pChange < 0).length ?? 0}</div><div className="text-[9px] text-slate-600">INDEX FALLS</div></div><div className="bg-slate-950 rounded-lg p-3"><div className="text-lg font-black">{data?.allFunds?.filter(x => x.finalScore >= 65 && !x.isAvoid).length ?? 0}</div><div className="text-[9px] text-slate-600">DIP WATCH</div></div></div></div>
      </section>

      <section><div className="flex items-end justify-between mb-3"><div><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">MARKET MAP</div><h2 className="text-lg font-black">INDEX HEATMAP</h2></div><span className="text-[10px] text-slate-600">Sorted by today's move</span></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">{[...(data?.indices ?? [])].sort((a,b)=>a.pChange-b.pChange).map(x => <div key={x.name} className={`border rounded-lg p-3 ${tileTone(x.pChange)}`}><div className="text-[10px] font-bold text-slate-400 truncate">{x.name}</div><div className={`text-lg font-black mt-1 ${tone(x.pChange)}`}>{pct(x.pChange)}</div><div className="text-[10px] text-slate-500 mt-1">{fmt(x.last)}</div><div className="text-[9px] text-slate-600 mt-1">Prev {fmt(x.previousClose)}</div></div>)}</div></section>

      <section><div className="flex items-end justify-between mb-3"><div><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">SECTOR ROTATION</div><h2 className="text-lg font-black">LIVE SECTOR HEATMAP</h2></div><div className="text-[10px] text-slate-600">Biggest fall → biggest rise</div></div><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">{sectors.sort((a,b)=>a.pChange-b.pChange).map(x => <div key={x.name} className={`border rounded-lg p-3 ${tileTone(x.pChange)}`}><div className="text-[10px] font-bold text-slate-400 truncate">{x.name.replace("NIFTY ", "")}</div><div className={`text-xl font-black mt-2 ${tone(x.pChange)}`}>{pct(x.pChange)}</div><div className="text-[9px] text-slate-500 mt-1">Index {fmt(x.last)}</div><div className="mt-2"><MiniBar value={x.pChange} /></div></div>)}</div></section>

      <section><div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-3"><div><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">DECISION ENGINE</div><h2 className="text-lg font-black">TOP DIP OPPORTUNITIES</h2><p className="text-xs text-slate-600 mt-1">Every score is derived from the current data available to the engine.</p></div><div className="flex gap-1 flex-wrap">{[["ALL","ALL"],["DIP","STRONG DIP"],["WATCH","WATCH"],["NAV","NAV CORRECTION"],["AVOID","AVOID"]].map(([v,l]) => <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-md text-[10px] font-black border ${filter===v ? "bg-sky-500 text-slate-950 border-sky-400" : "bg-slate-900 text-slate-400 border-slate-700"}`}>{l}</button>)}</div></div><div className="overflow-x-auto border border-slate-800 rounded-xl"><table className="w-full min-w-[1100px] text-left"><thead className="bg-slate-950 text-[9px] uppercase tracking-wider text-slate-600"><tr>{["Fund","Relevant Index","Index Move","NAV","NAV Date","Trend","Technical","Opportunity","Overall","Signal","Why"].map(h => <th key={h} className="px-3 py-3 font-black">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/80">{funds.map((f: FundScore, i) => <tr key={f.fundId} className="hover:bg-slate-900/50"><td className="px-3 py-3"><div className="flex items-center gap-2"><span className="text-[10px] text-slate-700">{String(i+1).padStart(2,"0")}</span><div><div className="text-xs font-bold text-slate-200 max-w-[250px]">{f.fundName}</div><div className="text-[9px] text-slate-600">{f.category}</div></div></div></td><td className="px-3 py-3 text-[10px] text-slate-400">{f.proxyIndex}</td><td className={`px-3 py-3 text-xs font-black ${tone(f.indexMove)}`}>{pct(f.indexMove)}</td><td className="px-3 py-3 text-xs font-mono">{fmt(f.technicals.latestNav,4)}</td><td className="px-3 py-3 text-[10px] text-slate-500">{f.technicals.navDate ?? "Latest unavailable"}</td><td className="px-3 py-3"><span className={`text-[9px] font-black ${f.trendStatus === "uptrend" ? "text-emerald-400" : f.trendStatus === "downtrend" ? "text-rose-400" : "text-slate-400"}`}>{f.trendStatus.toUpperCase()}</span></td><td className="px-3 py-3 text-xs font-black">{Math.round(f.strategicScore)}</td><td className="px-3 py-3 text-xs font-black">{Math.round(f.opportunityScore)}</td><td className="px-3 py-3"><span className="text-sm font-black text-sky-300">{Math.round(f.finalScore)}</span></td><td className="px-3 py-3"><span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black ${f.actionLabel === "BUY ON DIP" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : f.actionLabel === "AVOID" ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>{f.actionLabel}</span></td><td className="px-3 py-3 text-[10px] text-slate-500 max-w-[280px]">{f.reason}</td></tr>)}</tbody></table></div></section>

      <section className="grid lg:grid-cols-[1.1fr_1.9fr] gap-4"><div className="bg-[#0a1320] border border-slate-800 rounded-xl p-4"><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">MARKET BREADTH</div><h2 className="text-lg font-black mt-1">Correction Context</h2><div className="mt-5 space-y-4">{[["Indices falling", data?.indices?.filter(x=>x.pChange<0).length ?? 0, data?.indices?.length ?? 0],["Indices rising", data?.indices?.filter(x=>x.pChange>0).length ?? 0, data?.indices?.length ?? 0],["Funds in dip watch", data?.allFunds?.filter(x=>x.finalScore>=65 && !x.isAvoid).length ?? 0, data?.allFunds?.length ?? 0]].map(([label,v,total]) => <div key={String(label)}><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{label}</span><span className="font-bold">{v}/{total}</span></div><div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-sky-500 rounded-full" style={{width:`${total ? Number(v)/Number(total)*100 : 0}%`}} /></div></div>)}</div></div><div className="bg-[#0a1320] border border-slate-800 rounded-xl p-4"><div className="flex justify-between items-center"><div><div className="text-[10px] font-black tracking-[0.2em] text-slate-500">2:30 PM RESEARCH LOG</div><h2 className="text-lg font-black mt-1">Today's Snapshot</h2></div><button onClick={() => setSort(sort === "score" ? "fall" : "score")} className="text-[10px] px-2.5 py-1.5 border border-slate-700 rounded-md text-slate-400">Sort: {sort === "score" ? "Score" : "Index Fall"}</button></div><div className="mt-4 grid md:grid-cols-2 gap-2">{topFalls.slice(0,4).map(x => <div key={x.name} className="flex items-center justify-between border border-slate-800 bg-slate-950/50 rounded-lg p-3"><span className="text-[10px] text-slate-400 truncate">{x.name}</span><span className={`text-xs font-black ${tone(x.pChange)}`}>{pct(x.pChange)}</span></div>)}</div><p className="text-[10px] text-slate-600 mt-4">Historical 2:30 PM snapshot storage is the next data-layer extension; this view intentionally shows only the current verified snapshot.</p></div></section>

      <footer className="border-t border-slate-900 pt-4 pb-8 text-[10px] text-slate-600 flex flex-col md:flex-row gap-2 justify-between"><span>Smart MF Decision Terminal • Research & decision support only</span><span>Mutual-fund NAV is latest available, not a continuously traded live price. Never treat signals as guaranteed predictions.</span></footer>
    </main>
  </div>;
}
