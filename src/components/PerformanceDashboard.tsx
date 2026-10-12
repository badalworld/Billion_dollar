import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  ShieldCheck,
  BellRing,
  Clock,
  Layers,
} from 'lucide-react';
import type { BotSystemState, TrailStopAlert } from '../server/tradingBotEngine';

interface PerformanceDashboardProps {
  state: BotSystemState;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ state }) => {
  const { account, equityCurve, tradeHistory, alerts, activePositions } = state;

  // Compute SVG coordinates for Multicolored Equity & Profit/Loss Chart
  const chartW = 760;
  const chartH = 260;
  const padX = 48;
  const padY = 28;

  const balances = equityCurve.map((p) => p.balance);
  const minBal = Math.min(...balances, 24000) * 0.995;
  const maxBal = Math.max(...balances, 26000) * 1.005;

  const getX = (idx: number) => {
    if (equityCurve.length <= 1) return padX;
    return padX + (idx / (equityCurve.length - 1)) * (chartW - padX * 2);
  };

  const getY = (val: number) => {
    const ratio = (val - minBal) / Math.max(1, maxBal - minBal);
    return chartH - padY - ratio * (chartH - padY * 2);
  };

  const linePoints = equityCurve.map((pt, idx) => `${getX(idx)},${getY(pt.balance)}`).join(' ');
  const areaPoints = `${getX(0)},${chartH - padY} ${linePoints} ${getX(equityCurve.length - 1)},${chartH - padY}`;

  // Trade ROI Bar Chart data (last 12 trades + active positions)
  const recentTradesSlice = tradeHistory.slice(0, 10).reverse();

  const alertBadgeStyle = (color: TrailStopAlert['colorCode']) => {
    switch (color) {
      case 'cyan':
        return 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300';
      case 'amber':
        return 'bg-amber-500/15 border-amber-500/50 text-amber-300';
      case 'purple':
        return 'bg-purple-500/15 border-purple-500/50 text-purple-300';
      case 'emerald':
        return 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';
      case 'rose':
        return 'bg-rose-500/15 border-rose-500/50 text-rose-300';
      default:
        return 'bg-blue-500/15 border-blue-500/50 text-blue-300';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#070B14] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              LIVE MEXC FUTURES ANALYTICS
            </span>
            <span className="text-xs text-slate-400 font-mono">
              5m Timeframe • 8% Margin • 10x Leverage
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-white via-slate-200 to-emerald-300 bg-clip-text text-transparent">
            Billion Dollar — Multicolored Performance & Risk Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400 block">Next Trade Margin (8%)</span>
            <span className="text-amber-400 font-bold text-sm">
              ${account.nextTradeMarginUsd.toLocaleString()} (10x = ${account.nextTradeNotionalUsd.toLocaleString()})
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400 block">Open Positions</span>
            <span className="text-cyan-400 font-bold text-sm">
              {activePositions.length} / 10 Max
            </span>
          </div>
        </div>
      </div>

      {/* Top Multicolored KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-900 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
            <span>TOTAL BALANCE (USDT)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ${account.totalBalanceUsd.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">
            Available: ${account.availableBalanceUsd.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-900 border border-cyan-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
            <span>GROSS PROFIT</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            +${account.totalProfitUsd.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Unrealized Open: {account.unrealizedPnlUsd >= 0 ? '+' : ''}${account.unrealizedPnlUsd.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-900 border border-rose-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
            <span>GROSS LOSS (3x ATR SL)</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            -${account.totalLossUsd.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Strict 3x ATR(14) Protection
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-900 border border-amber-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>WIN RATE & METRICS</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">
            {account.winRatePct}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {account.winningTradesCount} Wins / {account.losingTradesCount} Losses ({account.totalTradesCount} Total)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-900 border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
            <span>TRAIL STOP RULE</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-black text-purple-300 mt-2">
            20% Hit → +10% Step
          </div>
          <div className="text-xs text-slate-300 mt-1">
            30% ROI moves Trail to 20% ROI
          </div>
        </div>
      </div>

      {/* Multicolored Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Equity & Cumulative Profit/Loss Curve */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Multicolored Equity Growth & Profit/Loss Trajectory
              </h2>
              <p className="text-xs text-slate-400">
                Real-time account balance progression with Boom Hunter Pro opposite-signal TP & Trailing Stop captures
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Equity Curve
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Trade Profit
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> ATR SL Loss
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-64">
              <defs>
                <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((step, i) => {
                const y = padY + step * (chartH - padY * 2);
                const val = maxBal - step * (maxBal - minBal);
                return (
                  <g key={i}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartW - padX}
                      y2={y}
                      stroke="#1E293B"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padX - 6}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      ${Math.round(val).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              {equityCurve.length > 1 && (
                <polygon points={areaPoints} fill="url(#equityGrad)" />
              )}

              {/* Profit / Loss Vertical Multicolored Bars per Trade Point */}
              {equityCurve.map((pt, idx) => {
                const x = getX(idx);
                const baseLineY = chartH - padY;
                if (pt.profit > 0) {
                  const barH = Math.min(70, (pt.profit / 1000) * 55);
                  return (
                    <rect
                      key={`p-${idx}`}
                      x={x - 6}
                      y={baseLineY - barH}
                      width={12}
                      height={barH}
                      rx={3}
                      fill="#10B981"
                      fillOpacity={0.65}
                    />
                  );
                }
                if (pt.loss > 0) {
                  const barH = Math.min(70, (pt.loss / 1000) * 55);
                  return (
                    <rect
                      key={`l-${idx}`}
                      x={x - 6}
                      y={baseLineY - barH}
                      width={12}
                      height={barH}
                      rx={3}
                      fill="#F43F5E"
                      fillOpacity={0.75}
                    />
                  );
                }
                return null;
              })}

              {/* Equity Polyline */}
              {equityCurve.length > 1 && (
                <polyline
                  fill="none"
                  stroke="url(#lineStrokeGrad)"
                  strokeWidth="3.5"
                  points={linePoints}
                />
              )}

              {/* Data Nodes */}
              {equityCurve.map((pt, idx) => {
                const x = getX(idx);
                const y = getY(pt.balance);
                return (
                  <g key={`node-${idx}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={4.5}
                      fill={pt.loss > 0 ? '#F43F5E' : '#10B981'}
                      stroke="#0F172A"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={chartH - 8}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {pt.time}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Multicolored Trade ROI % & Peak Trailing Stop Comparison */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              Recent Trade ROI % vs. Peak Trail Stop
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Multicolored breakdown of captured ROI % (10x Leverage)
            </p>

            <div className="mt-4 space-y-3">
              {recentTradesSlice.map((tr) => {
                const isPos = tr.roiPct >= 0;
                const widthPct = Math.min(100, Math.max(8, Math.abs(tr.roiPct) * 1.8));
                const peakWidthPct = Math.min(100, Math.max(8, Math.abs(tr.peakRoiPct) * 1.8));
                return (
                  <div key={tr.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        {tr.symbol}{' '}
                        <span
                          className={
                            tr.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          ({tr.side})
                        </span>
                      </span>
                      <span className="font-mono">
                        <span
                          className={`font-bold ${
                            isPos ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {tr.roiPct.toFixed(1)}% ROI
                        </span>{' '}
                        <span className="text-slate-500 text-[11px]">
                          (Peak {tr.peakRoiPct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
                      {/* Peak ROI Ghost Bar */}
                      <div
                        className="h-full bg-amber-400/30 rounded-full absolute top-0 left-0"
                        style={{ width: `${peakWidthPct}%` }}
                      />
                      {/* Captured ROI Bar */}
                      <div
                        className={`h-full rounded-full relative ${
                          !isPos
                            ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                            : tr.exitReason === 'TRAIL_STOP_ROI_STEP'
                              ? 'bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-emerald-300 font-bold">Opposite TP</div>
              <div className="text-slate-400 text-[11px]">Indicator Exit</div>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-amber-300 font-bold">Trail 20%/10%</div>
              <div className="text-slate-400 text-[11px]">Step Profit Lock</div>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="text-rose-300 font-bold">3x ATR SL</div>
              <div className="text-slate-400 text-[11px]">Strict Risk Cap</div>
            </div>
          </div>
        </div>
      </div>

      {/* Color-Coded Trailing Stop & Execution Alerts + Recent Trade History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color-Coded Trail Stop Alerts Feed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              Color-Coded Trail Stop & Signal Alerts
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Live 1-2s Stream
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Highlights every 20% ROI Trail Activation and each +10% ROI step (e.g., 30% ROI → Trail moves to 20% ROI)
          </p>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-3 rounded-xl border transition-all ${alertBadgeStyle(al.colorCode)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold tracking-wide">
                    {al.title}
                  </span>
                  <span className="text-[10px] opacity-80 font-mono shrink-0">
                    {new Date(al.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">{al.message}</p>
                {al.lockedRoiPct !== null && (
                  <div className="mt-1.5 inline-flex items-center gap-2 text-[11px] font-bold px-2 py-0.5 rounded bg-black/30">
                    <span>Peak Step: {Math.floor(al.roiPct / 10) * 10}% ROI</span>
                    <span>→</span>
                    <span>Trail Stop Locked @ +{al.lockedRoiPct}% ROI</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trade History Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Recent Executed Trade History (MEXC Futures 5m)
              </h2>
              <p className="text-xs text-slate-400">
                All closed positions executed with 8% balance margin and 10x isolated leverage
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Contract</th>
                  <th className="py-2.5 px-3">Side / Lev</th>
                  <th className="py-2.5 px-3">Entry / Exit</th>
                  <th className="py-2.5 px-3">Margin (8%)</th>
                  <th className="py-2.5 px-3">Peak / Locked</th>
                  <th className="py-2.5 px-3">Realized PnL</th>
                  <th className="py-2.5 px-3">Exit Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tradeHistory.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      {tr.symbol}
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {tr.orderId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          tr.side === 'LONG'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {tr.side} 10x
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {tr.entrySignal}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <div>In: ${tr.entryPrice}</div>
                      <div className="text-slate-400">Out: ${tr.exitPrice}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      ${tr.marginUsedUsd.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="text-amber-300">Peak: +{tr.peakRoiPct.toFixed(1)}%</div>
                      <div className="text-cyan-400 text-[11px]">
                        {tr.trailLockedRoiPct !== null
                          ? `Trail Lock: +${tr.trailLockedRoiPct}%`
                          : 'No Trail (<20%)'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span
                        className={tr.pnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                      >
                        {tr.pnlUsd >= 0 ? '+' : ''}${tr.pnlUsd.toFixed(2)} (
                        {tr.roiPct >= 0 ? '+' : ''}
                        {tr.roiPct.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {tr.exitReason === 'TP_OPPOSITE_SIGNAL' && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">
                          TP: Opposite Signal
                        </span>
                      )}
                      {tr.exitReason === 'TRAIL_STOP_ROI_STEP' && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold text-[11px]">
                          Trail Stop (+{tr.trailLockedRoiPct}% ROI)
                        </span>
                      )}
                      {tr.exitReason === 'SL_ATR_3X' && (
                        <span className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-semibold text-[11px]">
                          SL: 3x ATR Hit
                        </span>
                      )}
                      {tr.exitReason === 'MANUAL_CLOSE' && (
                        <span className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 font-semibold text-[11px]">
                          Manual Close
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
