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

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
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
    return { sessions };
  });

  // Get session detail
  app.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      reply.code(404);
      return { error: 'Session not found' };
    }
    return session;
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
