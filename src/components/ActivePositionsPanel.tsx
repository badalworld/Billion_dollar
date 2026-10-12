import React from 'react';
import {
  ShieldAlert,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  XCircle,
} from 'lucide-react';
import type { BotSystemState, ActivePosition } from '../server/tradingBotEngine';

interface ActivePositionsPanelProps {
  state: BotSystemState;
  onBoostRoi: (positionId: string, addRoi: number) => void;
  onClosePosition: (positionId: string, reason: 'TP_OPPOSITE_SIGNAL' | 'MANUAL_CLOSE') => void;
}

export const ActivePositionsPanel: React.FC<ActivePositionsPanelProps> = ({
  state,
  onBoostRoi,
  onClosePosition,
}) => {
  const { activePositions, timers } = state;

  const getCardColorClasses = (pos: ActivePosition) => {
    if (pos.trailMilestoneRoi >= 50) {
      return 'border-emerald-500/70 bg-gradient-to-br from-emerald-950/35 via-slate-900/95 to-slate-900 shadow-emerald-950/40';
    }
    if (pos.trailMilestoneRoi === 40) {
      return 'border-purple-500/70 bg-gradient-to-br from-purple-950/35 via-slate-900/95 to-slate-900 shadow-purple-950/40';
    }
    if (pos.trailMilestoneRoi === 30) {
      return 'border-amber-500/70 bg-gradient-to-br from-amber-950/35 via-slate-900/95 to-slate-900 shadow-amber-950/40';
    }
    if (pos.trailMilestoneRoi === 20) {
      return 'border-cyan-500/70 bg-gradient-to-br from-cyan-950/35 via-slate-900/95 to-slate-900 shadow-cyan-950/40';
    }
    return 'border-slate-800 bg-slate-900/85';
  };

  return (
    <div className="p-6 space-y-6 bg-[#070B14] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              1-2s REAL-TIME POSITION MONITOR (TICK #{timers.positionMonitorCount})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Max 10 Concurrent Positions • 8% Margin • 10x Leverage
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-white">
            Active Positions & Step Trailing Stop Control ({activePositions.length} / 10 Open)
          </h1>
        </div>

        {/* Trailing Stop Rule Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold">
            20% ROI → Trail Active (+10% Lock)
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
            30% ROI → Trail Moves to 20% ROI
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 font-bold">
            40% ROI → Trail Moves to 30% ROI
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
            Every +10% ROI → +10% Trail Move
          </span>
        </div>
      </div>

      {/* 10 Position Pod Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activePositions.map((pos) => {
          const isLong = pos.side === 'LONG';
          const isProfit = pos.roiPct >= 0;

          return (
            <div
              key={pos.id}
              className={`p-5 rounded-2xl border-2 shadow-xl transition-all duration-300 ${getCardColorClasses(
                pos
              )}`}
            >
              {/* Top Row: Pod Badge, Symbol, Side, Live ROI */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">POD</span>
                    <span className="text-sm font-black text-emerald-400">
                      #{pos.podSlot}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{pos.symbol}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-extrabold flex items-center gap-0.5 ${
                          isLong
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isLong ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {pos.side} 10x
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono">
                        5m TF
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Signal: <span className="text-slate-200 font-semibold">{pos.entrySignalLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-2xl font-black font-mono ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? '+' : ''}
                    {pos.roiPct.toFixed(2)}% ROI
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isProfit ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {isProfit ? '+' : ''}${pos.pnlUsd.toFixed(2)} USDT (Peak: +{pos.peakRoiPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Color-Coded Trailing Stop Alert Banner */}
              <div className="mt-4">
                {pos.trailStopActive ? (
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      pos.trailMilestoneRoi >= 40
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                        : pos.trailMilestoneRoi === 30
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="w-4 h-4 shrink-0" />
                      {pos.trailMilestoneRoi === 20
                        ? '20% ROI Hit → Trail Stop Activated (+10% ROI Locked)'
                        : `${pos.trailMilestoneRoi}% ROI Milestone Hit → Trail Stop Moved to +${pos.trailLockedRoiPct}% ROI!`}
                    </span>
                    <span className="font-mono underline">
                      Stop @ ${pos.currentSlPrice}
                    </span>
                  </div>
                ) : (
                  <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-blue-400" />
                      Protected by 3x ATR Initial Stop Loss (Awaiting 20% ROI for Trail Activation)
                    </span>
                    <span className="font-mono text-slate-300">
                      {(20 - Math.max(0, pos.peakRoiPct)).toFixed(1)}% to Trail
                    </span>
                  </div>
                )}
              </div>

              {/* Visual 10% Step ROI Ladder Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Entry (0%)</span>
                  <span className={pos.peakRoiPct >= 20 ? 'text-cyan-400' : ''}>
                    20% (Trail On)
                  </span>
                  <span className={pos.peakRoiPct >= 30 ? 'text-amber-400' : ''}>
                    30% (→20% Lock)
                  </span>
                  <span className={pos.peakRoiPct >= 40 ? 'text-purple-400' : ''}>
                    40% (→30% Lock)
                  </span>
                  <span className={pos.peakRoiPct >= 50 ? 'text-emerald-400' : ''}>
                    50%+ (→40% Lock)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
                  {/* Locked Trail Stop Marker */}
                  {pos.trailLockedRoiPct !== null && (
                    <div
                      className="h-full bg-amber-500/40 absolute top-0 left-0 border-r-2 border-amber-300"
                      style={{
                        width: `${Math.min(100, (pos.trailLockedRoiPct / 50) * 100)}%`,
                      }}
                      title={`Locked Trail Stop Floor: +${pos.trailLockedRoiPct}% ROI`}
                    />
                  )}
                  {/* Current ROI Progress */}
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pos.roiPct < 0
                        ? 'bg-rose-500'
                        : pos.trailMilestoneRoi >= 40
                          ? 'bg-gradient-to-r from-cyan-500 via-amber-400 to-purple-400'
                          : pos.trailMilestoneRoi === 30
                            ? 'bg-gradient-to-r from-cyan-500 to-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(4, (Math.max(0, pos.roiPct) / 50) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Price, Margin (8%), ATR 3x SL, and Indicator Status Grid */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Entry / Mark Price</span>
                  <span className="font-mono font-bold text-slate-200">
                    ${pos.entryPrice} → ${pos.currentPrice}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Margin (8%) @ 10x</span>
                  <span className="font-mono font-bold text-amber-300">
                    ${pos.marginUsedUsd} (${pos.notionalValueUsd})
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">
                    {pos.trailStopActive ? 'Trail Stop Price' : '3x ATR Stop Loss'}
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    ${pos.currentSlPrice}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Take Profit Rule</span>
                  <span className="font-bold text-emerald-300">
                    Opposite Signal (Q1={pos.indicatorState.q1})
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Updated {Math.max(0, Math.round((Date.now() - pos.lastUpdatedMs) / 1000))}s ago (1-2s Loop)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBoostRoi(pos.id, 10)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Simulate +10% ROI surge to test 20% -> 30% -> 40% Trail Stop step"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Test +10% ROI Step
                  </button>
                  <button
                    onClick={() => onClosePosition(pos.id, 'TP_OPPOSITE_SIGNAL')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    TP (Opposite Signal)
                  </button>
                  <button
                    onClick={() => onClosePosition(pos.id, 'MANUAL_CLOSE')}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 transition-colors"
                    title="Close Position"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
