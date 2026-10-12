import React, { useEffect, useState, useCallback } from 'react';
import { SidebarMenu, NavTabId } from './components/SidebarMenu';
import { Office3DScene } from './components/Office3DScene';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ActivePositionsPanel } from './components/ActivePositionsPanel';
import { MarketScannerPanel } from './components/MarketScannerPanel';
import { BoomHunterChartPanel } from './components/BoomHunterChartPanel';
import { SettingsPanel } from './components/SettingsPanel';
import type { BotSystemState } from './server/tradingBotEngine';

export const App: React.FC = () => {
  // Default front page is strictly the 3D Office Process view
  const [activeTab, setActiveTab] = useState<NavTabId>('3d-office');
  // Menu starts collapsed showing ONLY menu logos; expands on click to show logo + name
  const [menuExpanded, setMenuExpanded] = useState<boolean>(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC_USDT');
  const [botState, setBotState] = useState<BotSystemState | null>(null);

  const fetchBotState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = (await res.json()) as BotSystemState;
        setBotState(data);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  useEffect(() => {
    fetchBotState();

    // Connect WebSocket for real-time 1-2s updates
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'BOT_STATE_UPDATE' && msg.data) {
            setBotState(msg.data);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // fallback to polling
    }

    const pollInterval = setInterval(fetchBotState, 1500);
    return () => {
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [fetchBotState]);

  const handleBoostRoi = async (positionId: string, addRoiPct: number) => {
    const res = await fetch('/api/position/boost-roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, addRoiPct }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  const handleClosePosition = async (
    positionId: string,
    reason: 'TP_OPPOSITE_SIGNAL' | 'MANUAL_CLOSE'
  ) => {
    const res = await fetch('/api/position/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, reason }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  const handleExecuteTrade = async (symbol: string, side: 'LONG' | 'SHORT') => {
    const res = await fetch('/api/trade/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, side }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  const handleTriggerScanNow = async () => {
    const res = await fetch('/api/scan/now', { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  const handleSaveMexcKeys = async (payload: {
    apiKey: string;
    secretKey: string;
    passphrase: string;
    liveExecution: boolean;
    balanceUsd: number;
  }) => {
    const res = await fetch('/api/settings/mexc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  const handleToggleBot = async (running: boolean) => {
    const res = await fetch('/api/bot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ running }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.state) setBotState(json.state);
    }
  };

  if (!botState) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
          <div className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-emerald-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent">
            Initializing Billion Dollar MEXC Futures Engine...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      {/* Expandable Logo-Only Menu Sidebar */}
      <SidebarMenu
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        expanded={menuExpanded}
        onToggleExpand={() => setMenuExpanded((prev) => !prev)}
        openPositionsCount={botState.activePositions.length}
        opportunistCount={botState.opportunistAssets.length}
        unreadAlertsCount={botState.alerts.length}
        botRunning={botState.botRunning}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 min-w-0 ${
          menuExpanded ? 'ml-72' : 'ml-20'
        }`}
      >
        {activeTab === '3d-office' && (
          <Office3DScene state={botState} sidebarExpanded={menuExpanded} />
        )}

        {activeTab === 'performance' && <PerformanceDashboard state={botState} />}

        {activeTab === 'positions' && (
          <ActivePositionsPanel
            state={botState}
            onBoostRoi={handleBoostRoi}
            onClosePosition={handleClosePosition}
          />
        )}

        {activeTab === 'scanner' && (
          <MarketScannerPanel
            state={botState}
            onTriggerScanNow={handleTriggerScanNow}
            onExecuteTrade={handleExecuteTrade}
            onInspectSymbol={(sym) => {
              setSelectedSymbol(sym);
              setActiveTab('indicator');
            }}
          />
        )}

        {activeTab === 'indicator' && (
          <BoomHunterChartPanel
            state={botState}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            onExecuteTrade={handleExecuteTrade}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            state={botState}
            onSaveMexcKeys={handleSaveMexcKeys}
            onToggleBot={handleToggleBot}
          />
        )}
      </main>
    </div>
  );
};

export default App;
