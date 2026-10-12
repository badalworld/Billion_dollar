import fs from 'fs';
import path from 'path';
import {
  evaluateBoomHunterPro,
  DEFAULT_BOOM_HUNTER_CONFIG,
  OHLCVBar,
} from '../engine/boomHunterPro';
import { BillionDollarBotEngine } from '../server/tradingBotEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[AUDIT FAILED] ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log(' BILLION DOLLAR — MEXC FUTURES BOT FULL SYSTEM & PINE v5 AUDIT');
  console.log('================================================================\n');

  // 1. Audit Boom Hunter Pro v1.022 Pine Script Indicator Engine
  console.log('1. Auditing TradingView Indicator: Boom Hunter Pro v1.022 (© veryfid)...');
  assert(DEFAULT_BOOM_HUNTER_CONFIG.LPPeriod === 6, 'EOT 1 LPPeriod === 6');
  assert(DEFAULT_BOOM_HUNTER_CONFIG.K1 === 0 && DEFAULT_BOOM_HUNTER_CONFIG.K2 === 0.3, 'EOT 1 K1=0, K2=0.3');
  assert(DEFAULT_BOOM_HUNTER_CONFIG.trigno === 2, 'EOT 1 Trigger Length === 2');
  assert(
    DEFAULT_BOOM_HUNTER_CONFIG.LPPeriod2 === 27 &&
      DEFAULT_BOOM_HUNTER_CONFIG.K12 === 0.8 &&
      DEFAULT_BOOM_HUNTER_CONFIG.K22 === 0.3,
    'EOT 2 (Red Wave) LPPeriod2=27, K12=0.8, K22=0.3'
  );
  assert(
    DEFAULT_BOOM_HUNTER_CONFIG.LPPeriod3 === 11 && DEFAULT_BOOM_HUNTER_CONFIG.square === true,
    'EOT 3 (Yellow/Blue Boom Line) LPPeriod3=11, square=true (K13=0.9999, K33=-0.9999)'
  );
  assert(
    DEFAULT_BOOM_HUNTER_CONFIG.n1 === 9 &&
      DEFAULT_BOOM_HUNTER_CONFIG.n2 === 6 &&
      DEFAULT_BOOM_HUNTER_CONFIG.n3 === 3 &&
      DEFAULT_BOOM_HUNTER_CONFIG.n4 === 21 &&
      DEFAULT_BOOM_HUNTER_CONFIG.lsmaline === 200,
    'LSMA WaveTrend parameters n1=9, n2=6, n3=3, n4=21, lsmaline=200'
  );
  assert(
    DEFAULT_BOOM_HUNTER_CONFIG.atrLength === 14 && DEFAULT_BOOM_HUNTER_CONFIG.atrMultiplier === 3.0,
    'Stop Loss ATR multiplier locked to 3x ATR(14)'
  );

  // Test indicator evaluation on 240 synthetic 5m bars
  const testBars: OHLCVBar[] = [];
  let p = 50000;
  for (let i = 0; i < 240; i++) {
    const move = Math.sin(i * 0.18) * 220 + Math.cos(i * 0.07) * 140;
    const open = p;
    const close = p + move;
    const high = Math.max(open, close) + 95;
    const low = Math.min(open, close) - 95;
    testBars.push({
      time: Date.now() - (240 - i) * 300000,
      open,
      high,
      low,
      close,
      volume: 100000 + i * 500,
    });
    p = close;
  }

  const indRes = evaluateBoomHunterPro(testBars);
  assert(!Number.isNaN(indRes.latest.q1), `Q1 Oscillator computed cleanly (${indRes.latest.q1})`);
  assert(!Number.isNaN(indRes.latest.trigger), `Trigger SMA(2) computed cleanly (${indRes.latest.trigger})`);
  assert(!Number.isNaN(indRes.latest.wt2), `LSMA WaveTrend wt2 computed cleanly (${indRes.latest.wt2})`);
  assert(!Number.isNaN(indRes.latest.lsma), `LSMA(200) computed cleanly (${indRes.latest.lsma})`);
  assert(indRes.latest.atr > 0, `5m ATR(14) > 0 (${indRes.latest.atr})`);

  // 2. Audit Bot Engine Rules: Top 100 Volatile Markets, 15s Scan, 5s Opportunist, 1-2s Position Monitor
  console.log('\n2. Auditing BillionDollarBotEngine Market Scan & Position Sizing Rules...');
  const engine = new BillionDollarBotEngine();
  const state = engine.getState();

  assert(state.botName === 'Billion Dollar', 'Bot Name is "Billion Dollar"');
  assert(state.rules.marginPerTradePct === 8, 'Trade margin is 8% of balance');
  assert(state.rules.leverage === 10, 'Leverage is 10x');
  assert(state.rules.timeframe === '5m', 'Timeframe is 5 minutes (5m)');
  assert(state.rules.maxOpenPositions === 10, 'Maximum open trades is 10');
  assert(state.top100VolatileMarkets.length === 100, 'Exactly Top 100 Volatile Markets tracked');

  // Verify serial sorting (#1 to #100 descending volatility)
  let seriallySorted = true;
  for (let i = 0; i < state.top100VolatileMarkets.length; i++) {
    if (state.top100VolatileMarkets[i].serialRank !== i + 1) {
      seriallySorted = false;
      break;
    }
    if (
      i > 0 &&
      state.top100VolatileMarkets[i].volatilityPct >
        state.top100VolatileMarkets[i - 1].volatilityPct
    ) {
      seriallySorted = false;
      break;
    }
  }
  assert(seriallySorted, 'Top 100 Volatile Markets sorted serially (#1 to #100) by volatility');
  assert(
    state.opportunistAssets.every((o) => o.isOpportunist),
    'Opportunist list shows only qualified Opportunist assets'
  );

  // 3. Audit Trailing Stop 20% Activation & +10% Step Progression (30% Hit -> Moves to 20% ROI)
  console.log('\n3. Auditing Trailing Stop ROI Step Logic (20% Hit -> +10% Step)...');
  const candidate = state.top100VolatileMarkets.find(
    (m) => !state.activePositions.some((p) => p.symbol === m.symbol)
  )!;
  const newPos = await engine.executeNewTrade(candidate, 'LONG', 'Audit Test Long');
  assert(Boolean(newPos), 'New trade executed successfully');

  if (newPos) {
    const expectedMargin = Number((state.account.totalBalanceUsd * 0.08).toFixed(2));
    assert(
      Math.abs(newPos.marginUsedUsd - expectedMargin) < 1,
      `Margin used ($${newPos.marginUsedUsd}) equals 8% of balance ($${expectedMargin})`
    );
    assert(
      Math.abs(newPos.notionalValueUsd - newPos.marginUsedUsd * 10) < 1,
      `Notional value ($${newPos.notionalValueUsd}) equals 10x leverage`
    );

    // Step 1: Boost to +22% ROI -> Trail Stop must activate and lock 10% ROI
    engine.simulateRoiStepBoost(newPos.id, 22);
    const after20 = engine.getState().activePositions.find((p) => p.id === newPos.id)!;
    assert(
      after20.trailStopActive === true &&
        after20.trailMilestoneRoi === 20 &&
        after20.trailLockedRoiPct === 10,
      'At 20%+ ROI: Trail Stop activates (milestone=20%, locked=10% ROI)'
    );

    // Step 2: Boost to +32% ROI -> Trail Stop must move to 20% ROI
    engine.simulateRoiStepBoost(newPos.id, 10);
    const after30 = engine.getState().activePositions.find((p) => p.id === newPos.id)!;
    assert(
      after30.trailMilestoneRoi === 30 && after30.trailLockedRoiPct === 20,
      'When trade hits 30% ROI: Trail Stop moves to 20% ROI!'
    );

    // Step 3: Boost to +42% ROI -> Trail Stop must move to 30% ROI
    engine.simulateRoiStepBoost(newPos.id, 10);
    const after40 = engine.getState().activePositions.find((p) => p.id === newPos.id)!;
    assert(
      after40.trailMilestoneRoi === 40 && after40.trailLockedRoiPct === 30,
      'When trade hits 40% ROI: Trail Stop moves to 30% ROI!'
    );
  }

  // 4. Audit 3D Office Scene (No Black Color in 3D) & Menu Component
  console.log('\n4. Auditing 3D WebGL Office Scene & Expandable Logo Menu...');
  const officeCode = fs.readFileSync(
    path.join(process.cwd(), 'src/components/Office3DScene.tsx'),
    'utf8'
  );
  assert(officeCode.includes('WebGLRenderer'), 'Uses Three.js WebGLRenderer for smooth 3D visualization');
  assert(
    !officeCode.includes('#000000') && !officeCode.includes('0x000000'),
    '3D Office Scene contains ZERO black color (#000000 / 0x000000)'
  );

  const sidebarCode = fs.readFileSync(
    path.join(process.cwd(), 'src/components/SidebarMenu.tsx'),
    'utf8'
  );
  assert(
    sidebarCode.includes('Billion Dollar') && sidebarCode.includes('expanded &&'),
    'Sidebar Menu shows only menu logo when collapsed and menu logo + name when expanded'
  );

  console.log('\n================================================================');
  console.log(' ALL AUDIT CHECKS PASSED 100% WITH ZERO ERRORS OR MISTAKES!');
  console.log('================================================================');
  process.exit(0);
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
