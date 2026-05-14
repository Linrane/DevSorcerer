import type { FastifyInstance } from 'fastify';
import { CostAnalyzer } from '../../analyzer/cost.js';
import { RiskAnalyzer } from '../../analyzer/risk.js';
import { QualityAnalyzer } from '../../analyzer/quality.js';
import type { RiskSeverity } from '../../shared/types.js';

export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  // Cost analysis
  app.get('/analysis/cost', async (request, reply) => {
    const query = request.query as {
      project_id?: string;
      session_id?: string;
      from?: string;
      to?: string;
    };
    const analyzer = new CostAnalyzer();

    if (query.session_id) {
      return analyzer.analyzeSession(query.session_id);
    }
    if (query.project_id) {
      return analyzer.analyzeProject(query.project_id, query.from, query.to);
    }

    reply.code(400);
    return { error: 'Provide project_id or session_id' };
  });

  // Risk analysis
  app.get('/analysis/risk', async (request, reply) => {
    const query = request.query as {
      session_id?: string;
      project_id?: string;
      severity?: string;
    };
    const analyzer = new RiskAnalyzer();
    const validSeverities = ['critical', 'high', 'medium', 'low'];

    if (query.session_id) {
      return analyzer.analyzeSession(query.session_id);
    }
    if (query.project_id) {
      if (query.severity && !validSeverities.includes(query.severity)) {
        reply.code(400);
        return { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` };
      }
      return {
        findings: analyzer.analyzeProject(
          query.project_id,
          query.severity as RiskSeverity | undefined,
        ),
      };
    }

    reply.code(400);
    return { error: 'Provide project_id or session_id' };
  });

  // Quality analysis
  app.get('/analysis/quality', async (request, reply) => {
    const query = request.query as {
      project_id?: string;
      session_id?: string;
      from?: string;
      to?: string;
    };
    const analyzer = new QualityAnalyzer();

    if (query.session_id) {
      return analyzer.analyzeSession(query.session_id);
    }
    if (query.project_id) {
      return analyzer.getProjectQuality(query.project_id, {
        from: query.from,
        to: query.to,
      });
    }

    reply.code(400);
    return { error: 'Provide project_id or session_id' };
  });
}
