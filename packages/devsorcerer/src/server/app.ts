import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { loadConfig } from '../config/loader.js';
import { sessionRoutes } from './routes/sessions.js';
import { analysisRoutes } from './routes/analysis.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { auditRoutes } from './routes/audit.js';
import { settingsRoutes } from './routes/settings.js';
import { statusRoutes } from './routes/status.js';
import { registerWebSocket } from './ws.js';
import type { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findDashboardDist(): string | null {
  // Try several locations for the built dashboard
  const candidates = [
    resolve(__dirname, '..', '..', '..', 'dashboard', 'dist'),
    resolve(__dirname, '..', '..', '..', 'packages', 'dashboard', 'dist'),
    resolve(process.cwd(), 'packages', 'dashboard', 'dist'),
    resolve(process.cwd(), '..', 'dashboard', 'dist'),
  ];
  for (const cand of candidates) {
    if (existsSync(resolve(cand, 'index.html'))) {
      return cand;
    }
  }
  return null;
}

export async function createApp(): Promise<FastifyInstance> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: true },
      },
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Serve dashboard static files if available
  const dashboardDist = findDashboardDist();
  if (dashboardDist) {
    await app.register(fastifyStatic, {
      root: dashboardDist,
      prefix: '/',
      wildcard: false,
    });
    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((_request, reply) => {
      // Only do SPA fallback for non-API routes
      if (!_request.url.startsWith('/api') && !_request.url.startsWith('/ws')) {
        reply.sendFile('index.html');
      } else {
        reply.code(404).send({ error: 'Not found' });
      }
    });
  }

  // Routes
  await app.register(sessionRoutes, { prefix: '/api' });
  await app.register(analysisRoutes, { prefix: '/api' });
  await app.register(knowledgeRoutes, { prefix: '/api' });
  await app.register(auditRoutes, { prefix: '/api' });
  await app.register(settingsRoutes, { prefix: '/api' });
  await app.register(statusRoutes, { prefix: '/api' });

  // WebSocket for live events
  registerWebSocket(app);

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '0.2.3',
    uptime: process.uptime(),
  }));

  return app;
}

export async function startServer(port?: number): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = await createApp();

  const listenPort = port || config.serverPort;
  await app.listen({ port: listenPort, host: '127.0.0.1' });

  console.log(`DevSorcerer API server running at http://127.0.0.1:${listenPort}`);
  console.log(`  Dashboard: http://127.0.0.1:${listenPort}`);
  console.log(`  API:       http://127.0.0.1:${listenPort}/api`);

  return app;
}
