import type { FastifyInstance } from 'fastify';
import { loadConfig, saveConfig } from '../../config/loader.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // Get all settings
  app.get('/settings', async () => {
    return loadConfig();
  });

  // Update settings
  app.put('/settings', async (request, reply) => {
    try {
      const updates = request.body as Record<string, unknown>;
      const updated = saveConfig(updates as Partial<never>);
      return updated;
    } catch (err) {
      reply.code(400);
      return {
        error: 'Invalid settings',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
