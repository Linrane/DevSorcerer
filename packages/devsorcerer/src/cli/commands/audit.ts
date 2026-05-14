import { Command, Option } from 'clipanion';
import fs from 'node:fs';
import { loadConfig } from '../../config/loader.js';
import { initDb, getDb } from '../../storage/db.js';
import type { AuditExportFormat, AuditAnonymizeScope } from '../../shared/types.js';
import {
  validateProjectId,
  validateDateFormat,
  validateAuditFormat,
  validateAuditScope,
  validateOutputPath,
} from '../../shared/validation.js';

export class AuditExportCommand extends Command {
  static override paths = [['audit', 'export']];
  static override usage = Command.Usage({
    description: 'Export compliance audit logs for SOC2/ISO audits',
    examples: [
      ['Export to JSON', 'devsorcerer audit export --project myapp --format json -o audit.json'],
      ['Anonymized NDJSON', 'devsorcerer audit export --format ndjson --scope anonymized'],
    ],
  });

  project = Option.String('--project', { description: 'Filter by project' });
  from = Option.String('--from', { description: 'Start date (YYYY-MM-DD)' });
  to = Option.String('--to', { description: 'End date (YYYY-MM-DD)' });
  format = Option.String('--format', { description: 'Output: csv, json, ndjson' });
  output = Option.String('--output,-o', { description: 'Output file path' });
  scope = Option.String('--scope', { description: 'full or anonymized' });

  async execute(): Promise<number> {
    const config = loadConfig();
    const db = initDb(config.dbPath);

    try {
      if (this.project) validateProjectId(this.project);
      if (this.from) validateDateFormat(this.from, '--from');
      if (this.to) validateDateFormat(this.to, '--to');
      const format: AuditExportFormat = (this.format as AuditExportFormat) || 'json';
      const scope: AuditAnonymizeScope = (this.scope as AuditAnonymizeScope) || 'full';
      if (this.format) validateAuditFormat(this.format);
      if (this.scope) validateAuditScope(this.scope);
      if (this.output) validateOutputPath(this.output);
      const anonymize = scope === 'anonymized';

      let sql = `
        SELECT e.id as event_id, e.session_id, e.timestamp, e.method, e.tool_name,
               e.direction, e.msg_type, e.estimated_tokens,
               s.agent_name, s.project_id
        FROM events e
        JOIN sessions s ON s.id = e.session_id
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (this.project) {
        sql += ' AND e.project_id = ?';
        params.push(this.project);
      }
      if (this.from) {
        sql += ' AND e.timestamp >= ?';
        params.push(new Date(this.from).getTime());
      }
      if (this.to) {
        sql += ' AND e.timestamp <= ?';
        params.push(new Date(this.to).getTime());
      }

      sql += ' ORDER BY e.timestamp ASC LIMIT 50000';

      const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

      const entries = rows.map((r) => {
        if (anonymize) {
          return {
            event_id: String(r.event_id).slice(0, 8),
            session_id: String(r.session_id).slice(0, 8),
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

      let output = '';
      if (format === 'csv') {
        const headers = Object.keys(entries[0] || {}).join(',');
        const csvRows = entries.map((e) =>
          Object.values(e)
            .map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v))
            .join(','),
        );
        output = [headers, ...csvRows].join('\n');
      } else if (format === 'ndjson') {
        output = entries.map((e) => JSON.stringify(e)).join('\n');
      } else {
        output = JSON.stringify(
          {
            export: {
              format,
              scope,
              entry_count: entries.length,
              generated_at: new Date().toISOString(),
              entries,
            },
          },
          null,
          2,
        );
      }

      if (this.output) {
        fs.writeFileSync(this.output, output);
        this.context.stdout.write(
          `Exported ${entries.length} audit entries to ${this.output}\n`,
        );
      } else {
        this.context.stdout.write(output);
      }
    } finally {
      db.close();
    }

    return 0;
  }
}
