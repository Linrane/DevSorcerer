import type { FastifyInstance } from 'fastify';
import { getDb } from '../../storage/db.js';
import type { AuditExportFormat, AuditAnonymizeScope } from '../../shared/types.js';
import { generateId } from '../../shared/utils.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // Export audit log
  app.get('/audit/export', async (request, reply) => {
    const query = request.query as {
      project_id?: string;
      from?: string;
      to?: string;
      format?: string;
      scope?: string;
    };

    const format: AuditExportFormat =
      (query.format as AuditExportFormat) || 'json';
    const scope: AuditAnonymizeScope =
      (query.scope as AuditAnonymizeScope) || 'full';

    const validFormats = ['csv', 'json', 'ndjson'];
    const validScopes = ['full', 'anonymized'];
    if (query.format && !validFormats.includes(query.format)) {
      reply.code(400);
      return { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` };
    }
    if (query.scope && !validScopes.includes(query.scope)) {
      reply.code(400);
      return { error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` };
    }

    const anonymize = scope === 'anonymized';

    const db = getDb();

    let sql = `
      SELECT e.id as event_id, e.session_id, e.timestamp, e.method, e.tool_name,
             e.direction, e.msg_type,
             s.agent_name, s.project_id
      FROM events e
      JOIN sessions s ON s.id = e.session_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (query.project_id) {
      sql += ' AND e.project_id = ?';
      params.push(query.project_id);
    }

    if (query.from) {
      sql += ' AND e.timestamp >= ?';
      params.push(new Date(query.from).getTime());
    }
    if (query.to) {
      sql += ' AND e.timestamp <= ?';
      params.push(new Date(query.to).getTime());
    }

    sql += ' ORDER BY e.timestamp ASC LIMIT 10000';

    const rows = db.prepare(sql).all(...params) as Array<{
      event_id: string;
      session_id: string;
      timestamp: number;
      method: string | null;
      tool_name: string | null;
      direction: string;
      msg_type: string;
      agent_name: string;
      project_id: string;
    }>;

    // Transform
    const entries = rows.map((r) => {
      if (anonymize) {
        return {
          event_id: r.event_id.slice(0, 8),
          session_id: r.session_id.slice(0, 8),
          timestamp: r.timestamp,
          method: r.method,
          tool_name: r.tool_name,
          direction: r.direction,
          msg_type: r.msg_type,
          agent_name: r.agent_name,
        };
      }
      return r;
    });

    // Format output
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      const headers = Object.keys(entries[0] || {}).join(',');
      const csvRows = entries.map((e) =>
        Object.values(e)
          .map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v))
          .join(','),
      );
      return [headers, ...csvRows].join('\n');
    }

    if (format === 'ndjson') {
      reply.header('Content-Type', 'application/x-ndjson');
      return entries.map((e) => JSON.stringify(e)).join('\n');
    }

    return {
      export: {
        format,
        scope,
        entry_count: entries.length,
        generated_at: new Date().toISOString(),
        entries,
      },
    };
  });
}
