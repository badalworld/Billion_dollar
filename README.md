# Billion Dollar — MEXC Futures Automation Bot

**Billion Dollar** is a full-stack automated cryptocurrency futures trading bot for **MEXC Futures (USDT-M Perpetual Contracts)** powered by the exact **TradingView Boom Hunter Pro v1.022** (`© veryfid`) indicator and an interactive **WebGL 3D Minimalist Office** visualization.

---

## Core Strategy & Risk Rules (100% Locked Compliance)

1. **Bot Name & Expandable Logo Menu**:
   - Bot Name: **Billion Dollar** with custom hexagonal `$B` circuitry crest logo.
   - Menu displays **only the menu logos** by default; clicking expands the menu to display **menu logo + name**.
   - Dark dashboard background (`#070B14`).

2. **Front Page — WebGL 3D Minimalist Office**:
   - The front page displays a real-time **Three.js WebGL 3D Office** visualizing the entire automated trading pipeline.
   - **Zero black color (`#000000`)** inside the 3D environment: all walls, floors, Nordic oak desks, ergonomic chairs, and live computer screen textures use bright, minimalist aesthetics and studio daylight lighting.
   - Animated 3D data packets flow along floor conduits from **Stage 1 (15s Market Scanner)** $\rightarrow$ **Stage 2 (5s Opportunist Radar)** $\rightarrow$ **Stage 3 (Order Execution & 3x ATR Engine)** $\rightarrow$ **Stage 4 (1-2s Central Command Table with 10 Active Position Pods)** $\rightarrow$ **Stage 5 (Profit Vault)**.

3. **TradingView Indicator (`Boom Hunter Pro v1.022` — Pine Script v5)**:
   - **EOT 1 (Main Oscillator)**: Highpass filter (100-bar cutoff) + SuperSmoother (`LPPeriod = 6`) + Fast Attack Slow Decay (`0.991`) + Roofing Quotient (`K1 = 0`, `K2 = 0.3`, `trigno = 2`).
   - **EOT 2 (Red Wave)**: `LPPeriod2 = 27`, `K12 = 0.8`, `K22 = 0.3`.
   - **EOT 3 (Yellow / Downward Boom Line)**: `LPPeriod3 = 11`, `square = true` (`K13 = 0.9999`, `K33 = -0.9999`).
   - **LSMA WaveTrend (`LSMAWT`)**: `tradition(hlc3) = avg(tci, mf, rsi(3))`, `wt2 = sma(wt1, 6)`, `wt3 = linreg(wt1, 21, 0)`, `lsma = linreg(wt3, 200, 0)`.
   - **LuxAlgo Pivot Support/Resistance Breaks**: `pivothigh` & `pivotlow` break tracking.

4. **Market Scanning & Execution Cadence**:
   - **Every 15 Seconds**: Scans MEXC Futures and sorts the **Top 100 Volatile Markets serially (`#1` to `#100`)**.
   - **Every 5 Seconds**: Filters and displays **Only Possible Opportunist Assets** on the Dashboard and monitors them every 5 seconds for trade execution.
   - **Every 1–2 Seconds**: Monitors up to **10 maximum concurrent open positions** for real-time PnL, 3x ATR Stop Loss, Opposite Signal Take Profit, and Trailing Stop ROI steps.

5. **Position Sizing, TP/SL & Step Trailing Stop**:
   - **Margin & Leverage**: **8% of account balance** per trade with **10x leverage** on the **5-minute (`5m`) timeframe**.
   - **Take Profit (TP)**: Triggered automatically when Boom Hunter Pro emits an **Opposite Signal**.
   - **Stop Loss (SL)**: Set at **3x ATR(14)** on the 5m timeframe.
   - **Step Trailing Stop**:
     - Activates when a trade hits **20% ROI** (locks +10% ROI floor).
     - Steps up **every 10% ROI**: when a trade hits **30% ROI**, the trail stop moves to **20% ROI**; at **40% ROI**, it moves to **30% ROI**, and so on, highlighted with color-coded alerts across the dashboard.

---

## Scripts

- `npm run dev` — Starts the full-stack server + WebGL frontend on `0.0.0.0:3000`.
- `npm run build` — Runs `tsc --noEmit` and builds the production bundle.
- `npm run audit-bot` — Runs the automated system & Pine Script v5 compliance audit.
