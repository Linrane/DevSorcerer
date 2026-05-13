import { getDb } from '../db.js';
import type { Session, SessionStatus, SessionRow } from '../../shared/types.js';
import { generateId } from '../../shared/utils.js';

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    projectId: row.project_id,
    agentName: row.agent_name,
    agentVersion: row.agent_version ?? undefined,
    branch: row.branch ?? undefined,
    commitHash: row.commit_hash ?? undefined,
    status: row.status as SessionStatus,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    metadata: JSON.parse(row.metadata || '{}'),
    totalEvents: row.total_events,
    totalTokens: row.total_tokens,
    totalCost: row.total_cost,
  };
}

export function createSession(
  projectId: string,
  agentName: string,
  agentVersion?: string,
  branch?: string,
  commitHash?: string,
): Session {
  const db = getDb();
  const id = generateId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (id, project_id, agent_name, agent_version, branch, commit_hash, status, started_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, '{}')`,
  ).run(id, projectId, agentName, agentVersion ?? null, branch ?? null, commitHash ?? null, now);

  return {
    id,
    projectId,
    agentName,
    agentVersion,
    branch,
    commitHash,
    status: 'active',
    startedAt: now,
    metadata: {},
    totalEvents: 0,
    totalTokens: 0,
    totalCost: 0,
  };
}

export function endSession(
  id: string,
  status: SessionStatus = 'completed',
): void {
  const db = getDb();
  db.prepare(
    'UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?',
  ).run(status, Date.now(), id);
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(id) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function listSessions(
  projectId?: string,
  limit = 50,
  offset = 0,
): Session[] {
  const db = getDb();
  let query = 'SELECT * FROM sessions';
  const params: unknown[] = [];
  if (projectId) {
    query += ' WHERE project_id = ?';
    params.push(projectId);
  }
  query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return (
    db.prepare(query).all(...params) as SessionRow[]
  ).map(rowToSession);
}

export function incrementSessionStats(
  sessionId: string,
  tokens: number,
  cost: number,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE sessions
     SET total_events = total_events + 1,
         total_tokens = total_tokens + ?,
         total_cost = total_cost + ?
     WHERE id = ?`,
  ).run(tokens, cost, sessionId);
}

export function getSessionStats(projectId?: string): {
  totalSessions: number;
  totalCost: number;
  totalTokens: number;
} {
  const db = getDb();
  let query =
    'SELECT COUNT(*) as count, COALESCE(SUM(total_cost), 0) as cost, COALESCE(SUM(total_tokens), 0) as tokens FROM sessions';
  const params: unknown[] = [];
  if (projectId) {
    query += ' WHERE project_id = ?';
    params.push(projectId);
  }
  const row = db.prepare(query).get(...params) as {
    count: number;
    cost: number;
    tokens: number;
  };
  return {
    totalSessions: row.count,
    totalCost: row.cost,
    totalTokens: row.tokens,
  };
}
