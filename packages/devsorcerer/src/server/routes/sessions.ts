import type { FastifyInstance } from 'fastify';
import {
  listSessions,
  getSession,
} from '../../storage/repositories/sessions.js';
import {
  getEvents,
  getSessionTimeline,
  getSessionEventsByTool,
} from '../../storage/repositories/events.js';
import { BottleneckAnalyzer } from '../../analyzer/bottleneck.js';
import { importAllClaudeCodeSessions } from '../../import/sessionImporter.js';
import { getDb } from '../../storage/db.js';

function enrichSession(s: ReturnType<typeof getSession>): Record<string, unknown> | null {
  if (!s) return null;
  const db = getDb();

  // Look up project name
  const proj = db.prepare('SELECT name FROM projects WHERE id = ?').get(s.projectId) as
    { name: string } | undefined;

  // Parse metadata for title and model
  let title = '';
  let modelName = '';
  try {
    const meta = s.metadata && typeof s.metadata === 'object' ? s.metadata as Record<string, unknown> : {};
    title = (meta.title as string) || '';
    modelName = (meta.model as string) || '';
  } catch { /* use defaults */ }

  // Fallback: extract model from agentName (e.g. "Claude Code (deepseek-v4-pro)")
  if (!modelName) {
    const m = s.agentName.match(/\(([^)]+)\)$/);
    if (m?.[1]) modelName = m[1];
  }

  return {
    ...s,
    projectName: proj?.name || s.projectId,
    title,
    modelName,
  };
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // Import Claude Code sessions
  app.post('/sessions/import', async (_request, reply) => {
    try {
      const results = importAllClaudeCodeSessions();
      const imported = results.filter((r) => !r.skipped);
      const skipped = results.filter((r) => r.skipped);
      return {
        total: results.length,
        imported: imported.length,
        skipped: skipped.length,
        sessions: results,
      };
    } catch (err) {
      reply.code(500);
      return { error: 'Import failed', message: err instanceof Error ? err.message : 'Unknown error' };
    }
  });
  // List sessions
  app.get('/sessions', async (request, reply) => {
    const query = request.query as {
      project_id?: string;
      limit?: string;
      offset?: string;
    };
    const sessions = listSessions(
      query.project_id,
      query.limit ? parseInt(query.limit, 10) : 50,
      query.offset ? parseInt(query.offset, 10) : 0,
    );
    return { sessions: sessions.map(enrichSession).filter(Boolean) };
  });

  // Get session detail
  app.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      reply.code(404);
      return { error: 'Session not found' };
    }
    return enrichSession(session);
  });

  // Get session events
  app.get('/sessions/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      tool?: string;
      limit?: string;
      offset?: string;
    };

    if (query.tool) {
      const events = getSessionEventsByTool(id, query.tool);
      return { events };
    }

    const events = getEvents(
      id,
      query.limit ? parseInt(query.limit, 10) : 500,
      query.offset ? parseInt(query.offset, 10) : 0,
    );
    return { events };
  });

  // Get session timeline (for replay)
  app.get('/sessions/:id/timeline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const events = getSessionTimeline(id);

    // Group by tool+timestamp for timeline visualization
    const steps = events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      toolName: e.toolName,
      direction: e.direction,
      isError: e.isError,
      latencyMs: e.latencyMs,
      summary: e.method || e.toolName || 'unknown',
    }));

    return { sessionId: id, steps };
  });

  // Get session bottleneck analysis
  app.get('/sessions/:id/bottleneck', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analyzer = new BottleneckAnalyzer();
    const report = analyzer.analyzeSession(id);
    return report;
  });
}
