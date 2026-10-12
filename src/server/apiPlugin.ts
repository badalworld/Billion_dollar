import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { BillionDollarBotEngine } from './tradingBotEngine.ts';

export function createBillionDollarApiPlugin(): Plugin {
  const parseJsonBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  const sendJson = (res: ServerResponse, status: number, data: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  return {
    name: 'billion-dollar-mexc-bot-api',
    configureServer(server) {
      const botEngine = new BillionDollarBotEngine();
      let wss: WebSocketServer | null = null;

      const broadcastState = () => {
        if (!wss) return;
        const payload = JSON.stringify({
          type: 'BOT_STATE_UPDATE',
          data: botEngine.getState(),
        });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      };

      botEngine.onStateUpdate(() => {
        broadcastState();
      });

      if (server.httpServer) {
        wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (request, socket, head) => {
          if (request.url?.startsWith('/ws')) {
            wss?.handleUpgrade(request, socket, head, (ws) => {
              wss?.emit('connection', ws, request);
              ws.send(
                JSON.stringify({
                  type: 'BOT_STATE_UPDATE',
                  data: botEngine.getState(),
                })
              );
            });
          }
        });
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const cleanPath = url.split('?')[0];

        if (req.method === 'GET' && cleanPath === '/api/state') {
          return sendJson(res, 200, botEngine.getState());
        }

        if (req.method === 'GET' && cleanPath.startsWith('/api/indicator/')) {
          const symbol = decodeURIComponent(cleanPath.replace('/api/indicator/', ''));
          return sendJson(res, 200, botEngine.getIndicatorDetailForSymbol(symbol));
        }

        if (req.method === 'POST' && cleanPath === '/api/bot/toggle') {
          const body = await parseJsonBody(req);
          const running = Boolean(body.running);
          botEngine.setBotRunning(running);
          return sendJson(res, 200, { ok: true, state: botEngine.getState() });
        }

        if (req.method === 'POST' && cleanPath === '/api/settings/mexc') {
          const body = await parseJsonBody(req);
          botEngine.updateMexcCredentials({
            apiKey: String(body.apiKey || ''),
            secretKey: String(body.secretKey || ''),
            passphrase: String(body.passphrase || ''),
            liveExecution: Boolean(body.liveExecution),
            balanceUsd: body.balanceUsd ? Number(body.balanceUsd) : undefined,
          });
          return sendJson(res, 200, {
            ok: true,
            message: 'MEXC Futures API credentials saved & HMAC-SHA256 signer updated.',
            state: botEngine.getState(),
          });
        }

        if (req.method === 'POST' && cleanPath === '/api/position/close') {
          const body = await parseJsonBody(req);
          const positionId = String(body.positionId || '');
          const reason = (body.reason as 'TP_OPPOSITE_SIGNAL' | 'MANUAL_CLOSE') || 'MANUAL_CLOSE';
          const closed = await botEngine.closePosition(positionId, reason);
          broadcastState();
          return sendJson(res, 200, { ok: true, closed, state: botEngine.getState() });
        }

        if (req.method === 'POST' && cleanPath === '/api/position/boost-roi') {
          const body = await parseJsonBody(req);
          const positionId = String(body.positionId || '');
          const addRoiPct = Number(body.addRoiPct || 10);
          const updated = botEngine.simulateRoiStepBoost(positionId, addRoiPct);
          return sendJson(res, 200, { ok: true, updated, state: botEngine.getState() });
        }

        if (req.method === 'POST' && cleanPath === '/api/trade/execute') {
          const body = await parseJsonBody(req);
          const symbol = String(body.symbol || '');
          const side = (body.side === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT';
          const state = botEngine.getState();
          const asset =
            state.top100VolatileMarkets.find((m) => m.symbol === symbol) ||
            state.opportunistAssets[0];
          if (!asset) {
            return sendJson(res, 400, { ok: false, error: 'Asset not found' });
          }
          const pos = await botEngine.executeNewTrade(
            asset,
            side,
            `Manual / Boom Hunter ${side}`
          );
          broadcastState();
          return sendJson(res, 200, { ok: Boolean(pos), position: pos, state: botEngine.getState() });
        }

        if (req.method === 'POST' && cleanPath === '/api/scan/now') {
          botEngine.run15sMarketScan();
          await botEngine.run5sOpportunistMonitor();
          broadcastState();
          return sendJson(res, 200, { ok: true, state: botEngine.getState() });
        }

        return sendJson(res, 404, { error: 'API route not found' });
      });
    },
  };
}
