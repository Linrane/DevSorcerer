import { getDb } from '../db.js';
import type { CapturedEvent, EventRow } from '../../shared/types.js';
import { generateId } from '../../shared/utils.js';

function rowToEvent(row: EventRow): CapturedEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    seqNum: row.seq_num,
    timestamp: row.timestamp,
    direction: row.direction as 'client-to-server' | 'server-to-client',
    msgType: row.msg_type as 'request' | 'response' | 'notification',
    method: row.method ?? undefined,
    params: row.params ? JSON.parse(row.params) : undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error ? JSON.parse(row.error) : undefined,
    requestId: row.request_id ?? undefined,
    relatedEventId: row.related_event_id ?? undefined,
    toolName: row.tool_name ?? undefined,
    messageSize: row.message_size,
    estimatedTokens: row.estimated_tokens,
    latencyMs: row.latency_ms ?? undefined,
    projectId: row.project_id,
    isError: row.error !== null,
  };
}

export function insertEvent(event: CapturedEvent): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO events (id, session_id, seq_num, timestamp, direction, msg_type, method, params, result, error, request_id, related_event_id, tool_name, message_size, estimated_tokens, latency_ms, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.sessionId,
    event.seqNum,
    event.timestamp,
    event.direction,
    event.msgType,
    event.method ?? null,
    event.params ? JSON.stringify(event.params) : null,
    event.result ? JSON.stringify(event.result) : null,
    event.error ? JSON.stringify(event.error) : null,
    event.requestId ? String(event.requestId) : null,
    event.relatedEventId ?? null,
    event.toolName ?? null,
    event.messageSize,
    event.estimatedTokens,
    event.latencyMs ?? null,
    event.projectId,
  );
}

export function getEvents(
  sessionId: string,
  limit = 500,
  offset = 0,
): CapturedEvent[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM events WHERE session_id = ? ORDER BY seq_num ASC LIMIT ? OFFSET ?',
    )
    .all(sessionId, limit, offset) as EventRow[];
  return rows.map(rowToEvent);
}

export function getSessionEventsByTool(
  sessionId: string,
  toolName: string,
): CapturedEvent[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM events WHERE session_id = ? AND tool_name = ? ORDER BY seq_num ASC',
    )
    .all(sessionId, toolName) as EventRow[];
  return rows.map(rowToEvent);
}

export function getSessionTimeline(sessionId: string): CapturedEvent[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC',
    )
    .all(sessionId) as EventRow[];
  return rows.map(rowToEvent);
}

export function getEventsForAnalysis(
  sessionId: string,
): CapturedEvent[] {
  return getSessionTimeline(sessionId);
}
