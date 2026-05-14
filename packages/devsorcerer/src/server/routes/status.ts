import type { FastifyInstance } from 'fastify';
import { getDb } from '../../storage/db.js';
import { getConnectedClientCount } from '../ws.js';

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async () => {
    let dbStats = { sessions: 0, events: 0, projects: 0 };
    try {
      const db = getDb();
      const sessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number };
      const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number };
      const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number };
      dbStats = {
        sessions: sessionCount.c,
        events: eventCount.c,
        projects: projectCount.c,
      };
    } catch {
      // DB may not be initialized yet
    }

    return {
      status: 'running',
      version: '0.3.2',
      uptime: Math.floor(process.uptime()),
      collector: {
        active: false, // Updated when collector is running
        activeSessions: 0,
      },
      database: dbStats,
      dashboard: {
        connectedClients: getConnectedClientCount(),
      },
      timestamp: Date.now(),
    };
  });
}
