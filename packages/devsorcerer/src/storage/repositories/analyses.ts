import { getDb } from '../db.js';
import { generateId, now } from '../../shared/utils.js';

export function cacheAnalysisResult(
  sessionId: string,
  analysisType: string,
  result: unknown,
): void {
  const db = getDb();
  const id = generateId();
  db.prepare(
    `INSERT OR REPLACE INTO analysis_results (id, session_id, analysis_type, result, computed_at, version)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(id, sessionId, analysisType, JSON.stringify(result), now());
}

export function getCachedAnalysis(
  sessionId: string,
  analysisType: string,
): unknown | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT result FROM analysis_results WHERE session_id = ? AND analysis_type = ?',
    )
    .get(sessionId, analysisType) as { result: string } | undefined;
  return row ? JSON.parse(row.result) : null;
}

export function insertRiskFindings(
  findings: Array<{
    id: string;
    sessionId: string;
    severity: string;
    category: string;
    ruleId: string;
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
    snippet: string;
    description: string;
  }>,
): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO risk_findings (id, session_id, severity, category, rule_id, file_path, line_start, line_end, snippet, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const f of findings) {
      stmt.run(
        f.id,
        f.sessionId,
        f.severity,
        f.category,
        f.ruleId,
        f.filePath,
        f.lineStart ?? null,
        f.lineEnd ?? null,
        f.snippet,
        f.description,
      );
    }
  });
  tx();
}

export function getRiskFindings(
  sessionId?: string,
  severity?: string,
): Array<{
  id: string;
  sessionId: string;
  severity: string;
  category: string;
  ruleId: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  snippet: string;
  description: string;
}> {
  const db = getDb();
  let query = 'SELECT * FROM risk_findings WHERE 1=1';
  const params: unknown[] = [];
  if (sessionId) {
    query += ' AND session_id = ?';
    params.push(sessionId);
  }
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  query += ' ORDER BY created_at DESC LIMIT 200';
  return (
    db.prepare(query).all(...params) as Array<{
      id: string;
      session_id: string;
      severity: string;
      category: string;
      rule_id: string;
      file_path: string;
      line_start: number | null;
      line_end: number | null;
      snippet: string;
      description: string;
    }>
  ).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    severity: r.severity,
    category: r.category,
    ruleId: r.rule_id,
    filePath: r.file_path,
    lineStart: r.line_start ?? undefined,
    lineEnd: r.line_end ?? undefined,
    snippet: r.snippet,
    description: r.description,
  }));
}
