import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from '../config/loader.js';
import { sessionRoutes } from './routes/sessions.js';
import { analysisRoutes } from './routes/analysis.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { auditRoutes } from './routes/audit.js';
import { settingsRoutes } from './routes/settings.js';
import { statusRoutes } from './routes/status.js';
import { registerWebSocket } from './ws.js';
import type { FastifyInstance } from 'fastify';

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
    version: '0.1.0',
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
