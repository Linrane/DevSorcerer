import { getDb } from '../storage/db.js';
import type { QualityReport, ProjectQuality, DateRange } from '../shared/types.js';

export class QualityAnalyzer {
  analyzeSession(sessionId: string): QualityReport {
    const db = getDb();

    // Count file operations from events
    const events = db
      .prepare(
        `SELECT tool_name, params
         FROM events
         WHERE session_id = ? AND tool_name IN ('write_file', 'write_to_file', 'Write', 'replace_in_file', 'edit_file', 'Edit')`,
      )
      .all(sessionId) as Array<{ tool_name: string; params: string | null }>;

    const createTools = new Set(['write_file', 'write_to_file', 'Write']);
    const editTools = new Set(['replace_in_file', 'edit_file', 'Edit']);

    let filesCreated = 0;
    let filesModified = 0;
    const touchedFiles = new Set<string>();

    for (const e of events) {
      try {
        const params = e.params ? JSON.parse(e.params) : null;
        const args = params?.arguments || params;
        const filePath = args?.filePath || args?.path || args?.file;

        if (filePath) {
          touchedFiles.add(filePath as string);
          if (createTools.has(e.tool_name)) {
            filesCreated++;
          } else if (editTools.has(e.tool_name)) {
            filesModified++;
          }
        }
      } catch {
        // Skip unparseable params
      }
    }

    // Query quality events table for post-session data
    const qualityRows = db
      .prepare(
        `SELECT event_type, details FROM quality_events WHERE session_id = ?`,
      )
      .all(sessionId) as Array<{ event_type: string; details: string | null }>;

    const rollbackCount = qualityRows.filter(
      (r) => r.event_type === 'rollback',
    ).length;
    const bugCount = qualityRows.filter((r) => r.event_type === 'bug_fix').length;
    const aiCommitCount = qualityRows.filter(
      (r) => r.event_type === 'ai_commit',
    ).length;

    // Calculate acceptance rate
    // acceptance = accepted files / total touched files
    // Without git blame data, we calculate a rough rate:
    // 100% minus (rollbacks / total operations)
    const totalOps = filesCreated + filesModified;
    const acceptanceRate =
      totalOps > 0
        ? Math.max(0, 100 - (rollbackCount / totalOps) * 100)
        : 100;

    return {
      sessionId,
      acceptanceRate: Math.round(acceptanceRate),
      filesCreated,
      filesModified,
      filesAccepted: totalOps - rollbackCount,
      rollbackCount,
      bugCount: bugCount || null,
    };
  }

  getProjectQuality(
    projectId: string,
    dateRange?: DateRange,
  ): ProjectQuality {
    const db = getDb();

    let query = `
      SELECT
        COUNT(DISTINCT s.id) as session_count,
        COALESCE(SUM(CASE WHEN qe.event_type = 'ai_commit' THEN 1 ELSE 0 END), 0) as ai_commits,
        COALESCE(SUM(CASE WHEN qe.event_type = 'rollback' THEN 1 ELSE 0 END), 0) as rollbacks,
        COALESCE(SUM(CASE WHEN qe.event_type = 'bug_fix' THEN 1 ELSE 0 END), 0) as bug_fixes
      FROM sessions s
      LEFT JOIN quality_events qe ON qe.project_id = s.project_id
      WHERE s.project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (dateRange?.from) {
      query += ' AND s.started_at >= ?';
      params.push(new Date(dateRange.from).getTime());
    }
    if (dateRange?.to) {
      query += ' AND s.started_at <= ?';
      params.push(new Date(dateRange.to).getTime());
    }

    const row = db.prepare(query).get(...params) as {
      session_count: number;
      ai_commits: number;
      rollbacks: number;
      bug_fixes: number;
    };

    const aiCommits = row.ai_commits || 0;
    const rollbacks = row.rollbacks || 0;
    const bugFixes = row.bug_fixes || 0;

    return {
      projectId,
      acceptanceRate: aiCommits > 0 ? ((aiCommits - rollbacks) / aiCommits) * 100 : 100,
      rollbackRate: aiCommits > 0 ? (rollbacks / aiCommits) * 100 : 0,
      aiBugRate: aiCommits > 0 ? (bugFixes / aiCommits) * 100 : 0,
      totalAiCommits: aiCommits,
    };
  }
}
