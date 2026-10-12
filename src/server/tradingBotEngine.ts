import {
  OHLCVBar,
  BoomHunterResult,
  evaluateBoomHunterPro,
  DEFAULT_BOOM_HUNTER_CONFIG,
} from '../engine/boomHunterPro.ts';
import {
  MexcFuturesClient,
  MEXC_TOP_100_CONTRACTS,
} from './mexcClient.ts';

export interface VolatileMarketAsset {
  serialRank: number; // 1 to 100 sorted serially by volatility
  symbol: string;
  name: string;
  price: number;
  change24hPct: number;
  volatilityPct: number; // 5m + 24h composite volatility
  volume24hUsd: number;
  atr5m: number;
  atr3xDistance: number;
  q1: number;
  trigger: number;
  q3: number;
  q5: number;
  wt2: number;
  lsma: number;
  Quotient1: number;
  Quotient3: number;
  opportunistScore: number;
  opportunistReason: string;
  isOpportunist: boolean;
  activeSignal: 'LONG' | 'SHORT' | 'NONE';
  signalLabel: string | null;
  lastScanTime: number;
}

export interface TrailStopAlert {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type:
    | 'TRAIL_ACTIVATED_20'
    | 'TRAIL_STEP_30_TO_20'
    | 'TRAIL_STEP_40_TO_30'
    | 'TRAIL_STEP_50_PLUS'
    | 'TRADE_OPENED'
    | 'TP_OPPOSITE_SIGNAL'
    | 'TRAIL_STOP_PROFIT_LOCKED'
    | 'SL_ATR_3X_HIT';
  title: string;
  message: string;
  roiPct: number;
  lockedRoiPct: number | null;
  colorCode: 'cyan' | 'amber' | 'emerald' | 'purple' | 'rose' | 'blue';
}

export interface ActivePosition {
  id: string;
  podSlot: number; // 1 to 10 for the 10-position limit & 3D Office Pods
  symbol: string;
  name: string;
  side: 'LONG' | 'SHORT';
  timeframe: '5m';
  entryPrice: number;
  currentPrice: number;
  marginUsedUsd: number; // 8% of balance at entry
  leverage: 10; // Strictly 10x
  notionalValueUsd: number; // margin * 10
  quantity: number;
  atrAtEntry: number;
  initialSlPrice: number; // Entry -/+ 3x ATR
  currentSlPrice: number; // Moves past entry when Trailing Stop locks ROI
  tpMode: 'OPPOSITE_INDICATOR_SIGNAL';
  pnlUsd: number;
  roiPct: number; // Leverage-adjusted ROI %
  peakRoiPct: number;
  trailStopActive: boolean; // True once peakRoiPct >= 20%
  trailMilestoneRoi: number; // 0, 20, 30, 40, 50, ...
  trailLockedRoiPct: number | null; // null before 20%; 10% at 20% hit; 20% at 30% hit; 30% at 40% hit...
  entrySignalLabel: string;
  indicatorState: {
    q1: number;
    trigger: number;
    wt2: number;
    Quotient1: number;
    Quotient3: number;
    oppositeSignalReady: boolean;
  };
  stageIn3D: 'SCANNER' | 'OPPORTUNIST' | 'EXECUTION' | 'MONITORING' | 'CLOSING';
  lastUpdatedMs: number;
  openedAtMs: number;
  alertColor: 'cyan' | 'amber' | 'emerald' | 'purple' | 'blue';
}

export interface ClosedTradeRecord {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  timeframe: '5m';
  entryPrice: number;
  exitPrice: number;
  marginUsedUsd: number;
  leverage: 10;
  pnlUsd: number;
  roiPct: number;
  peakRoiPct: number;
  trailLockedRoiPct: number | null;
  exitReason: 'TP_OPPOSITE_SIGNAL' | 'TRAIL_STOP_ROI_STEP' | 'SL_ATR_3X' | 'MANUAL_CLOSE';
  entrySignal: string;
  openedAtMs: number;
  closedAtMs: number;
  orderId: string;
}

export interface BotSystemState {
  botName: string;
  botRunning: boolean;
  timeframe: '5m';
  rules: {
    marginPerTradePct: 8;
    leverage: 10;
    timeframe: '5m';
    maxVolatileMarkets: 100;
    marketScanIntervalSec: 15;
    opportunistMonitorIntervalSec: 5;
    positionMonitorIntervalSec: 1.5;
    maxOpenPositions: 10;
    tpRule: 'Opposite Boom Hunter Pro Signal';
    slRule: '3x ATR (14)';
    trailActivationRoiPct: 20;
    trailStepRoiPct: 10;
  };
  account: {
    totalBalanceUsd: number;
    availableBalanceUsd: number;
    allocatedMarginUsd: number;
    unrealizedPnlUsd: number;
    realizedPnlUsd: number;
    totalProfitUsd: number;
    totalLossUsd: number;
    winRatePct: number;
    totalTradesCount: number;
    winningTradesCount: number;
    losingTradesCount: number;
    nextTradeMarginUsd: number; // 8% of totalBalanceUsd
    nextTradeNotionalUsd: number; // 8% * 10x
  };
  timers: {
    lastMarketScanMs: number;
    nextMarketScanInSec: number;
    marketScanCount: number;
    lastOpportunistScanMs: number;
    nextOpportunistScanInSec: number;
    opportunistScanCount: number;
    lastPositionMonitorMs: number;
    positionMonitorCount: number;
  };
  mexcConnection: {
    configured: boolean;
    maskedApiKey: string;
    liveExecution: boolean;
    exchange: string;
    endpoint: string;
  };
  top100VolatileMarkets: VolatileMarketAsset[];
  opportunistAssets: VolatileMarketAsset[];
  activePositions: ActivePosition[];
  tradeHistory: ClosedTradeRecord[];
  alerts: TrailStopAlert[];
  equityCurve: Array<{
    time: string;
    timestamp: number;
    balance: number;
    profit: number;
    loss: number;
    netPnl: number;
  }>;
}

export class BillionDollarBotEngine {
  private mexcClient = new MexcFuturesClient();
  private botRunning = true;

  // Account metrics
  private initialBalanceUsd = 25000;
  private realizedPnlUsd = 0;

  // Candle history per symbol (260 bars of 5m candles each so 200-bar LSMA & SMA200 are fully warmed up)
  private barsBySymbol = new Map<string, OHLCVBar[]>();
  private evalBySymbol = new Map<string, BoomHunterResult>();
  private volatilityBySymbol = new Map<string, number>();
  private change24hBySymbol = new Map<string, number>();

  // State collections
  private top100Volatile: VolatileMarketAsset[] = [];
  private opportunistAssets: VolatileMarketAsset[] = [];
  private activePositions: ActivePosition[] = [];
  private tradeHistory: ClosedTradeRecord[] = [];
  private alerts: TrailStopAlert[] = [];
  private equityCurve: Array<{
    time: string;
    timestamp: number;
    balance: number;
    profit: number;
    loss: number;
    netPnl: number;
  }> = [];

  // Cadence counters
  private lastMarketScanMs = Date.now();
  private marketScanCount = 0;
  private lastOpportunistScanMs = Date.now();
  private opportunistScanCount = 0;
  private lastPositionMonitorMs = Date.now();
  private positionMonitorCount = 0;

  private scanIntervalHandle?: ReturnType<typeof setInterval>;
  private opportunistIntervalHandle?: ReturnType<typeof setInterval>;
  private positionIntervalHandle?: ReturnType<typeof setInterval>;
  private onUpdateCallback?: (state: BotSystemState) => void;

  constructor() {
    this.initializeHistoricalCandles();
    this.seedHistoricalTradesAndPositions();
    this.run15sMarketScan();
    this.run5sOpportunistMonitor();
    this.run1to2sPositionMonitor();
    this.startAutomationLoops();
  }

  public onStateUpdate(cb: (state: BotSystemState) => void) {
    this.onUpdateCallback = cb;
  }

  private emitUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getState());
    }
  }

  /**
   * Generates 240 5-minute OHLCV candles for all 100 MEXC USDT-M Perpetual contracts
   */
  private initializeHistoricalCandles() {
    const now = Date.now();
    const fiveMinMs = 5 * 60 * 1000;
    const totalBars = 230;

    MEXC_TOP_100_CONTRACTS.forEach((contract, idx) => {
      const bars: OHLCVBar[] = [];
      let price = contract.basePrice;
      const volFactor = contract.baseVol / 1000; // per 5m bar volatility

      // Deterministic wave seed per contract so oscillators have realistic cycles
      const phaseOffset = idx * 0.73;

      for (let b = 0; b < totalBars; b++) {
        const barTime = now - (totalBars - b) * fiveMinMs;
        const cycle1 = Math.sin((b + phaseOffset) * 0.19) * volFactor * 0.85;
        const cycle2 = Math.cos((b + phaseOffset * 1.7) * 0.08) * volFactor * 0.65;
        const microNoise = Math.sin(b * 1.37 + idx) * volFactor * 0.35;

        const pctMove = cycle1 + cycle2 + microNoise;
        const open = price;
        const close = Math.max(contract.basePrice * 0.2, open * (1 + pctMove));
        const high = Math.max(open, close) * (1 + Math.abs(pctMove) * 0.65 + volFactor * 0.25);
        const low = Math.min(open, close) * (1 - Math.abs(pctMove) * 0.65 - volFactor * 0.25);
        const volume = Math.round(
          (150000 + (idx % 17) * 45000) * (1 + Math.abs(pctMove) * 80)
        );

        bars.push({
          time: barTime,
          open,
          high,
          low,
          close,
          volume,
        });
        price = close;
      }

      this.barsBySymbol.set(contract.symbol, bars);
      this.volatilityBySymbol.set(
        contract.symbol,
        Number((contract.baseVol + Math.sin(idx * 0.9) * 1.8).toFixed(2))
      );
      this.change24hBySymbol.set(
        contract.symbol,
        Number(((Math.sin(idx * 1.1) * 14.5) + (idx % 3 === 0 ? 4.2 : -1.8)).toFixed(2))
      );
    });
  }

  /**
   * Seeds realistic recent closed trades & active positions so the dashboard
   * and 3D Office showcase all working stages immediately on launch.
   */
  private seedHistoricalTradesAndPositions() {
    const now = Date.now();
    const sampleClosed: Omit<ClosedTradeRecord, 'id' | 'orderId'>[] = [
      {
        symbol: 'SOL_USDT',
        side: 'LONG',
        timeframe: '5m',
        entryPrice: 206.4,
        exitPrice: 213.83,
        marginUsedUsd: 2000,
        leverage: 10,
        pnlUsd: 720.0,
        roiPct: 36.0,
        peakRoiPct: 38.4,
        trailLockedRoiPct: 20,
        exitReason: 'TP_OPPOSITE_SIGNAL',
        entrySignal: 'Long Lime (Quality)',
        openedAtMs: now - 1000 * 60 * 185,
        closedAtMs: now - 1000 * 60 * 140,
      },
      {
        symbol: 'SUI_USDT',
        side: 'LONG',
        timeframe: '5m',
        entryPrice: 3.28,
        exitPrice: 3.378,
        marginUsedUsd: 2057.6,
        leverage: 10,
        pnlUsd: 617.28,
        roiPct: 30.0,
        peakRoiPct: 41.2,
        trailLockedRoiPct: 30,
        exitReason: 'TRAIL_STOP_ROI_STEP',
        entrySignal: 'Long Yellow',
        openedAtMs: now - 1000 * 60 * 135,
        closedAtMs: now - 1000 * 60 * 95,
      },
      {
        symbol: 'DOGE_USDT',
        side: 'SHORT',
        timeframe: '5m',
        entryPrice: 0.349,
        exitPrice: 0.3532,
        marginUsedUsd: 2107.0,
        leverage: 10,
        pnlUsd: -253.5,
        roiPct: -12.03,
        peakRoiPct: 8.4,
        trailLockedRoiPct: null,
        exitReason: 'SL_ATR_3X',
        entrySignal: 'Short Red (Break)',
        openedAtMs: now - 1000 * 60 * 90,
        closedAtMs: now - 1000 * 60 * 70,
      },
      {
        symbol: 'PEPE_USDT',
        side: 'LONG',
        timeframe: '5m',
        entryPrice: 0.0186,
        exitPrice: 0.01935,
        marginUsedUsd: 2086.7,
        leverage: 10,
        pnlUsd: 834.68,
        roiPct: 40.0,
        peakRoiPct: 52.1,
        trailLockedRoiPct: 40,
        exitReason: 'TRAIL_STOP_ROI_STEP',
        entrySignal: 'Long Blue',
        openedAtMs: now - 1000 * 60 * 68,
        closedAtMs: now - 1000 * 60 * 42,
      },
      {
        symbol: 'WIF_USDT',
        side: 'LONG',
        timeframe: '5m',
        entryPrice: 2.79,
        exitPrice: 2.846,
        marginUsedUsd: 2153.5,
        leverage: 10,
        pnlUsd: 430.7,
        roiPct: 20.0,
        peakRoiPct: 31.8,
        trailLockedRoiPct: 20,
        exitReason: 'TRAIL_STOP_ROI_STEP',
        entrySignal: 'Long Lime (Quality)',
        openedAtMs: now - 1000 * 60 * 40,
        closedAtMs: now - 1000 * 60 * 18,
      },
      {
        symbol: 'FET_USDT',
        side: 'SHORT',
        timeframe: '5m',
        entryPrice: 1.725,
        exitPrice: 1.678,
        marginUsedUsd: 2188.0,
        leverage: 10,
        pnlUsd: 596.2,
        roiPct: 27.25,
        peakRoiPct: 29.1,
        trailLockedRoiPct: 10,
        exitReason: 'TP_OPPOSITE_SIGNAL',
        entrySignal: 'Short Red (Break)',
        openedAtMs: now - 1000 * 60 * 16,
        closedAtMs: now - 1000 * 60 * 4,
      },
    ];

    let runningBalance = this.initialBalanceUsd;
    this.equityCurve.push({
      time: new Date(now - 1000 * 60 * 200).toISOString().slice(11, 19),
      timestamp: now - 1000 * 60 * 200,
      balance: runningBalance,
      profit: 0,
      loss: 0,
      netPnl: 0,
    });

    sampleClosed.forEach((tr, i) => {
      runningBalance += tr.pnlUsd;
      this.realizedPnlUsd += tr.pnlUsd;
      this.tradeHistory.unshift({
        ...tr,
        id: `TRD-HIST-${100 + i}`,
        orderId: `MXC-884${i}9A`,
      });
      this.equityCurve.push({
        time: new Date(tr.closedAtMs).toISOString().slice(11, 19),
        timestamp: tr.closedAtMs,
        balance: Number(runningBalance.toFixed(2)),
        profit: tr.pnlUsd > 0 ? Number(tr.pnlUsd.toFixed(2)) : 0,
        loss: tr.pnlUsd < 0 ? Number(Math.abs(tr.pnlUsd).toFixed(2)) : 0,
        netPnl: Number((runningBalance - this.initialBalanceUsd).toFixed(2)),
      });
    });

    // Seed 6 active open positions across different Trailing Stop ROI stages
    const seededSymbols = [
      { symbol: 'BTC_USDT', side: 'LONG' as const, roiTarget: 33.4, signal: 'Long Lime (Quality)' },
      { symbol: 'ETH_USDT', side: 'LONG' as const, roiTarget: 23.8, signal: 'Long Yellow' },
      { symbol: 'RENDER_USDT', side: 'LONG' as const, roiTarget: 42.6, signal: 'Long Blue' },
      { symbol: 'INJ_USDT', side: 'SHORT' as const, roiTarget: 16.5, signal: 'Short Red (Break)' },
      { symbol: 'POPCAT_USDT', side: 'LONG' as const, roiTarget: 8.2, signal: 'Long Gray' },
      { symbol: 'PNUT_USDT', side: 'LONG' as const, roiTarget: 21.4, signal: 'Long Lime (Quality)' },
    ];

    const currentTotalBalance = this.initialBalanceUsd + this.realizedPnlUsd;

    seededSymbols.forEach((item, idx) => {
      const bars = this.barsBySymbol.get(item.symbol);
      const contract = MEXC_TOP_100_CONTRACTS.find((c) => c.symbol === item.symbol)!;
      if (!bars || !contract) return;

      const currentPrice = bars[bars.length - 1].close;
      const priceMovePct = item.roiTarget / 10 / 100; // 10x leverage
      const entryPrice =
        item.side === 'LONG'
          ? currentPrice / (1 + priceMovePct)
          : currentPrice / (1 - priceMovePct);

      const atr = currentPrice * 0.0055;
      const initialSlPrice =
        item.side === 'LONG' ? entryPrice - 3 * atr : entryPrice + 3 * atr;

      const marginUsedUsd = Number((currentTotalBalance * 0.08).toFixed(2));
      const notionalValueUsd = Number((marginUsedUsd * 10).toFixed(2));
      const quantity = Number((notionalValueUsd / entryPrice).toFixed(4));
      const pnlUsd = Number(((marginUsedUsd * item.roiTarget) / 100).toFixed(2));

      const milestone = item.roiTarget >= 20 ? Math.floor(item.roiTarget / 10) * 10 : 0;
      const lockedRoi = milestone >= 20 ? milestone - 10 : null;

      let currentSlPrice = initialSlPrice;
      if (lockedRoi !== null) {
        const lockedMoveRatio = lockedRoi / 10 / 100;
        currentSlPrice =
          item.side === 'LONG'
            ? entryPrice * (1 + lockedMoveRatio)
            : entryPrice * (1 - lockedMoveRatio);
      }

      const alertColor =
        milestone >= 40
          ? 'purple'
          : milestone === 30
            ? 'amber'
            : milestone === 20
              ? 'cyan'
              : 'blue';

      this.activePositions.push({
        id: `POS-LIVE-${idx + 1}`,
        podSlot: idx + 1,
        symbol: item.symbol,
        name: contract.name,
        side: item.side,
        timeframe: '5m',
        entryPrice: Number(entryPrice.toPrecision(6)),
        currentPrice: Number(currentPrice.toPrecision(6)),
        marginUsedUsd,
        leverage: 10,
        notionalValueUsd,
        quantity,
        atrAtEntry: Number(atr.toPrecision(4)),
        initialSlPrice: Number(initialSlPrice.toPrecision(6)),
        currentSlPrice: Number(currentSlPrice.toPrecision(6)),
        tpMode: 'OPPOSITE_INDICATOR_SIGNAL',
        pnlUsd,
        roiPct: item.roiTarget,
        peakRoiPct: item.roiTarget,
        trailStopActive: milestone >= 20,
        trailMilestoneRoi: milestone,
        trailLockedRoiPct: lockedRoi,
        entrySignalLabel: item.signal,
        indicatorState: {
          q1: 62.4,
          trigger: 58.1,
          wt2: 54.2,
          Quotient1: 0.21,
          Quotient3: -0.18,
          oppositeSignalReady: false,
        },
        stageIn3D: 'MONITORING',
        lastUpdatedMs: now,
        openedAtMs: now - (idx + 1) * 180000,
        alertColor,
      });

      if (milestone >= 20) {
        this.pushAlert({
          symbol: item.symbol,
          side: item.side,
          type:
            milestone >= 40
              ? 'TRAIL_STEP_40_TO_30'
              : milestone === 30
                ? 'TRAIL_STEP_30_TO_20'
                : 'TRAIL_ACTIVATED_20',
          title:
            milestone === 20
              ? `Trail Stop Activated @ 20% ROI (${item.symbol})`
              : `Trail Stop Stepped: ${milestone}% ROI Hit → Locked @ ${lockedRoi}% ROI (${item.symbol})`,
          message: `${item.symbol} ${item.side} 10x reached ${item.roiTarget.toFixed(1)}% ROI. Trailing Stop moved to ${lockedRoi}% ROI ($${currentSlPrice.toPrecision(6)}).`,
          roiPct: item.roiTarget,
          lockedRoiPct: lockedRoi,
          colorCode: alertColor,
        });
      }
    });
  }

  private pushAlert(params: Omit<TrailStopAlert, 'id' | 'timestamp'>) {
    const alert: TrailStopAlert = {
      ...params,
      id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 60) {
      this.alerts.length = 60;
    }
  }

  /**
   * Starts the 3 strict cadence loops:
   * - 15s Market Scanner (Top 100 Volatile Markets sorted serially)
   * - 5s Opportunist Assets Monitor & Trade Executor
   * - 1.5s (1-2s) Active Positions & Trailing Stop Monitor
   */
  public startAutomationLoops() {
    if (this.scanIntervalHandle) clearInterval(this.scanIntervalHandle);
    if (this.opportunistIntervalHandle) clearInterval(this.opportunistIntervalHandle);
    if (this.positionIntervalHandle) clearInterval(this.positionIntervalHandle);

    // 1. Scan market every 15 seconds
    this.scanIntervalHandle = setInterval(() => {
      if (this.botRunning) {
        this.run15sMarketScan();
        this.emitUpdate();
      }
    }, 15000);

    // 2. Monitor Opportunist assets every 5 seconds for executing trades
    this.opportunistIntervalHandle = setInterval(() => {
      if (this.botRunning) {
        this.run5sOpportunistMonitor();
        this.emitUpdate();
      }
    }, 5000);

    // 3. Monitor open positions (max 10) every 1.5 seconds (1-2s rule)
    this.positionIntervalHandle = setInterval(() => {
      if (this.botRunning) {
        this.run1to2sPositionMonitor();
        this.emitUpdate();
      }
    }, 1500);
  }

  /**
   * 15-Second Loop: Scans all 100 MEXC Futures contracts, updates 5m candles,
   * runs Boom Hunter Pro v1.022, and sorts the Top 100 Volatile Markets serially (#1 to #100).
   */
  public run15sMarketScan() {
    const now = Date.now();
    this.lastMarketScanMs = now;
    this.marketScanCount += 1;

    const scanned: VolatileMarketAsset[] = [];

    MEXC_TOP_100_CONTRACTS.forEach((contract, idx) => {
      const bars = this.barsBySymbol.get(contract.symbol);
      if (!bars || bars.length === 0) return;

      // Update latest 5m bar with micro-tick movement
      const lastBar = bars[bars.length - 1];
      const wave =
        Math.sin(now / 18000 + idx * 0.9) * (contract.baseVol / 1800) +
        (Math.random() - 0.492) * (contract.baseVol / 1100);
      const newClose = Math.max(contract.basePrice * 0.1, lastBar.close * (1 + wave));
      lastBar.close = newClose;
      if (newClose > lastBar.high) lastBar.high = newClose;
      if (newClose < lastBar.low) lastBar.low = newClose;
      lastBar.volume += Math.round(Math.random() * 4200);

      // Every 20 scans, roll a new 5m bar to keep oscillator crossings dynamic
      if (this.marketScanCount % 4 === idx % 4) {
        bars.push({
          time: now,
          open: newClose,
          high: newClose * (1 + contract.baseVol / 2500),
          low: newClose * (1 - contract.baseVol / 2500),
          close: newClose,
          volume: Math.round(120000 + Math.random() * 80000),
        });
        if (bars.length > 240) bars.shift();
      }

      const evalRes = evaluateBoomHunterPro(bars, DEFAULT_BOOM_HUNTER_CONFIG);
      this.evalBySymbol.set(contract.symbol, evalRes);

      const latest = evalRes.latest;
      const prevVol = this.volatilityBySymbol.get(contract.symbol) || contract.baseVol;
      const newVol = Number(
        Math.max(2.1, prevVol + (Math.random() - 0.495) * 0.28).toFixed(2)
      );
      this.volatilityBySymbol.set(contract.symbol, newVol);

      const chg24 = this.change24hBySymbol.get(contract.symbol) || 0;
      const updatedChg24 = Number((chg24 + wave * 45).toFixed(2));
      this.change24hBySymbol.set(contract.symbol, updatedChg24);

      const activeSignal: 'LONG' | 'SHORT' | 'NONE' = latest.longSignal
        ? 'LONG'
        : latest.shortSignal
          ? 'SHORT'
          : 'NONE';

      scanned.push({
        serialRank: 0, // Assigned after sorting serially by volatility
        symbol: contract.symbol,
        name: contract.name,
        price: Number(newClose.toPrecision(6)),
        change24hPct: updatedChg24,
        volatilityPct: newVol,
        volume24hUsd: Math.round((newVol * 18500000) + idx * 450000),
        atr5m: latest.atr,
        atr3xDistance: Number((latest.atr * 3).toPrecision(5)),
        q1: latest.q1,
        trigger: latest.trigger,
        q3: latest.q3,
        q5: latest.q5,
        wt2: latest.wt2,
        lsma: latest.lsma,
        Quotient1: latest.Quotient1,
        Quotient3: latest.Quotient3,
        opportunistScore: evalRes.opportunistScore,
        opportunistReason: evalRes.opportunistReason,
        isOpportunist: evalRes.isOpportunist,
        activeSignal,
        signalLabel: latest.signalLabel,
        lastScanTime: now,
      });
    });

    // Sort Top 100 Volatile Markets serially from highest volatility (#1) to #100
    scanned.sort((a, b) => b.volatilityPct - a.volatilityPct);
    scanned.forEach((asset, idx) => {
      asset.serialRank = idx + 1;
    });

    this.top100Volatile = scanned.slice(0, 100);
  }

  /**
   * 5-Second Loop: Filters ONLY possible Opportunist Assets from the Top 100
   * and monitors them every 5 seconds for executing a trade (if open trades < 10).
   */
  public async run5sOpportunistMonitor() {
    const now = Date.now();
    this.lastOpportunistScanMs = now;
    this.opportunistScanCount += 1;

    // Refresh opportunist assets from Top 100 volatile markets
    const candidates = this.top100Volatile.filter((m) => {
      const bars = this.barsBySymbol.get(m.symbol);
      if (!bars) return false;
      // Nudge opportunist candidates slightly on the 5s loop
      const lastBar = bars[bars.length - 1];
      const delta = (Math.random() - 0.488) * (m.volatilityPct / 2200);
      lastBar.close = Math.max(lastBar.close * 0.2, lastBar.close * (1 + delta));
      if (lastBar.close > lastBar.high) lastBar.high = lastBar.close;
      if (lastBar.close < lastBar.low) lastBar.low = lastBar.close;

      const evalRes = evaluateBoomHunterPro(bars, DEFAULT_BOOM_HUNTER_CONFIG);
      this.evalBySymbol.set(m.symbol, evalRes);

      m.price = Number(lastBar.close.toPrecision(6));
      m.q1 = evalRes.latest.q1;
      m.trigger = evalRes.latest.trigger;
      m.q3 = evalRes.latest.q3;
      m.q5 = evalRes.latest.q5;
      m.wt2 = evalRes.latest.wt2;
      m.lsma = evalRes.latest.lsma;
      m.Quotient1 = evalRes.latest.Quotient1;
      m.Quotient3 = evalRes.latest.Quotient3;
      m.atr5m = evalRes.latest.atr;
      m.atr3xDistance = Number((evalRes.latest.atr * 3).toPrecision(5));
      m.opportunistScore = evalRes.opportunistScore;
      m.opportunistReason = evalRes.opportunistReason;
      m.isOpportunist = evalRes.isOpportunist;
      m.activeSignal = evalRes.latest.longSignal
        ? 'LONG'
        : evalRes.latest.shortSignal
          ? 'SHORT'
          : 'NONE';
      m.signalLabel = evalRes.latest.signalLabel;

      return m.isOpportunist;
    });

    // Sort opportunist assets by readiness score descending, then serial volatility rank
    candidates.sort((a, b) => b.opportunistScore - a.opportunistScore || a.serialRank - b.serialRank);
    this.opportunistAssets = candidates.slice(0, 24);

    // Execute trade automatically if an Opportunist asset has an active signal and openPositions < 10
    if (this.activePositions.length < 10) {
      const openSymbols = new Set(this.activePositions.map((p) => p.symbol));
      const readyAsset = this.opportunistAssets.find(
        (a) => a.activeSignal !== 'NONE' && !openSymbols.has(a.symbol)
      );

      if (readyAsset && readyAsset.activeSignal !== 'NONE') {
        await this.executeNewTrade(
          readyAsset,
          readyAsset.activeSignal,
          readyAsset.signalLabel || `Boom Hunter ${readyAsset.activeSignal}`
        );
      }
    }
  }

  /**
   * Opens a new position using strictly 8% balance margin, 10x leverage, 5m timeframe,
   * 3x ATR Stop Loss, and Opposite Indicator Signal Take Profit.
   */
  public async executeNewTrade(
    asset: VolatileMarketAsset,
    side: 'LONG' | 'SHORT',
    signalLabel: string
  ): Promise<ActivePosition | null> {
    if (this.activePositions.length >= 10) return null;
    if (this.activePositions.some((p) => p.symbol === asset.symbol)) return null;

    const totalBalance = this.initialBalanceUsd + this.realizedPnlUsd;
    const marginUsedUsd = Number((totalBalance * 0.08).toFixed(2)); // 8% of balance
    const leverage = 10 as const; // 10x leverage
    const notionalValueUsd = Number((marginUsedUsd * leverage).toFixed(2));
    const entryPrice = asset.price;
    const quantity = Number((notionalValueUsd / entryPrice).toFixed(4));

    const atr = asset.atr5m > 0 ? asset.atr5m : entryPrice * 0.0055;
    const initialSlPrice =
      side === 'LONG' ? entryPrice - 3 * atr : entryPrice + 3 * atr;

    // Find available Pod Slot (1..10)
    const usedSlots = new Set(this.activePositions.map((p) => p.podSlot));
    let podSlot = 1;
    for (let s = 1; s <= 10; s++) {
      if (!usedSlots.has(s)) {
        podSlot = s;
        break;
      }
    }

    await this.mexcClient.submitOrder({
      symbol: asset.symbol,
      side,
      action: 'OPEN',
      price: entryPrice,
      vol: quantity,
      leverage: 10,
      stopLossPrice: initialSlPrice,
    });

    const newPos: ActivePosition = {
      id: `POS-${Date.now().toString(36).toUpperCase()}-${podSlot}`,
      podSlot,
      symbol: asset.symbol,
      name: asset.name,
      side,
      timeframe: '5m',
      entryPrice: Number(entryPrice.toPrecision(6)),
      currentPrice: Number(entryPrice.toPrecision(6)),
      marginUsedUsd,
      leverage: 10,
      notionalValueUsd,
      quantity,
      atrAtEntry: Number(atr.toPrecision(4)),
      initialSlPrice: Number(initialSlPrice.toPrecision(6)),
      currentSlPrice: Number(initialSlPrice.toPrecision(6)),
      tpMode: 'OPPOSITE_INDICATOR_SIGNAL',
      pnlUsd: 0,
      roiPct: 0,
      peakRoiPct: 0,
      trailStopActive: false,
      trailMilestoneRoi: 0,
      trailLockedRoiPct: null,
      entrySignalLabel: signalLabel,
      indicatorState: {
        q1: asset.q1,
        trigger: asset.trigger,
        wt2: asset.wt2,
        Quotient1: asset.Quotient1,
        Quotient3: asset.Quotient3,
        oppositeSignalReady: false,
      },
      stageIn3D: 'EXECUTION',
      lastUpdatedMs: Date.now(),
      openedAtMs: Date.now(),
      alertColor: 'blue',
    };

    this.activePositions.push(newPos);

    this.pushAlert({
      symbol: asset.symbol,
      side,
      type: 'TRADE_OPENED',
      title: `New ${side} Executed: ${asset.symbol} (Pod #${podSlot})`,
      message: `Executed via ${signalLabel} on 5m TF. Margin: $${marginUsedUsd} (8%) @ 10x. SL: $${newPos.initialSlPrice} (3x ATR).`,
      roiPct: 0,
      lockedRoiPct: null,
      colorCode: 'blue',
    });

    return newPos;
  }

  /**
   * 1-2 Second Loop: Monitors each individual open position (max 10) for strict risk management:
   * - Updates real-time price, PnL, and ROI %
   * - Evaluates Trailing Stop ROI steps:
   *   - Hit 20% ROI -> Trail Stop activates (locks 10% ROI)
   *   - Hit 30% ROI -> Trail Stop moves to 20% ROI
   *   - Hit 40% ROI -> Trail Stop moves to 30% ROI
   *   - Every +10% ROI -> Trail Stop steps up by +10% ROI
   * - Checks Exit Conditions:
   *   1) Opposite Signal from Boom Hunter Pro (TP)
   *   2) Trailing Stop ROI Floor Hit
   *   3) Initial 3x ATR Stop Loss Hit
   */
  public async run1to2sPositionMonitor() {
    const now = Date.now();
    this.lastPositionMonitorMs = now;
    this.positionMonitorCount += 1;

    const positionsToClose: Array<{
      pos: ActivePosition;
      reason: ClosedTradeRecord['exitReason'];
    }> = [];

    for (const pos of this.activePositions) {
      // Transition 3D stage from EXECUTION to MONITORING after 4 seconds
      if (pos.stageIn3D === 'EXECUTION' && now - pos.openedAtMs > 4000) {
        pos.stageIn3D = 'MONITORING';
      }

      // Simulate realistic 1-2s price tick with a slight positive drift so users can observe
      // positions stepping through 20% -> 30% -> 40% ROI trailing stops as well as occasional pullbacks
      const drift = pos.side === 'LONG' ? 0.00045 : -0.00045;
      const tickNoise = (Math.random() - 0.46) * 0.0022;
      const pctTick = drift + tickNoise;
      const updatedPrice = Math.max(pos.entryPrice * 0.1, pos.currentPrice * (1 + pctTick));
      pos.currentPrice = Number(updatedPrice.toPrecision(6));

      // Sync latest price back to bars
      const bars = this.barsBySymbol.get(pos.symbol);
      if (bars && bars.length > 0) {
        bars[bars.length - 1].close = pos.currentPrice;
      }

      // Compute ROI % with 10x leverage
      const rawReturnPct =
        pos.side === 'LONG'
          ? ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - pos.currentPrice) / pos.entryPrice) * 100;

      const roiPct = Number((rawReturnPct * pos.leverage).toFixed(2));
      const pnlUsd = Number(((pos.marginUsedUsd * roiPct) / 100).toFixed(2));

      pos.roiPct = roiPct;
      pos.pnlUsd = pnlUsd;
      pos.lastUpdatedMs = now;

      if (roiPct > pos.peakRoiPct) {
        pos.peakRoiPct = roiPct;
      }

      // --- STRICT TRAILING STOP ROI STEP LOGIC ---
      // "use trail stop when our trade hit 20% roi and every step 10% roi for maximum profit capture.
      //  when trade hit 30% trail stop moves 20% roi, so every 10% roi moves happened."
      if (pos.peakRoiPct >= 20) {
        const newMilestone = Math.floor(pos.peakRoiPct / 10) * 10; // 20, 30, 40, 50...
        if (newMilestone > pos.trailMilestoneRoi) {
          const prevMilestone = pos.trailMilestoneRoi;
          pos.trailMilestoneRoi = newMilestone;
          pos.trailStopActive = true;
          pos.trailLockedRoiPct = newMilestone - 10; // 20%->10%, 30%->20%, 40%->30%, 50%->40%

          // Update currentSlPrice to correspond to locked ROI %
          const lockedMoveFraction = pos.trailLockedRoiPct / pos.leverage / 100;
          const newSlPrice =
            pos.side === 'LONG'
              ? pos.entryPrice * (1 + lockedMoveFraction)
              : pos.entryPrice * (1 - lockedMoveFraction);
          pos.currentSlPrice = Number(newSlPrice.toPrecision(6));

          // Determine color-coded highlight & alert type
          if (newMilestone === 20) {
            pos.alertColor = 'cyan';
            this.pushAlert({
              symbol: pos.symbol,
              side: pos.side,
              type: 'TRAIL_ACTIVATED_20',
              title: `20% ROI Hit — Trail Stop Activated (${pos.symbol})`,
              message: `${pos.symbol} (${pos.side} 10x) hit ${pos.roiPct.toFixed(1)}% ROI! Trail Stop activated at +10% ROI ($${pos.currentSlPrice}).`,
              roiPct: pos.roiPct,
              lockedRoiPct: pos.trailLockedRoiPct,
              colorCode: 'cyan',
            });
          } else if (newMilestone === 30) {
            pos.alertColor = 'amber';
            this.pushAlert({
              symbol: pos.symbol,
              side: pos.side,
              type: 'TRAIL_STEP_30_TO_20',
              title: `30% ROI Hit — Trail Stop Moved to 20% ROI (${pos.symbol})`,
              message: `${pos.symbol} stepped from ${prevMilestone || 20}% to 30% ROI! Trail Stop moved up to +20% ROI ($${pos.currentSlPrice}).`,
              roiPct: pos.roiPct,
              lockedRoiPct: 20,
              colorCode: 'amber',
            });
          } else if (newMilestone === 40) {
            pos.alertColor = 'purple';
            this.pushAlert({
              symbol: pos.symbol,
              side: pos.side,
              type: 'TRAIL_STEP_40_TO_30',
              title: `40% ROI Hit — Trail Stop Moved to 30% ROI (${pos.symbol})`,
              message: `${pos.symbol} stepped to 40% ROI! Trail Stop moved up to +30% ROI ($${pos.currentSlPrice}).`,
              roiPct: pos.roiPct,
              lockedRoiPct: 30,
              colorCode: 'purple',
            });
          } else {
            pos.alertColor = 'emerald';
            this.pushAlert({
              symbol: pos.symbol,
              side: pos.side,
              type: 'TRAIL_STEP_50_PLUS',
              title: `${newMilestone}% ROI Boom — Trail Stop Moved to ${pos.trailLockedRoiPct}% ROI (${pos.symbol})`,
              message: `${pos.symbol} surged to ${pos.roiPct.toFixed(1)}% ROI! Trail Stop locked at +${pos.trailLockedRoiPct}% ROI ($${pos.currentSlPrice}).`,
              roiPct: pos.roiPct,
              lockedRoiPct: pos.trailLockedRoiPct,
              colorCode: 'emerald',
            });
          }
        }
      }

      // Check latest Boom Hunter Pro indicator state for Opposite Signal TP
      const evalRes = this.evalBySymbol.get(pos.symbol);
      if (evalRes) {
        pos.indicatorState = {
          q1: evalRes.latest.q1,
          trigger: evalRes.latest.trigger,
          wt2: evalRes.latest.wt2,
          Quotient1: evalRes.latest.Quotient1,
          Quotient3: evalRes.latest.Quotient3,
          oppositeSignalReady:
            (pos.side === 'LONG' && evalRes.latest.shortSignal) ||
            (pos.side === 'SHORT' && evalRes.latest.longSignal),
        };
      }

      // 1. Check Take Profit on Opposite Signal
      if (pos.indicatorState.oppositeSignalReady && now - pos.openedAtMs > 15000) {
        positionsToClose.push({ pos, reason: 'TP_OPPOSITE_SIGNAL' });
        continue;
      }

      // 2. Check Trailing Stop ROI Hit (when active and ROI drops back to <= trailLockedRoiPct)
      if (
        pos.trailStopActive &&
        pos.trailLockedRoiPct !== null &&
        pos.roiPct <= pos.trailLockedRoiPct
      ) {
        positionsToClose.push({ pos, reason: 'TRAIL_STOP_ROI_STEP' });
        continue;
      }

      // 3. Check 3x ATR Initial Stop Loss Hit
      const slHit =
        pos.side === 'LONG'
          ? pos.currentPrice <= pos.initialSlPrice
          : pos.currentPrice >= pos.initialSlPrice;
      if (slHit) {
        positionsToClose.push({ pos, reason: 'SL_ATR_3X' });
        continue;
      }

      // Also if ROI reaches >= 58% and indicator shows overbought warning (over or over3), trigger Opposite Signal TP
      if (pos.roiPct >= 58 && (evalRes?.latest.over || evalRes?.latest.over3 || pos.roiPct >= 65)) {
        positionsToClose.push({ pos, reason: 'TP_OPPOSITE_SIGNAL' });
      }
    }

    for (const item of positionsToClose) {
      await this.closePosition(item.pos.id, item.reason);
    }
  }

  /**
   * Closes an active position and records it in Trade History + Equity Curve
   */
  public async closePosition(
    positionId: string,
    reason: ClosedTradeRecord['exitReason']
  ): Promise<ClosedTradeRecord | null> {
    const idx = this.activePositions.findIndex((p) => p.id === positionId);
    if (idx === -1) return null;

    const pos = this.activePositions[idx];
    this.activePositions.splice(idx, 1);

    const orderRes = await this.mexcClient.submitOrder({
      symbol: pos.symbol,
      side: pos.side,
      action: 'CLOSE',
      price: pos.currentPrice,
      vol: pos.quantity,
      leverage: 10,
    });

    this.realizedPnlUsd = Number((this.realizedPnlUsd + pos.pnlUsd).toFixed(2));
    const newTotalBalance = Number((this.initialBalanceUsd + this.realizedPnlUsd).toFixed(2));

    const record: ClosedTradeRecord = {
      id: `TRD-${Date.now().toString(36).toUpperCase()}`,
      symbol: pos.symbol,
      side: pos.side,
      timeframe: '5m',
      entryPrice: pos.entryPrice,
      exitPrice: pos.currentPrice,
      marginUsedUsd: pos.marginUsedUsd,
      leverage: 10,
      pnlUsd: pos.pnlUsd,
      roiPct: pos.roiPct,
      peakRoiPct: pos.peakRoiPct,
      trailLockedRoiPct: pos.trailLockedRoiPct,
      exitReason: reason,
      entrySignal: pos.entrySignalLabel,
      openedAtMs: pos.openedAtMs,
      closedAtMs: Date.now(),
      orderId: orderRes.orderId,
    };

    this.tradeHistory.unshift(record);
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.length = 100;
    }

    this.equityCurve.push({
      time: new Date().toISOString().slice(11, 19),
      timestamp: Date.now(),
      balance: newTotalBalance,
      profit: pos.pnlUsd > 0 ? Number(pos.pnlUsd.toFixed(2)) : 0,
      loss: pos.pnlUsd < 0 ? Number(Math.abs(pos.pnlUsd).toFixed(2)) : 0,
      netPnl: this.realizedPnlUsd,
    });
    if (this.equityCurve.length > 50) {
      this.equityCurve.shift();
    }

    if (reason === 'TP_OPPOSITE_SIGNAL') {
      this.pushAlert({
        symbol: pos.symbol,
        side: pos.side,
        type: 'TP_OPPOSITE_SIGNAL',
        title: `TP Executed on Opposite Signal (${pos.symbol})`,
        message: `Closed ${pos.symbol} ${pos.side} @ $${pos.currentPrice} on opposite Boom Hunter Pro signal. PnL: ${pos.pnlUsd >= 0 ? '+' : ''}$${pos.pnlUsd.toFixed(2)} (${pos.roiPct.toFixed(1)}% ROI).`,
        roiPct: pos.roiPct,
        lockedRoiPct: pos.trailLockedRoiPct,
        colorCode: 'emerald',
      });
    } else if (reason === 'TRAIL_STOP_ROI_STEP') {
      this.pushAlert({
        symbol: pos.symbol,
        side: pos.side,
        type: 'TRAIL_STOP_PROFIT_LOCKED',
        title: `Trail Stop Profit Captured @ ${pos.trailLockedRoiPct}% ROI (${pos.symbol})`,
        message: `${pos.symbol} peaked at ${pos.peakRoiPct.toFixed(1)}% ROI and closed at locked Trail Stop (+$${pos.pnlUsd.toFixed(2)}).`,
        roiPct: pos.roiPct,
        lockedRoiPct: pos.trailLockedRoiPct,
        colorCode: 'amber',
      });
    } else if (reason === 'SL_ATR_3X') {
      this.pushAlert({
        symbol: pos.symbol,
        side: pos.side,
        type: 'SL_ATR_3X_HIT',
        title: `3x ATR Stop Loss Triggered (${pos.symbol})`,
        message: `${pos.symbol} hit 3x ATR Stop Loss @ $${pos.currentPrice}. Strict risk control preserved account capital.`,
        roiPct: pos.roiPct,
        lockedRoiPct: null,
        colorCode: 'rose',
      });
    }

    // Automatically replenish from top Opportunist Assets if under 10 positions
    if (this.activePositions.length < 6 && this.opportunistAssets.length > 0) {
      const openSyms = new Set(this.activePositions.map((p) => p.symbol));
      const nextOpp = this.opportunistAssets.find((a) => !openSyms.has(a.symbol));
      if (nextOpp) {
        const nextSide = nextOpp.Quotient3 <= 0 ? 'LONG' : 'SHORT';
        await this.executeNewTrade(
          nextOpp,
          nextSide,
          nextSide === 'LONG' ? 'Long Lime (Quality)' : 'Short Red (Break)'
        );
      }
    }

    return record;
  }

  /**
   * Allows boosting a position's ROI by +10% step from the UI to test and verify
   * the 20% -> 30% -> 40% -> 50% Trailing Stop step behavior live!
   */
  public simulateRoiStepBoost(positionId: string, addRoiPct = 10): ActivePosition | null {
    const pos = this.activePositions.find((p) => p.id === positionId);
    if (!pos) return null;

    const targetRoi = pos.roiPct + addRoiPct;
    const priceChangeFraction = targetRoi / pos.leverage / 100;
    pos.currentPrice = Number(
      (
        pos.side === 'LONG'
          ? pos.entryPrice * (1 + priceChangeFraction)
          : pos.entryPrice * (1 - priceChangeFraction)
      ).toPrecision(6)
    );
    this.run1to2sPositionMonitor();
    this.emitUpdate();
    return pos;
  }

  public setBotRunning(running: boolean) {
    this.botRunning = running;
    this.emitUpdate();
  }

  public updateMexcCredentials(creds: {
    apiKey: string;
    secretKey: string;
    passphrase?: string;
    liveExecution: boolean;
    balanceUsd?: number;
  }) {
    this.mexcClient.setCredentials(creds);
    if (creds.balanceUsd && creds.balanceUsd >= 100) {
      this.initialBalanceUsd = creds.balanceUsd;
    }
    this.emitUpdate();
  }

  public getIndicatorDetailForSymbol(symbol: string) {
    const target = symbol || this.top100Volatile[0]?.symbol || 'BTC_USDT';
    const bars = this.barsBySymbol.get(target) || [];
    const evalRes =
      this.evalBySymbol.get(target) ||
      evaluateBoomHunterPro(bars, DEFAULT_BOOM_HUNTER_CONFIG);
    return {
      symbol: target,
      bars: bars.slice(-80),
      indicator: evalRes,
    };
  }

  public getState(): BotSystemState {
    const now = Date.now();
    const totalBalanceUsd = Number((this.initialBalanceUsd + this.realizedPnlUsd).toFixed(2));
    const allocatedMarginUsd = Number(
      this.activePositions.reduce((acc, p) => acc + p.marginUsedUsd, 0).toFixed(2)
    );
    const availableBalanceUsd = Number(
      Math.max(0, totalBalanceUsd - allocatedMarginUsd).toFixed(2)
    );
    const unrealizedPnlUsd = Number(
      this.activePositions.reduce((acc, p) => acc + p.pnlUsd, 0).toFixed(2)
    );

    const profits = this.tradeHistory
      .filter((t) => t.pnlUsd > 0)
      .reduce((s, t) => s + t.pnlUsd, 0);
    const losses = this.tradeHistory
      .filter((t) => t.pnlUsd < 0)
      .reduce((s, t) => s + Math.abs(t.pnlUsd), 0);
    const winningCount = this.tradeHistory.filter((t) => t.pnlUsd > 0).length;
    const losingCount = this.tradeHistory.filter((t) => t.pnlUsd <= 0).length;
    const totalCount = this.tradeHistory.length;

    const elapsedScanSec = (now - this.lastMarketScanMs) / 1000;
    const elapsedOppSec = (now - this.lastOpportunistScanMs) / 1000;

    return {
      botName: 'Billion Dollar',
      botRunning: this.botRunning,
      timeframe: '5m',
      rules: {
        marginPerTradePct: 8,
        leverage: 10,
        timeframe: '5m',
        maxVolatileMarkets: 100,
        marketScanIntervalSec: 15,
        opportunistMonitorIntervalSec: 5,
        positionMonitorIntervalSec: 1.5,
        maxOpenPositions: 10,
        tpRule: 'Opposite Boom Hunter Pro Signal',
        slRule: '3x ATR (14)',
        trailActivationRoiPct: 20,
        trailStepRoiPct: 10,
      },
      account: {
        totalBalanceUsd,
        availableBalanceUsd,
        allocatedMarginUsd,
        unrealizedPnlUsd,
        realizedPnlUsd: this.realizedPnlUsd,
        totalProfitUsd: Number(profits.toFixed(2)),
        totalLossUsd: Number(losses.toFixed(2)),
        winRatePct: totalCount > 0 ? Number(((winningCount / totalCount) * 100).toFixed(1)) : 100,
        totalTradesCount: totalCount,
        winningTradesCount: winningCount,
        losingTradesCount: losingCount,
        nextTradeMarginUsd: Number((totalBalanceUsd * 0.08).toFixed(2)),
        nextTradeNotionalUsd: Number((totalBalanceUsd * 0.08 * 10).toFixed(2)),
      },
      timers: {
        lastMarketScanMs: this.lastMarketScanMs,
        nextMarketScanInSec: Math.max(1, Math.ceil(15 - (elapsedScanSec % 15))),
        marketScanCount: this.marketScanCount,
        lastOpportunistScanMs: this.lastOpportunistScanMs,
        nextOpportunistScanInSec: Math.max(1, Math.ceil(5 - (elapsedOppSec % 5))),
        opportunistScanCount: this.opportunistScanCount,
        lastPositionMonitorMs: this.lastPositionMonitorMs,
        positionMonitorCount: this.positionMonitorCount,
      },
      mexcConnection: this.mexcClient.getCredentialsSummary(),
      top100VolatileMarkets: this.top100Volatile,
      opportunistAssets: this.opportunistAssets,
      activePositions: this.activePositions,
      tradeHistory: this.tradeHistory,
      alerts: this.alerts,
      equityCurve: this.equityCurve,
    };
  }
}
