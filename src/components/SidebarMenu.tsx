import React from 'react';
import {
  Box,
  BarChart3,
  ShieldAlert,
  Radar,
  Activity,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { BillionDollarLogo } from './BillionDollarLogo';

export type NavTabId =
  | '3d-office'
  | 'performance'
  | 'positions'
  | 'scanner'
  | 'indicator'
  | 'settings';

interface SidebarMenuProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  openPositionsCount: number;
  opportunistCount: number;
  unreadAlertsCount: number;
  botRunning: boolean;
}

interface MenuItem {
  id: NavTabId;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  activeTab,
  onSelectTab,
  expanded,
  onToggleExpand,
  openPositionsCount,
  opportunistCount,
  botRunning,
}) => {
  const menuItems: MenuItem[] = [
    {
      id: '3d-office',
      name: '3D Office Process',
      subtitle: 'Front Page Live WebGL',
      icon: <Box className="w-5 h-5 text-emerald-400" />,
      badge: '3D',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'performance',
      name: 'Performance & Charts',
      subtitle: 'PnL, ROI & Trade History',
      icon: <BarChart3 className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'positions',
      name: 'Active Trades (1-2s)',
      subtitle: 'Max 10 & Trail Stop 20%/10%',
      icon: <ShieldAlert className="w-5 h-5 text-cyan-400" />,
      badge: `${openPositionsCount}/10`,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    {
      id: 'scanner',
      name: 'Opportunists & Top 100',
      subtitle: '5s Monitor & 15s Volatility',
      icon: <Radar className="w-5 h-5 text-purple-400" />,
      badge: opportunistCount,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      id: 'indicator',
      name: 'Boom Hunter Pro',
      subtitle: '5m Pine v1.022 & 3x ATR',
      icon: <Activity className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 'settings',
      name: 'MEXC API & Settings',
      subtitle: 'API Key, Secret & Rules',
      icon: <Settings className="w-5 h-5 text-blue-400" />,
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-screen bg-[#080D1A]/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 flex flex-col justify-between select-none ${
        expanded ? 'w-72 shadow-2xl shadow-black/80' : 'w-20'
      }`}
    >
      {/* Top Brand Logo Section: Shows ONLY Logo when collapsed; Logo + Name when clicked/expanded */}
      <div>
        <div className="h-20 px-3 flex items-center justify-between border-b border-slate-800/80">
          <button
            onClick={onToggleExpand}
            title={expanded ? 'Click to collapse menu' : 'Click to expand Billion Dollar menu'}
            className={`flex items-center gap-3 group focus:outline-none ${
              expanded ? 'w-full' : 'mx-auto'
            }`}
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/70 group-hover:border-emerald-500/60 transition-colors">
              <BillionDollarLogo size={42} />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080D1A] ${
                  botRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

            {expanded && (
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                  Billion Dollar
                </span>
                <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase whitespace-nowrap">
                  MEXC Futures Bot
                </span>
              </div>
            )}
          </button>

          {expanded && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors"
              title="Collapse Menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand Button Banner when collapsed */}
        {!expanded && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              onClick={onToggleExpand}
              className="w-12 h-8 rounded-lg bg-slate-900/90 hover:bg-emerald-500/15 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-center text-slate-400 hover:text-emerald-300 transition-all"
              title="Expand Menu to Show Logo + Name"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-2 mt-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={!expanded ? `${item.name} — ${item.subtitle}` : undefined}
                className={`w-full flex items-center ${
                  expanded ? 'justify-between px-3.5 py-3' : 'justify-center py-3'
                } rounded-xl border transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 via-slate-800/90 to-slate-900/90 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/40 hover:bg-slate-800/70 border-slate-800/60 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-slate-950/90 border border-emerald-500/40 shadow-inner'
                        : 'bg-slate-950/60 border border-slate-800'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Strictly show menu name ONLY when expanded */}
                  {expanded && (
                    <div className="flex flex-col items-start text-left truncate">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  )}
                </div>

                {expanded && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {!expanded && item.badge !== undefined && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Rule Compliance Badge (only shows text when expanded, only icon when collapsed) */}
      <div className="p-3 border-t border-slate-800/80">
        {expanded ? (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Margin / Leverage</span>
              <span className="text-emerald-400 font-bold">8% Bal • 10x</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Timeframe / SL</span>
              <span className="text-amber-400 font-bold">5m • 3x ATR</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Trail Stop ROI</span>
              <span className="text-cyan-400 font-bold">20% Hit / 10% Step</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onToggleExpand}
            title="Click to Expand Menu (Logo + Name)"
            className="w-full py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center hover:border-emerald-500/40 transition-colors"
          >
            <span className="text-xs font-extrabold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              10x
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
