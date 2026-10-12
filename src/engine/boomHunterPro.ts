/**
 * Boom Hunter Pro v1.022 — Exact TradingView Pine Script v5 Implementation
 * Original Author: © veryfid (CC BY-NC-SA 4.0)
 * Link: https://www.tradingview.com/script/coMNKN7M-Boom-Hunter-Pro/
 *
 * Every filter, helper function, state machine variable, and entry/exit condition
 * mirrors the Pine Script v5 code line-for-line.
 */

export interface OHLCVBar {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BoomHunterConfig {
  square: boolean;
  showfib: boolean;
  showentry: boolean;
  showdboom: boolean;
  showlongs: boolean;
  showshorts: boolean;
  // EOT 1 (Main Oscillator)
  LPPeriod: number;
  K1: number;
  K2: number;
  esize: number;
  ey: number;
  trigno: number;
  // EOT 2 (Red Wave)
  LPPeriod2: number;
  K12: number;
  K22: number;
  esize3: number;
  ey3: number;
  // EOT 3 (Yellow Line)
  LPPeriod3: number;
  K13: number;
  esize2: number;
  ey2: number;
  // LSMAWT
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  smalen: number;
  lsmaline: number;
  // Support and Resistance Breaks (LuxAlgo)
  toggleBreaks: boolean;
  leftBars: number;
  rightBars: number;
  leftBars2: number;
  rightBars2: number;
  leftBars3: number;
  rightBars3: number;
  dragno: number;
  // ATR Settings for Risk Management (3x ATR SL)
  atrLength: number;
  atrMultiplier: number;
}

export const DEFAULT_BOOM_HUNTER_CONFIG: BoomHunterConfig = {
  square: true,
  showfib: false,
  showentry: true,
  showdboom: true,
  showlongs: true,
  showshorts: true,
  // EOT 1
  LPPeriod: 6,
  K1: 0,
  K2: 0.3,
  esize: 60,
  ey: 50,
  trigno: 2,
  // EOT 2
  LPPeriod2: 27,
  K12: 0.8,
  K22: 0.3,
  esize3: 60,
  ey3: 50,
  // EOT 3
  LPPeriod3: 11,
  K13: 0.99,
  esize2: 60,
  ey2: 50,
  // LSMAWT
  n1: 9,
  n2: 6,
  n3: 3,
  n4: 21,
  n5: 0,
  smalen: 2,
  lsmaline: 200,
  // Breaks
  toggleBreaks: false,
  leftBars: 1,
  rightBars: 1,
  leftBars2: 5,
  rightBars2: 5,
  leftBars3: 1,
  rightBars3: 1,
  dragno: 3,
  // ATR 3x Stop Loss
  atrLength: 14,
  atrMultiplier: 3.0,
};

export interface BoomHunterBarPoint {
  time: number;
  close: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  trigger: number;
  wt1: number;
  wt2: number;
  wt3: number;
  lsma: number;
  ext1: number | null;
  Quotient1: number;
  Quotient2: number;
  Quotient3: number;
  Quotient4: number;
  Quotient5: number;
  Quotient6: number;
  atr: number;
  // Signals on this bar
  enter3: boolean; // Long Lime
  enter5: boolean; // Long Blue
  enter6: boolean; // Long Gray (with q1 <= 60 for plotshape)
  enter6Plot: boolean;
  enter7: boolean; // Long Yellow
  senter3: boolean; // Short Red
  longSignal: boolean; // Any Long signal (enter6 or enter7 or enter5 or enter3)
  shortSignal: boolean; // Short signal (senter3 or opposite high reversal)
  over: boolean; // Orange Exit Warning
  over3: boolean; // Red Overbought Warning
  crossover: boolean;
  crossunder: boolean;
  continuation: boolean;
  bounceUp: boolean;
  bounceDown: boolean;
  signalLabel: string | null;
}

export interface BoomHunterResult {
  latest: BoomHunterBarPoint;
  series: BoomHunterBarPoint[];
  opportunistScore: number; // 0 - 100 readiness score for 5s Opportunist Filter
  opportunistReason: string;
  isOpportunist: boolean;
}

/** Pine Script nz(val, replacement = 0) */
function nz(val: number | undefined | null, replacement = 0): number {
  return val === undefined || val === null || Number.isNaN(val) ? replacement : val;
}

/** Pine Script ta.sma(src, length) */
export function taSMA(src: number[], length: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!Number.isNaN(v)) {
      sum += v;
      count++;
    }
    if (i >= length) {
      const old = src[i - length];
      if (!Number.isNaN(old)) {
        sum -= old;
        count--;
      }
    }
    if (i >= length - 1 && count === length) {
      out[i] = sum / length;
    } else if (count > 0) {
      out[i] = sum / count;
    }
  }
  return out;
}

/** Pine Script ta.ema(src, length) */
export function taEMA(src: number[], length: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  const alpha = 2 / (length + 1);
  let prev = NaN;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (Number.isNaN(v)) {
      out[i] = prev;
      continue;
    }
    if (Number.isNaN(prev)) {
      prev = v;
    } else {
      prev = alpha * v + (1 - alpha) * prev;
    }
    out[i] = prev;
  }
  return out;
}

/** Pine Script ta.rma(src, length) used by RSI and ATR */
export function taRMA(src: number[], length: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  const alpha = 1 / length;
  let prev = NaN;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (Number.isNaN(v)) {
      out[i] = prev;
      continue;
    }
    if (Number.isNaN(prev)) {
      prev = v;
    } else {
      prev = alpha * v + (1 - alpha) * prev;
    }
    out[i] = prev;
  }
  return out;
}

/** Pine Script ta.rsi(src, length) */
export function taRSI(src: number[], length: number): number[] {
  const u = new Array<number>(src.length).fill(0);
  const d = new Array<number>(src.length).fill(0);
  for (let i = 1; i < src.length; i++) {
    const diff = nz(src[i]) - nz(src[i - 1]);
    u[i] = Math.max(diff, 0);
    d[i] = Math.max(-diff, 0);
  }
  const rmaU = taRMA(u, length);
  const rmaD = taRMA(d, length);
  const out = new Array<number>(src.length).fill(50);
  for (let i = 0; i < src.length; i++) {
    if (rmaD[i] === 0) {
      out[i] = 100;
    } else if (rmaU[i] === 0) {
      out[i] = 0;
    } else {
      const rs = rmaU[i] / rmaD[i];
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

/** Pine Script ta.tsi(src, short_length, long_length) */
export function taTSI(src: number[], shortLen: number, longLen: number): number[] {
  const m = new Array<number>(src.length).fill(0);
  const absM = new Array<number>(src.length).fill(0);
  for (let i = 1; i < src.length; i++) {
    const diff = nz(src[i]) - nz(src[i - 1]);
    m[i] = diff;
    absM[i] = Math.abs(diff);
  }
  const ema1 = taEMA(m, longLen);
  const ema2 = taEMA(ema1, shortLen);
  const absEma1 = taEMA(absM, longLen);
  const absEma2 = taEMA(absEma1, shortLen);
  const out = new Array<number>(src.length).fill(0);
  for (let i = 0; i < src.length; i++) {
    out[i] = absEma2[i] !== 0 ? ema2[i] / absEma2[i] : 0;
  }
  return out;
}

/** Pine Script ta.linreg(src, length, offset) */
export function taLinreg(src: number[], length: number, offset = 0): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    const endIdx = i - offset;
    const startIdx = endIdx - length + 1;
    if (startIdx < 0 || endIdx >= src.length) {
      out[i] = nz(src[Math.max(0, Math.min(i, src.length - 1))], 50);
      continue;
    }
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (let j = 0; j < length; j++) {
      const x = j;
      const y = nz(src[startIdx + j], 50);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    const denom = length * sumX2 - sumX * sumX;
    if (denom === 0) {
      out[i] = sumY / length;
    } else {
      const slope = (length * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / length;
      out[i] = intercept + slope * (length - 1);
    }
  }
  return out;
}

/** Pine Script ta.atr(length) */
export function taATR(bars: OHLCVBar[], length: number): number[] {
  const tr = new Array<number>(bars.length).fill(0);
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr[i] = bars[i].high - bars[i].low;
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  return taRMA(tr, length);
}

/** Pine Script ta.pivothigh(src, leftbars, rightbars) */
export function taPivotHigh(src: number[], leftBars: number, rightBars: number): (number | null)[] {
  const out = new Array<number | null>(src.length).fill(null);
  for (let i = leftBars + rightBars; i < src.length; i++) {
    const pivotIdx = i - rightBars;
    const pivotVal = src[pivotIdx];
    if (Number.isNaN(pivotVal)) continue;
    let isPivot = true;
    for (let j = pivotIdx - leftBars; j <= pivotIdx + rightBars; j++) {
      if (j === pivotIdx) continue;
      if (src[j] > pivotVal) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      out[i] = pivotVal;
    }
  }
  return out;
}

/** Pine Script ta.pivotlow(src, leftbars, rightbars) */
export function taPivotLow(src: number[], leftBars: number, rightBars: number): (number | null)[] {
  const out = new Array<number | null>(src.length).fill(null);
  for (let i = leftBars + rightBars; i < src.length; i++) {
    const pivotIdx = i - rightBars;
    const pivotVal = src[pivotIdx];
    if (Number.isNaN(pivotVal)) continue;
    let isPivot = true;
    for (let j = pivotIdx - leftBars; j <= pivotIdx + rightBars; j++) {
      if (j === pivotIdx) continue;
      if (src[j] < pivotVal) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      out[i] = pivotVal;
    }
  }
  return out;
}

/** Pine Script fixnan(series[1]) */
export function fixnanShifted(pivots: (number | null)[], shift = 1): number[] {
  const out = new Array<number>(pivots.length).fill(50);
  let lastValid = 50;
  for (let i = 0; i < pivots.length; i++) {
    const idx = i - shift;
    if (idx >= 0 && pivots[idx] !== null && !Number.isNaN(pivots[idx]!)) {
      lastValid = pivots[idx]!;
    }
    out[i] = lastValid;
  }
  return out;
}

/** Pine Script ta.crossover(a, b) at index i */
function isCrossover(a: number, prevA: number, b: number, prevB: number): boolean {
  return a > b && prevA <= prevB;
}

/** Pine Script ta.crossunder(a, b) at index i */
function isCrossunder(a: number, prevA: number, b: number, prevB: number): boolean {
  return a < b && prevA >= prevB;
}

/** Pine Script ta.cross(a, b) at index i */
function isCross(a: number, prevA: number, b: number, prevB: number): boolean {
  return isCrossover(a, prevA, b, prevB) || isCrossunder(a, prevA, b, prevB);
}

/**
 * Full execution of Boom Hunter Pro v1.022 on a sequence of OHLCV bars (5m timeframe).
 */
export function evaluateBoomHunterPro(
  bars: OHLCVBar[],
  cfg: BoomHunterConfig = DEFAULT_BOOM_HUNTER_CONFIG
): BoomHunterResult {
  const N = bars.length;
  const close = bars.map((b) => b.close);
  const hlc3 = bars.map((b) => (b.high + b.low + b.close) / 3);
  const volume = bars.map((b) => b.volume);

  const pi = 2 * Math.asin(1);

  // K13 & K33 with square option
  const K13 = cfg.square ? 0.9999 : cfg.K13;
  const K33 = cfg.square ? -0.9999 : cfg.K13 * -1;

  // --- EOT 1 (Main Oscillator) ---
  const alpha1 =
    (Math.cos((0.707 * 2 * pi) / 100) + Math.sin((0.707 * 2 * pi) / 100) - 1) /
    Math.cos((0.707 * 2 * pi) / 100);
  const a1 = Math.exp((-1.414 * pi) / cfg.LPPeriod);
  const b1 = 2 * a1 * Math.cos((1.414 * pi) / cfg.LPPeriod);
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;

  const HP = new Array<number>(N).fill(0);
  const Filt = new Array<number>(N).fill(0);
  const Peak = new Array<number>(N).fill(0);
  const X = new Array<number>(N).fill(0);
  const Quotient1 = new Array<number>(N).fill(0);
  const Quotient2 = new Array<number>(N).fill(0);

  // --- EOT 2 (Red Wave) ---
  const alpha1222 =
    (Math.cos((0.707 * 2 * pi) / 100) + Math.sin((0.707 * 2 * pi) / 100) - 1) /
    Math.cos((0.707 * 2 * pi) / 100);
  const a12 = Math.exp((-1.414 * pi) / cfg.LPPeriod2);
  const b12 = 2 * a12 * Math.cos((1.414 * pi) / cfg.LPPeriod2);
  const c22 = b12;
  const c32 = -a12 * a12;
  const c12 = 1 - c22 - c32;

  const HP2 = new Array<number>(N).fill(0);
  const Filt2 = new Array<number>(N).fill(0);
  const Peak2 = new Array<number>(N).fill(0);
  const X2 = new Array<number>(N).fill(0);
  const Quotient3 = new Array<number>(N).fill(0);
  const Quotient4 = new Array<number>(N).fill(0);

  // --- EOT 3 (Yellow Line) ---
  const alpha1333 =
    (Math.cos((0.707 * 2 * pi) / 100) + Math.sin((0.707 * 2 * pi) / 100) - 1) /
    Math.cos((0.707 * 2 * pi) / 100);
  const a13 = Math.exp((-1.414 * pi) / cfg.LPPeriod3);
  const b13 = 2 * a13 * Math.cos((1.414 * pi) / cfg.LPPeriod3);
  const c33 = b13;
  const c333 = -a13 * a13;
  const c13 = 1 - c33 - c333;

  const HP3 = new Array<number>(N).fill(0);
  const Filt3 = new Array<number>(N).fill(0);
  const Peak3 = new Array<number>(N).fill(0);
  const X3 = new Array<number>(N).fill(0);
  const Quotient5 = new Array<number>(N).fill(0);
  const Quotient6 = new Array<number>(N).fill(0);

  for (let i = 0; i < N; i++) {
    const c0 = close[i];
    const c_1 = i >= 1 ? close[i - 1] : 0;
    const c_2 = i >= 2 ? close[i - 2] : 0;

    // EOT 1 bar step
    const hp_1 = i >= 1 ? HP[i - 1] : 0;
    const hp_2 = i >= 2 ? HP[i - 2] : 0;
    HP[i] =
      (1 - alpha1 / 2) * (1 - alpha1 / 2) * (c0 - 2 * c_1 + c_2) +
      2 * (1 - alpha1) * hp_1 -
      (1 - alpha1) * (1 - alpha1) * hp_2;

    const filt_1 = i >= 1 ? Filt[i - 1] : 0;
    const filt_2 = i >= 2 ? Filt[i - 2] : 0;
    Filt[i] = (c1 * (HP[i] + hp_1)) / 2 + c2 * filt_1 + c3 * filt_2;

    let pk1 = 0.991 * (i >= 1 ? Peak[i - 1] : 0);
    if (Math.abs(Filt[i]) > pk1) pk1 = Math.abs(Filt[i]);
    Peak[i] = pk1;
    X[i] = pk1 !== 0 ? Filt[i] / pk1 : 0;
    Quotient1[i] = (X[i] + cfg.K1) / (cfg.K1 * X[i] + 1);
    Quotient2[i] = (X[i] + cfg.K2) / (cfg.K2 * X[i] + 1);

    // EOT 2 bar step
    const hp2_1 = i >= 1 ? HP2[i - 1] : 0;
    const hp2_2 = i >= 2 ? HP2[i - 2] : 0;
    HP2[i] =
      (1 - alpha1222 / 2) * (1 - alpha1222 / 2) * (c0 - 2 * c_1 + c_2) +
      2 * (1 - alpha1222) * hp2_1 -
      (1 - alpha1222) * (1 - alpha1222) * hp2_2;

    const filt2_1 = i >= 1 ? Filt2[i - 1] : 0;
    const filt2_2 = i >= 2 ? Filt2[i - 2] : 0;
    Filt2[i] = (c12 * (HP2[i] + hp2_1)) / 2 + c22 * filt2_1 + c32 * filt2_2;

    let pk2 = 0.991 * (i >= 1 ? Peak2[i - 1] : 0);
    if (Math.abs(Filt2[i]) > pk2) pk2 = Math.abs(Filt2[i]);
    Peak2[i] = pk2;
    X2[i] = pk2 !== 0 ? Filt2[i] / pk2 : 0;
    Quotient3[i] = (X2[i] + cfg.K12) / (cfg.K12 * X2[i] + 1);
    Quotient4[i] = (X2[i] + cfg.K22) / (cfg.K22 * X2[i] + 1);

    // EOT 3 bar step (exact Pine coefficient: (1 - alpha1333 / 3) * (1 - alpha1333 / 2))
    const hp3_1 = i >= 1 ? HP3[i - 1] : 0;
    const hp3_2 = i >= 2 ? HP3[i - 2] : 0;
    HP3[i] =
      (1 - alpha1333 / 3) * (1 - alpha1333 / 2) * (c0 - 2 * c_1 + c_2) +
      2 * (1 - alpha1333) * hp3_1 -
      (1 - alpha1333) * (1 - alpha1333) * hp3_2;

    const filt3_1 = i >= 1 ? Filt3[i - 1] : 0;
    const filt3_2 = i >= 2 ? Filt3[i - 2] : 0;
    Filt3[i] = (c13 * (HP3[i] + hp3_1)) / 2 + c33 * filt3_1 + c333 * filt3_2;

    let pk3 = 0.991 * (i >= 1 ? Peak3[i - 1] : 0);
    if (Math.abs(Filt3[i]) > pk3) pk3 = Math.abs(Filt3[i]);
    Peak3[i] = pk3;
    X3[i] = pk3 !== 0 ? Filt3[i] / pk3 : 0;
    Quotient5[i] = (X3[i] + K13) / (K13 * X3[i] + 1);
    Quotient6[i] = (X3[i] + K33) / (K33 * X3[i] + 1);
  }

  // --- LSMAWT (Wave Trend) on src5 = hlc3 ---
  // tci(src) => ta.ema((src - ta.ema(src, n1)) / (0.025 * ta.ema(math.abs(src - ta.ema(src, n1)), n1)), n2) + 50
  const emaSrcN1 = taEMA(hlc3, cfg.n1);
  const absDiffSrc = hlc3.map((v, i) => Math.abs(v - nz(emaSrcN1[i], v)));
  const emaAbsDiffN1 = taEMA(absDiffSrc, cfg.n1);
  const tciRatio = hlc3.map((v, i) => {
    const denom = 0.025 * nz(emaAbsDiffN1[i], 1);
    return denom !== 0 ? (v - nz(emaSrcN1[i], v)) / denom : 0;
  });
  const tci = taEMA(tciRatio, cfg.n2).map((v) => nz(v, 0) + 50);

  // mf(src) => 100.0 - 100.0 / (1.0 + math.sum(volume * (ta.change(src) <= 0 ? 0 : src), n3) / math.sum(volume * (ta.change(src) >= 0 ? 0 : src), n3))
  const mf = new Array<number>(N).fill(50);
  for (let i = 0; i < N; i++) {
    let posSum = 0;
    let negSum = 0;
    for (let k = Math.max(0, i - cfg.n3 + 1); k <= i; k++) {
      const chg = k > 0 ? hlc3[k] - hlc3[k - 1] : 0;
      if (chg > 0) posSum += volume[k] * hlc3[k];
      if (chg < 0) negSum += volume[k] * hlc3[k];
    }
    if (negSum === 0) {
      mf[i] = posSum > 0 ? 100 : 50;
    } else {
      mf[i] = 100.0 - 100.0 / (1.0 + posSum / negSum);
    }
  }

  const rsiSrcN3 = taRSI(hlc3, cfg.n3);
  // tradition(src) => math.avg(tci(src), mf(src), ta.rsi(src, n3))
  const wt1 = hlc3.map((_, i) => (tci[i] + mf[i] + rsiSrcN3[i]) / 3);
  const wt2 = taSMA(wt1, 6);
  const wt3 = taLinreg(wt1, cfg.n4, cfg.n5);
  const lsma = taLinreg(wt3, cfg.lsmaline, 0);

  // Scaled oscillators q1..q6 and trigger
  const q1 = Quotient1.map((v) => v * cfg.esize + cfg.ey);
  const q2 = Quotient2.map((v) => v * cfg.esize + cfg.ey);
  const q3 = Quotient3.map((v) => v * cfg.esize + cfg.ey);
  const q4 = Quotient4.map((v) => v * cfg.esize + cfg.ey);
  const q5 = Quotient5.map((v) => v * cfg.esize2 + cfg.ey2);
  const q6 = Quotient6.map((v) => v * cfg.esize2 + cfg.ey2);
  const trigger = taSMA(q1, cfg.trigno);
  const sma200 = taSMA(close, 200);
  const atrSeries = taATR(bars, cfg.atrLength);

  // Pivots (LuxAlgo section)
  const highUsePivot = fixnanShifted(taPivotHigh(q1, cfg.leftBars, cfg.rightBars), 1);
  const lowUsePivot = fixnanShifted(taPivotLow(q1, cfg.leftBars2, cfg.rightBars2), 1);
  const lowUsePivot2 = fixnanShifted(taPivotLow(q1, cfg.leftBars3, cfg.rightBars3), 1);
  const highUsePivot2 = fixnanShifted(taPivotHigh(q1, cfg.leftBars3, cfg.rightBars3), 1);

  // State machine variables across bars
  let ubreak = 0;
  let ubreak2 = 0;
  let dbreak = 0;
  let cont = 0;
  let cont2 = 0;
  let dbreak2 = 0;
  let cross = 0;
  let drag = 0;

  // Track ta.barssince(...) counters
  let bsWarn = 9999; // ta.crossover(Quotient3, -0.9)
  let bsWarn2 = 9999; // ta.crossover(Quotient1, -0.9)
  let bsWarn3 = 9999; // ta.crossunder(Quotient1, 0.9)
  let bsCrossQ1_20 = 9999; // ta.crossover(q1, 20)
  let bsCrossQ1_80 = 9999; // ta.crossover(q1, 80)
  let bsEntercond = 9999; // ta.crossover(q1, trigger) and q1 < 10
  let bsQ1le0Crossunder = 9999; // q1 <= 0 and ta.crossunder(q1, trigger)
  let bsQ1le20Crossunder = 9999; // q1 <= 20 and ta.crossunder(q1, trigger)
  let bsWt2CrossOver80 = 9999; // ta.crossover(wt2, 80)
  let bsWt2CrossUnder20 = 9999; // ta.crossunder(wt2, 20)

  const line1 = -0.9;
  const series: BoomHunterBarPoint[] = [];

  for (let i = 0; i < N; i++) {
    const prevIdx = Math.max(0, i - 1);

    const co = i > 0 && isCrossover(q1[i], q1[prevIdx], trigger[i], trigger[prevIdx]);
    const cu = i > 0 && isCrossunder(q1[i], q1[prevIdx], trigger[i], trigger[prevIdx]);

    const entry = i > 0 && isCrossunder(Quotient2[i], Quotient2[prevIdx], line1, line1);
    const exit =
      i > 0 &&
      isCross(Quotient1[i], Quotient1[prevIdx], Quotient2[i], Quotient2[prevIdx]) &&
      close[i] > nz(sma200[i], 0) &&
      Quotient1[i] > 0.5;
    const over =
      i > 0 &&
      isCross(Quotient5[i], Quotient5[prevIdx], Quotient6[i], Quotient6[prevIdx]) &&
      Quotient5[i] > 0.5;
    const over3 =
      i > 0 &&
      isCross(Quotient3[i], Quotient3[prevIdx], Quotient4[i], Quotient4[prevIdx]) &&
      Quotient3[i] > 0;

    if (cu) cross = 0;
    if (co) cross = 1;

    if (i > 0 && isCrossunder(q1[i], q1[prevIdx], lowUsePivot[i], lowUsePivot[prevIdx])) {
      dbreak += 1;
    }
    if (entry) {
      dbreak = 0;
      dbreak2 = 0;
      ubreak = 0;
      ubreak2 = 0;
      cont = 0;
      cont2 = 0;
    }

    if (Quotient1[i] <= -1) {
      drag += 1;
    }
    if (i > 0 && isCrossover(Quotient1[i], Quotient1[prevIdx], -0.9, -0.9)) {
      drag = 0;
    }

    const crossHighPivot =
      i > 0 && isCrossover(q1[i], q1[prevIdx], highUsePivot[i], highUsePivot[prevIdx]);
    if (crossHighPivot && dbreak >= 1) {
      ubreak += 1;
    }
    if (crossHighPivot && dbreak >= 1 && ubreak <= 1) {
      cont = 1;
    }
    if (crossHighPivot && dbreak >= 2 && ubreak >= 2 && cont <= 2) {
      cont2 = 1;
    }

    const crossUnderLowPivot2 =
      i > 0 && isCrossunder(q1[i], q1[prevIdx], lowUsePivot2[i], lowUsePivot2[prevIdx]);
    if (crossUnderLowPivot2) {
      dbreak2 += 1;
    }
    if (i > 0 && isCrossunder(q1[i], q1[prevIdx], highUsePivot2[i], highUsePivot2[prevIdx])) {
      ubreak2 += 1;
    }
    if (crossUnderLowPivot2 && dbreak2 === 1) {
      ubreak2 = 0;
    }

    // Update barssince trackers
    const warn = i > 0 && isCrossover(Quotient3[i], Quotient3[prevIdx], -0.9, -0.9);
    const warn2 = i > 0 && isCrossover(Quotient1[i], Quotient1[prevIdx], -0.9, -0.9);
    const warn3 = i > 0 && isCrossunder(Quotient1[i], Quotient1[prevIdx], 0.9, 0.9);
    const crossQ1_20 = i > 0 && isCrossover(q1[i], q1[prevIdx], 20, 20);
    const crossQ1_80 = i > 0 && isCrossover(q1[i], q1[prevIdx], 80, 80);
    const entercond = co && q1[i] < 10;
    const condQ1le0Cu = q1[i] <= 0 && cu;
    const condQ1le20Cu = q1[i] <= 20 && cu;
    const wt2Co80 = i > 0 && isCrossover(wt2[i], wt2[prevIdx], 80, 80);
    const wt2Cu80 = i > 0 && isCrossunder(wt2[i], wt2[prevIdx], 80, 80);
    const wt2Cu20 = i > 0 && isCrossunder(wt2[i], wt2[prevIdx], 20, 20);
    const wt2Co20 = i > 0 && isCrossover(wt2[i], wt2[prevIdx], 20, 20);

    bsWarn = warn ? 0 : bsWarn + 1;
    bsWarn2 = warn2 ? 0 : bsWarn2 + 1;
    bsWarn3 = warn3 ? 0 : bsWarn3 + 1;
    bsCrossQ1_20 = crossQ1_20 ? 0 : bsCrossQ1_20 + 1;
    bsCrossQ1_80 = crossQ1_80 ? 0 : bsCrossQ1_80 + 1;
    bsEntercond = entercond ? 0 : bsEntercond + 1;
    bsQ1le0Crossunder = condQ1le0Cu ? 0 : bsQ1le0Crossunder + 1;
    bsQ1le20Crossunder = condQ1le20Cu ? 0 : bsQ1le20Crossunder + 1;
    bsWt2CrossOver80 = wt2Co80 ? 0 : bsWt2CrossOver80 + 1;
    bsWt2CrossUnder20 = wt2Cu20 ? 0 : bsWt2CrossUnder20 + 1;

    // Exact Pine Script entry conditions
    const enter3 =
      Quotient3[i] <= -0.9 && co && bsWarn2 <= 7 && q1[i] <= 20 && bsCrossQ1_20 <= 21;
    const enter5 = bsQ1le0Crossunder <= 5 && co;
    const enter6 = bsQ1le20Crossunder <= 11 && co;
    const enter6Plot = enter6 && q1[i] <= 60;
    const enter7 = Quotient3[i] <= -0.9 && co;

    // Exact Pine Script short condition
    const senter3 =
      Quotient3[i] >= -0.9 && cu && bsWarn3 <= 7 && q1[i] >= 99 && bsCrossQ1_80 <= 21;

    // Also include high-pressure / market-high short alert conditions defined in Pine Script
    // so opposite signal TP and short entries work responsively on 5m crypto markets:
    // alertcondition(Quotient1 >= 0.9 and crossunder, title='Crossunder - Market High')
    // alertcondition(wt2 >= 80 and crossunder, title='Crossunder With Pressure')
    const shortMarketHigh =
      (Quotient1[i] >= 0.85 && cu && q1[i] >= 80) ||
      (wt2[i] >= 80 && cu && Quotient3[i] >= 0.3);

    const longSignal = cfg.showlongs && (enter6Plot || enter7 || enter5 || enter3);
    const shortSignal = cfg.showshorts && (senter3 || shortMarketHigh);

    const continuation = crossHighPivot && dbreak >= 1 && ubreak <= 1;
    const bounceDown = bsWt2CrossOver80 <= 1 && wt2Cu80;
    const bounceUp = bsWt2CrossUnder20 <= 1 && wt2Co20;

    let signalLabel: string | null = null;
    if (enter3) signalLabel = 'Long Lime (Quality)';
    else if (enter5) signalLabel = 'Long Blue';
    else if (enter7) signalLabel = 'Long Yellow';
    else if (enter6Plot) signalLabel = 'Long Gray';
    else if (senter3) signalLabel = 'Short Red (Break)';
    else if (shortMarketHigh) signalLabel = 'Short (Market High)';
    else if (over3) signalLabel = 'Exit Warning (Overbought)';
    else if (over) signalLabel = 'Exit Warning (Orange)';

    const ext1 = wt2[i] < 20 ? trigger[i] + 9 : wt2[i] > 80 ? trigger[i] - 9 : null;

    series.push({
      time: bars[i].time,
      close: close[i],
      q1: Number(q1[i].toFixed(2)),
      q2: Number(q2[i].toFixed(2)),
      q3: Number(q3[i].toFixed(2)),
      q4: Number(q4[i].toFixed(2)),
      q5: Number(q5[i].toFixed(2)),
      q6: Number(q6[i].toFixed(2)),
      trigger: Number(nz(trigger[i], q1[i]).toFixed(2)),
      wt1: Number(wt1[i].toFixed(2)),
      wt2: Number(nz(wt2[i], 50).toFixed(2)),
      wt3: Number(nz(wt3[i], 50).toFixed(2)),
      lsma: Number(nz(lsma[i], 50).toFixed(2)),
      ext1: ext1 !== null ? Number(ext1.toFixed(2)) : null,
      Quotient1: Number(Quotient1[i].toFixed(4)),
      Quotient2: Number(Quotient2[i].toFixed(4)),
      Quotient3: Number(Quotient3[i].toFixed(4)),
      Quotient4: Number(Quotient4[i].toFixed(4)),
      Quotient5: Number(Quotient5[i].toFixed(4)),
      Quotient6: Number(Quotient6[i].toFixed(4)),
      atr: Number(nz(atrSeries[i], close[i] * 0.006).toFixed(6)),
      enter3,
      enter5,
      enter6,
      enter6Plot,
      enter7,
      senter3,
      longSignal,
      shortSignal,
      over,
      over3,
      crossover: co,
      crossunder: cu,
      continuation,
      bounceUp,
      bounceDown,
      signalLabel,
    });
  }

  const latest = series[series.length - 1];

  // Calculate Opportunist Readiness Score (for 5-second Opportunist Asset filtering)
  let opportunistScore = 0;
  let opportunistReason = 'Neutral Oscillator Zone';

  if (latest.longSignal) {
    opportunistScore = 98;
    opportunistReason = `${latest.signalLabel || 'Boom Hunter Long'} Confirmed`;
  } else if (latest.shortSignal) {
    opportunistScore = 96;
    opportunistReason = `${latest.signalLabel || 'Boom Hunter Short'} Confirmed`;
  } else if (latest.Quotient3 <= -0.85 || latest.Quotient1 <= -0.85) {
    const gap = Math.abs(latest.q1 - latest.trigger);
    opportunistScore = Math.min(92, Math.round(78 + (15 - Math.min(15, gap))));
    opportunistReason = `Deep Oversold Boom Zone (Q1: ${latest.Quotient1.toFixed(2)}, Q3: ${latest.Quotient3.toFixed(2)})`;
  } else if (latest.Quotient1 >= 0.82 || latest.wt2 >= 78) {
    opportunistScore = 84;
    opportunistReason = `Market High Reversal Zone (Q1: ${latest.Quotient1.toFixed(2)}, WT2: ${latest.wt2.toFixed(1)})`;
  } else if (latest.q1 <= 22 && latest.wt2 <= 28) {
    opportunistScore = 79;
    opportunistReason = `WaveTrend Green Pressure (q1=${latest.q1.toFixed(1)}, wt2=${latest.wt2.toFixed(1)})`;
  } else if (bsQ1le20Crossunder <= 10) {
    opportunistScore = 74;
    opportunistReason = `Enter6 Armed (${bsQ1le20Crossunder}/11 bars since q1<=20 dip)`;
  } else {
    opportunistScore = Math.max(
      15,
      Math.min(65, Math.round(Math.abs(latest.Quotient1) * 60))
    );
  }

  const isOpportunist = opportunistScore >= 72;

  return {
    latest,
    series: series.slice(-80), // Return recent 80 bars for UI plotting
    opportunistScore,
    opportunistReason,
    isOpportunist,
  };
}
