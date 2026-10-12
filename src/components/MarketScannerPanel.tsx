import React, { useState } from 'react';
import {
  Radar,
  RefreshCw,
  Play,
  Eye,
  Flame,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import type { BotSystemState } from '../server/tradingBotEngine';

interface MarketScannerPanelProps {
  state: BotSystemState;
  onTriggerScanNow: () => void;
  onExecuteTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
  onInspectSymbol: (symbol: string) => void;
}

export const MarketScannerPanel: React.FC<MarketScannerPanelProps> = ({
  state,
  onTriggerScanNow,
  onExecuteTrade,
  onInspectSymbol,
}) => {
  const [viewMode, setViewMode] = useState<'OPPORTUNISTS_ONLY' | 'TOP_100_SERIAL'>(
    'OPPORTUNISTS_ONLY'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const { opportunistAssets, top100VolatileMarkets, timers, activePositions } = state;
  const openSymbols = new Set(activePositions.map((p) => p.symbol));

  const filteredTop100 = top100VolatileMarkets.filter(
    (m) =>
      m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-[#070B14] min-h-screen text-slate-100">
      {/* Header & Live 5s / 15s Timers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              5s OPPORTUNIST MONITOR (NEXT IN {timers.nextOpportunistScanInSec}s)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              15s TOP 100 VOLATILE SCAN (NEXT IN {timers.nextMarketScanInSec}s)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-white">
            Opportunist Assets (5s Execution Monitor) & Top 100 Serial Volatile Markets
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setViewMode('OPPORTUNISTS_ONLY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              viewMode === 'OPPORTUNISTS_ONLY'
                ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-950/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Possible Opportunist Assets ({opportunistAssets.length})
          </button>

          <button
            onClick={() => setViewMode('TOP_100_SERIAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              viewMode === 'TOP_100_SERIAL'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Top 100 Volatile Serial (#1–#100)
          </button>

          <button
            onClick={onTriggerScanNow}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Now
          </button>
        </div>
      </div>

      {/* VIEW 1: ONLY POSSIBLE OPPORTUNIST ASSETS (MONITORED EVERY 5 SECONDS) */}
      {viewMode === 'OPPORTUNISTS_ONLY' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-950/25 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Radar className="w-6 h-6 text-purple-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Dashboard Opportunist Filter Active (Monitored Every 5 Seconds)
                </h2>
                <p className="text-xs text-slate-300">
                  Showing only high-probability Boom Hunter Pro v1.022 assets filtered from the Top 100 volatile markets for immediate 5m trade execution.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-purple-300 shrink-0">
              Scan Cycle #{timers.opportunistScanCount} • Open Slots: {10 - activePositions.length} Available
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {opportunistAssets.map((asset) => {
              const alreadyOpen = openSymbols.has(asset.symbol);
              return (
                <div
                  key={asset.symbol}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/40 hover:border-emerald-500/60 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
                          Vol #{asset.serialRank}
                        </span>
                        <span className="text-base font-black text-white">
                          {asset.symbol}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Score: {asset.opportunistScore}%
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl font-black font-mono text-white">
                        ${asset.price}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          asset.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        24h: {asset.change24hPct >= 0 ? '+' : ''}
                        {asset.change24hPct}% | Vol: {asset.volatilityPct}%
                      </span>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                      <div className="text-purple-300 font-semibold truncate">
                        {asset.opportunistReason}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Q1: {asset.q1} (Trig: {asset.trigger})</span>
                        <span>WT2: {asset.wt2}</span>
                        <span>3x ATR: ±${asset.atr3xDistance}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onInspectSymbol(asset.symbol)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      5m Chart
                    </button>

                    {alreadyOpen ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                        Position Active
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onExecuteTrade(asset.symbol, 'LONG')}
                          disabled={activePositions.length >= 10}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                        >
                          <Play className="w-3 h-3" /> Long 10x
                        </button>
                        <button
                          onClick={() => onExecuteTrade(asset.symbol, 'SHORT')}
                          disabled={activePositions.length >= 10}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                        >
                          <Play className="w-3 h-3" /> Short 10x
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: TOP 100 VOLATILE MARKETS SORTED SERIALLY (#1 TO #100) */}
      {viewMode === 'TOP_100_SERIAL' && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Top 100 Volatile MEXC Futures Markets (Sorted Serially #1 → #100)
              </h2>
              <p className="text-xs text-slate-400">
                Automatically scanned and re-ranked every 15 seconds across MEXC USDT-M Perpetual contracts
              </p>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter symbol (e.g. BTC, SOL, PEPE)..."
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Serial Rank</th>
                  <th className="py-3 px-3">Contract</th>
                  <th className="py-3 px-3">Last Price</th>
                  <th className="py-3 px-3">Volatility Index</th>
                  <th className="py-3 px-3">24h Change</th>
                  <th className="py-3 px-3">Boom Hunter (Q1 / Trig / WT2)</th>
                  <th className="py-3 px-3">3x ATR SL Dist</th>
                  <th className="py-3 px-3">Opportunist Status</th>
                  <th className="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTop100.map((m) => (
                  <tr key={m.symbol} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-black text-cyan-400">
                      #{m.serialRank}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white">{m.symbol}</span>
                      <span className="block text-[10px] text-slate-400">{m.name}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                      ${m.price}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                      {m.volatilityPct}%
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={
                          m.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {m.change24hPct >= 0 ? '+' : ''}
                        {m.change24hPct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      Q1: {m.q1} | T: {m.trigger} | WT2: {m.wt2}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-300">
                      ±${m.atr3xDistance}
                    </td>
                    <td className="py-2.5 px-3">
                      {m.isOpportunist ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-[11px]">
                          Opportunist ({m.opportunistScore}%)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Scanning (15s)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onInspectSymbol(m.symbol)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold"
                      >
                        Inspect 5m
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
