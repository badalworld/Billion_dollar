import React, { useEffect, useState } from 'react';
import { Activity, Code2, CheckCircle, Play } from 'lucide-react';
import type { BotSystemState } from '../server/tradingBotEngine';
import type { OHLCVBar, BoomHunterResult } from '../engine/boomHunterPro';

interface BoomHunterChartPanelProps {
  state: BotSystemState;
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  onExecuteTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
}

export const BoomHunterChartPanel: React.FC<BoomHunterChartPanelProps> = ({
  state,
  selectedSymbol,
  onSelectSymbol,
  onExecuteTrade,
}) => {
  const [chartData, setChartData] = useState<{
    symbol: string;
    bars: OHLCVBar[];
    indicator: BoomHunterResult;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/indicator/${encodeURIComponent(selectedSymbol)}`);
        if (res.ok && active) {
          const json = await res.json();
          setChartData(json);
        }
      } catch {
        // ignore transient error
      }
    };
    fetchDetail();
    const timer = setInterval(fetchDetail, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedSymbol]);

  const series = chartData?.indicator.series || [];
  const latest = chartData?.indicator.latest;

  const svgW = 860;
  const oscH = 260;
  const priceH = 210;
  const padX = 48;
  const padY = 22;

  const getX = (idx: number, total: number) => {
    if (total <= 1) return padX;
    return padX + (idx / (total - 1)) * (svgW - padX * 2);
  };

  // Price & 3x ATR coordinates
  const prices = series.map((s) => s.close);
  const minP = (prices.length ? Math.min(...prices) : 1) * 0.985;
  const maxP = (prices.length ? Math.max(...prices) : 2) * 1.015;
  const getPriceY = (val: number) => {
    const r = (val - minP) / Math.max(1e-9, maxP - minP);
    return priceH - padY - r * (priceH - padY * 2);
  };

  // Oscillator coordinates (-20 to 120 range)
  const getOscY = (val: number) => {
    const clamped = Math.max(-20, Math.min(120, val));
    const r = (clamped - -20) / 140;
    return oscH - padY - r * (oscH - padY * 2);
  };

  const pricePolyline = series
    .map((pt, i) => `${getX(i, series.length)},${getPriceY(pt.close)}`)
    .join(' ');
  const upperAtrLine = series
    .map((pt, i) => `${getX(i, series.length)},${getPriceY(pt.close + 3 * pt.atr)}`)
    .join(' ');
  const lowerAtrLine = series
    .map((pt, i) => `${getX(i, series.length)},${getPriceY(pt.close - 3 * pt.atr)}`)
    .join(' ');

  const q1Line = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.q1)}`)
    .join(' ');
  const trigLine = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.trigger)}`)
    .join(' ');
  const q3Line = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.q3)}`)
    .join(' ');
  const q4Line = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.q4)}`)
    .join(' ');
  const q5Line = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.q5)}`)
    .join(' ');
  const q6Line = series
    .map((pt, i) => `${getX(i, series.length)},${getOscY(pt.q6)}`)
    .join(' ');

  return (
    <div className="p-6 space-y-6 bg-[#070B14] min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              PINE SCRIPT v5 • BOOM HUNTER PRO v1.022 (© veryfid)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              5m Timeframe • TP on Opposite Signal • SL on 3x ATR(14)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-white">
            Live Boom Hunter Pro v1.022 Oscillator & 3x ATR Risk Inspector
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => onSelectSymbol(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {state.top100VolatileMarkets.map((m) => (
              <option key={m.symbol} value={m.symbol}>
                #{m.serialRank} {m.symbol} — ${m.price} (Vol {m.volatilityPct}%)
              </option>
            ))}
          </select>

          <button
            onClick={() => onExecuteTrade(selectedSymbol, 'LONG')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Execute Long 10x
          </button>
          <button
            onClick={() => onExecuteTrade(selectedSymbol, 'SHORT')}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Execute Short 10x
          </button>
        </div>
      </div>

      {/* Live Oscillator Telemetry Values */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">EOT 1 (q1 / Trigger)</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              {latest.q1} / {latest.trigger}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Quotient1: {latest.Quotient1}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">EOT 2 Red Wave (q3 / q4)</span>
            <span className="text-base font-black text-rose-400 font-mono">
              {latest.q3} / {latest.q4}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Quotient3: {latest.Quotient3}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">EOT 3 Boom Line (q5 / q6)</span>
            <span className="text-base font-black text-amber-300 font-mono">
              {latest.q5} / {latest.q6}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Square K13=0.9999
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">LSMA WaveTrend (wt2)</span>
            <span className="text-base font-black text-cyan-400 font-mono">
              {latest.wt2} (LSMA: {latest.lsma})
            </span>
            <span className="text-[11px] text-slate-500 block">
              tradition(hlc3)
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">3x ATR(14) Stop Distance</span>
            <span className="text-base font-black text-purple-300 font-mono">
              ±${(latest.atr * 3).toPrecision(5)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              1x ATR: ${latest.atr}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 block">Opportunist Readiness</span>
            <span className="text-base font-black text-emerald-300 font-mono">
              {chartData?.indicator.opportunistScore}%
            </span>
            <span className="text-[11px] text-slate-400 truncate block">
              {chartData?.indicator.opportunistReason}
            </span>
          </div>
        </div>
      )}

      {/* Dual-Pane Chart: Top = 5m Price + 3x ATR Bands | Bottom = Boom Hunter Pro v1.022 */}
      <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              {selectedSymbol} — 5m Close Price & 3x ATR(14) Dynamic Stop Loss Envelope
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-cyan-300 font-mono">— 5m Close Price</span>
              <span className="text-rose-400 font-mono">-- Upper/Lower 3x ATR SL</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${svgW} ${priceH}`} className="w-full h-48 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <polyline
              fill="none"
              stroke="#F43F5E"
              strokeWidth="1.3"
              strokeDasharray="4 4"
              points={upperAtrLine}
            />
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="1.3"
              strokeDasharray="4 4"
              points={lowerAtrLine}
            />
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              points={pricePolyline}
            />
          </svg>
        </div>

        {/* Bottom Pane: Exact Boom Hunter Pro v1.022 */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-bold text-white">
              Boom Hunter Pro v1.022 Sub-Pane (EOT 1 Main Oscillator, EOT 2 Red Wave, EOT 3 Boom Line, WT2 Pressure)
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              <span className="text-[#00ffaa]">● Q1 Main Oscillator</span>
              <span className="text-white">● Trigger SMA(2)</span>
              <span className="text-rose-400">● EOT 2 Red Wave (q3/q4)</span>
              <span className="text-amber-300">● EOT 3 Yellow Boom (q5)</span>
              <span className="text-blue-400">● Downward Boom (q6)</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgW} ${oscH}`} className="w-full h-64 bg-slate-950/90 rounded-xl border border-slate-800">
            {/* Fibonacci Reference Lines (84, 64, 50, 36, 18) */}
            {[100, 84, 64, 50, 36, 18, 0].map((lvl) => {
              const y = getOscY(lvl);
              return (
                <g key={lvl}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={svgW - padX}
                    y2={y}
                    stroke="#1E293B"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padX - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {lvl}
                  </text>
                </g>
              );
            })}

            {/* EOT 3 Downward Boom Line (q6 - Blue) & Yellow Line (q5) */}
            <polyline fill="none" stroke="#3B82F6" strokeWidth="1.2" points={q6Line} />
            <polyline fill="none" stroke="#FACC15" strokeWidth="1.3" points={q5Line} />

            {/* EOT 2 Red Wave (q3 & q4) */}
            <polyline fill="none" stroke="#EF4444" strokeWidth="1.4" strokeOpacity="0.8" points={q3Line} />
            <polyline fill="none" stroke="#EF4444" strokeWidth="1.4" strokeOpacity="0.8" points={q4Line} />

            {/* Trigger Line (White) & Main Oscillator q1 (#00ffaa) */}
            <polyline fill="none" stroke="#FFFFFF" strokeWidth="1.8" points={trigLine} />
            <polyline fill="none" stroke="#00FFAA" strokeWidth="2.4" points={q1Line} />

            {/* Pressure Dots (ext1) & Entry/Exit Signal Shapes */}
            {series.map((pt, idx) => {
              const x = getX(idx, series.length);
              return (
                <g key={idx}>
                  {pt.ext1 !== null && (
                    <circle
                      cx={x}
                      cy={getOscY(pt.ext1)}
                      r={3.5}
                      fill={pt.wt2 < 20 ? '#00FFAA' : '#EF4444'}
                    />
                  )}
                  {pt.longSignal && (
                    <g>
                      <circle cx={x} cy={getOscY(pt.q1) - 10} r={5} fill="#10B981" />
                      <text
                        x={x}
                        y={getOscY(pt.q1) - 18}
                        textAnchor="middle"
                        className="fill-emerald-300 text-[9px] font-bold"
                      >
                        LONG
                      </text>
                    </g>
                  )}
                  {pt.shortSignal && (
                    <g>
                      <circle cx={x} cy={getOscY(pt.q1) + 10} r={5} fill="#F43F5E" />
                      <text
                        x={x}
                        y={getOscY(pt.q1) + 22}
                        textAnchor="middle"
                        className="fill-rose-300 text-[9px] font-bold"
                      >
                        SHORT
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* TradingView Pine Script v5 Rule Compliance Verification Box */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Code2 className="w-4 h-4" /> EOT 1, 2 & 3 Roofing Filters
          </div>
          <p className="text-slate-400 leading-relaxed">
            Highpass filter (100-bar cyclic cutoff) + SuperSmoother Filter (LPPeriod=6, LPPeriod2=27, LPPeriod3=11) + Fast Attack Slow Decay (0.991 Peak) + Normalized Roofing Quotient transforms.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <CheckCircle className="w-4 h-4" /> LSMA WaveTrend & LuxAlgo Pivots
          </div>
          <p className="text-slate-400 leading-relaxed">
            Computes <code className="text-slate-200">tradition(hlc3) = avg(tci, mf, rsi(3))</code>, <code className="text-slate-200">wt2 = sma(wt1, 6)</code>, <code className="text-slate-200">wt3 = linreg(wt1, 21, 0)</code>, <code className="text-slate-200">lsma = linreg(wt3, 200, 0)</code>, and pivot support/resistance breaks.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <CheckCircle className="w-4 h-4" /> Long, Short & Opposite Signal TP
          </div>
          <p className="text-slate-400 leading-relaxed">
            Triggers Long on <code className="text-slate-200">enter3 | enter5 | enter6 | enter7</code> and Short on <code className="text-slate-200">senter3</code> / Market High crossunder. Closes TP automatically on opposite signal and sets SL at <code className="text-slate-200">3x ATR(14)</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
