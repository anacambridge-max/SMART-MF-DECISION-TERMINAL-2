"use client";

import { useState, useEffect } from "react";
import type { FundScore } from "@/types/dashboard";

type Fund = {
  id: number;
  name: string;
  amfiCode: string;
  proxyIndex: string;
  category: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentWeights: { strategicWeight: number; opportunityWeight: number };
  onSettingsSaved: () => void;
};

const INDEX_OPTIONS = [
  "NIFTY 50", "NIFTY NEXT 50", "NIFTY MIDCAP 150", "NIFTY SMALLCAP 250",
  "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA", "NIFTY FMCG",
  "NIFTY METAL", "NIFTY REALTY", "NIFTY FINANCIAL SERVICES", "NIFTY ENERGY",
  "NIFTY PSU BANK", "NIFTY INFRA", "NIFTY LARGEMIDCAP 250", "NIFTY 500",
  "NIFTY MEDIA", "GOLD",
];

export function SettingsPanel({ isOpen, onClose, currentWeights, onSettingsSaved }: Props) {
  const [strategicWeight, setStrategicWeight] = useState(
    Math.round(currentWeights.strategicWeight * 100)
  );
  const [funds, setFunds] = useState<Fund[]>([]);
  const [tacticalAmount, setTacticalAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newFund, setNewFund] = useState({
    name: "", amfiCode: "", proxyIndex: "NIFTY 50", category: "Large Cap"
  });

  const opportunityWeight = 100 - strategicWeight;

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d: { settings?: Record<string, string>; funds?: Fund[] }) => {
          if (d.funds) setFunds(d.funds);
          if (d.settings?.tactical_sip_amount) {
            setTacticalAmount(d.settings.tactical_sip_amount);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const resp = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            strategic_weight: (strategicWeight / 100).toString(),
            opportunity_weight: (opportunityWeight / 100).toString(),
            tactical_sip_amount: tacticalAmount,
          },
          funds: funds.map((f) => ({
            id: f.id,
            name: f.name,
            amfiCode: f.amfiCode,
            proxyIndex: f.proxyIndex,
            category: f.category,
          })),
        }),
      });
      if (resp.ok) {
        setMessage("✅ Settings saved successfully!");
        onSettingsSaved();
      } else {
        setMessage("❌ Failed to save settings.");
      }
    } catch {
      setMessage("❌ Network error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddFund() {
    if (!newFund.name.trim()) return;
    setFunds((prev) => [
      ...prev,
      { ...newFund, id: -(Date.now()) }, // temp negative id for new
    ]);
    setNewFund({ name: "", amfiCode: "", proxyIndex: "NIFTY 50", category: "Large Cap" });
  }

  function handleRemoveFund(id: number) {
    setFunds((prev) => prev.filter((f) => f.id !== id));
  }

  function handleUpdateProxy(id: number, proxyIndex: string) {
    setFunds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, proxyIndex } : f))
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center py-8 px-4">
        <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ⚙️ Settings & Configuration
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Scoring Weights */}
            <section>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                📊 Scoring Weights
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm text-slate-300">
                      Strategic Score Weight
                    </label>
                    <span className="text-sm font-bold text-blue-400">
                      {strategicWeight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    value={strategicWeight}
                    onChange={(e) => setStrategicWeight(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>NAV Opportunity: {opportunityWeight}%</span>
                    <span>Strategic: {strategicWeight}%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tactical SIP Amount */}
            <section>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                💰 Tactical SIP Top-up Amount (₹)
              </h3>
              <input
                type="number"
                value={tacticalAmount}
                onChange={(e) => setTacticalAmount(e.target.value)}
                placeholder="Enter amount (e.g. 10000)"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                If set, the Tactical Allocation panel will show a proportional split across Top 5 funds.
              </p>
            </section>

            {/* Fund Watchlist */}
            <section>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">
                📋 Fund Watchlist
              </h3>
              <p className="text-xs text-amber-400 mb-3">
                ⚠ Proxy mapping is a category approximation, not the fund&apos;s actual portfolio holdings.
              </p>

              {/* Add new fund */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <input
                  type="text"
                  placeholder="Fund name"
                  value={newFund.name}
                  onChange={(e) => setNewFund((p) => ({ ...p, name: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="AMFI Code"
                  value={newFund.amfiCode}
                  onChange={(e) => setNewFund((p) => ({ ...p, amfiCode: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <select
                  value={newFund.proxyIndex}
                  onChange={(e) => setNewFund((p) => ({ ...p, proxyIndex: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {INDEX_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category"
                    value={newFund.category}
                    onChange={(e) => setNewFund((p) => ({ ...p, category: e.target.value }))}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddFund}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-bold"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Fund list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {funds.map((fund) => (
                  <div
                    key={fund.id}
                    className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate">{fund.name}</p>
                      <p className="text-xs text-slate-500">{fund.amfiCode} • {fund.category}</p>
                    </div>
                    <select
                      value={fund.proxyIndex}
                      onChange={(e) => handleUpdateProxy(fund.id, e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500 max-w-[130px]"
                    >
                      {INDEX_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <button
                      onClick={() => handleRemoveFund(fund.id)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Save */}
            {message && (
              <p className="text-sm text-center">{message}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-bold"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export needed type for page
export type { FundScore };
