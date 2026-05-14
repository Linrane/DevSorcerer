import type { FastifyInstance } from 'fastify';
import { loadConfig, saveConfig } from '../../config/loader.js';
import { DEFAULT_PRICING } from '../../shared/constants.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/settings', async () => {
    return loadConfig();
  });

  app.put('/settings', async (request, reply) => {
    try {
      const updates = request.body as Record<string, unknown>;
      if (updates.pricing) {
        // Validate pricing entries
        const p = updates.pricing as Record<string, { inputPer1k?: unknown; outputPer1k?: unknown }>;
        for (const [model, rates] of Object.entries(p)) {
          if (model === '') {
            reply.code(400);
            return { error: 'Invalid pricing', message: 'Model name cannot be empty' };
          }
          if (typeof rates.inputPer1k !== 'number' || rates.inputPer1k <= 0) {
            reply.code(400);
            return { error: 'Invalid pricing', message: `"${model}": inputPer1k must be a positive number` };
          }
          if (typeof rates.outputPer1k !== 'number' || rates.outputPer1k <= 0) {
            reply.code(400);
            return { error: 'Invalid pricing', message: `"${model}": outputPer1k must be a positive number` };
          }
        }
      }
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

  // Reset pricing to built-in defaults (foolproof recovery)
  app.post('/settings/pricing/reset', async () => {
    // Force-reset by writing defaults directly
    const current = loadConfig();
    const updated = saveConfig({ pricing: { ...DEFAULT_PRICING } } as Partial<never>);
    return { success: true, pricing: (updated as Record<string, unknown>).pricing };
  });
}
