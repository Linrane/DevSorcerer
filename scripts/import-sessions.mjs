/**
 * Import Claude Code session JSONL files into DevTwin SQLite database.
 *
 * Usage:
 *   node scripts/import-sessions.mjs [--watch] [--project-dir <path>] [--db <path>]
 *
 *   --watch   Watch for new sessions and auto-import (poll every 30s)
 *
 * Reads Claude Code session data from ~/.claude/projects/<project>/<session>.jsonl
 * and populates DevTwin's SQLite database (projects, sessions, events, token_costs).
 */

import Database from 'better-sqlite3';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

// ── Config ────────────────────────────────────────────────────
const PROJECT_DIR =
  'd:/LInranesLittleBox/WorkingAndLearning/PersonalProject/DevTwin';
const DB_PATH = `${PROJECT_DIR}/.vault/devsorcerer.sqlite`;
const SESSIONS_DIR = `${os.homedir()}/.claude/projects/d--LInranesLittleBox-WorkingAndLearning-PersonalProject-DevTwin`;

// ── Pricing (USD per 1k tokens) ───────────────────────────────
const PRICING = {
  'deepseek-v4-pro': { inputPer1k: 0.00055, outputPer1k: 0.00219 },
  'claude-opus-4-7': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-sonnet-4-6': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-haiku-4-5': { inputPer1k: 0.001, outputPer1k: 0.005 },
  default: { inputPer1k: 0.003, outputPer1k: 0.015 },
};

function uuid() {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function hash(str) {
  // Normalize Windows drive letter case
  const normalized = str.replace(/^([A-Z]):/i, (_, d) => d.toLowerCase() + ':').replace(/\\/g, '/');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function estimateTokens(str) {
  return Math.ceil(str.length / 3.5);
}

function getPricing(model) {
  return PRICING[model] || PRICING.default;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('DevTwin Session Importer\n');

  // Open database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Ensure migrations ran (run 001_initial if tables missing)
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  if (!tables.includes('sessions') || !tables.includes('events')) {
    console.log('Running migrations...');
    const { migration001 } = await import(
      '../packages/devsorcerer/dist/storage/migrations/001_initial.js'
    );
    db.exec(migration001);
  }

  // Ensure project exists
  const projectId = hash(PROJECT_DIR);
  const projectName = path.basename(PROJECT_DIR);
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (existing) {
    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), projectId);
    console.log(`Project: ${projectName} (${projectId}) — updated`);
  } else {
    db.prepare(
      'INSERT INTO projects (id, name, root_path, updated_at) VALUES (?, ?, ?, ?)',
    ).run(projectId, projectName, PROJECT_DIR, Date.now());
    console.log(`Project: ${projectName} (${projectId}) — created`);
  }

  // Discover session JSONL files
  let files;
  try {
    files = (await readdir(SESSIONS_DIR)).filter((f) => f.endsWith('.jsonl'));
  } catch {
    console.error(`No session directory: ${SESSIONS_DIR}`);
    process.exit(1);
  }

  console.log(`\nFound ${files.length} session file(s)\n`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const filePath = path.join(SESSIONS_DIR, file);
    const fileStat = await stat(filePath);
    if (fileStat.size === 0) continue;

    const sessionId = file.replace('.jsonl', '');

    // Check if session already imported with events
    const existingSession = db.prepare(
      'SELECT s.id, s.total_events, COUNT(e.id) as event_count FROM sessions s LEFT JOIN events e ON s.id = e.session_id WHERE s.id = ? GROUP BY s.id'
    ).get(sessionId);
    if (existingSession && existingSession.event_count > 0) {
      console.log(`  ${file} — already imported (${existingSession.event_count} events), skipping`);
      totalSkipped++;
      continue;
    }
    if (existingSession) {
      // Clean up incomplete import
      db.prepare('DELETE FROM token_costs WHERE session_id = ?').run(sessionId);
      db.prepare('DELETE FROM events WHERE session_id = ?').run(sessionId);
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      console.log(`  ${file} — cleaning up incomplete import, re-importing...`);
    }

    console.log(`  Importing ${file} (${(fileStat.size / 1024).toFixed(0)} KB)...`);

    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let agentName = 'Claude Code';
    let agentVersion = '';
    let branch = 'main';
    let cwd = PROJECT_DIR;
    let sessionStartedAt = null;
    let sessionEndedAt = null;
    let seqNum = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCost = 0;
    let eventCount = 0;

    const insertEvent = db.prepare(
      `INSERT OR IGNORE INTO events (id, session_id, seq_num, timestamp, direction, msg_type, method, params, result, error, request_id, related_event_id, tool_name, message_size, estimated_tokens, latency_ms, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertTokenCost = db.prepare(
      `INSERT OR IGNORE INTO token_costs (id, session_id, tool_name, timestamp, tokens_input, tokens_output, model, cost, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertAll = db.transaction(() => {
      // We need to collect all lines first then insert
    });

    // Read all lines
    const lines = [];
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        lines.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    // Extract session metadata from first lines
    for (const entry of lines) {
      if (entry.cwd) cwd = entry.cwd;
      if (entry.version) agentVersion = entry.version;
      if (entry.gitBranch) branch = entry.gitBranch;
      if (entry.message?.model) agentName = `Claude Code (${entry.message.model})`;

      // Get start time from first entry with timestamp
      if (!sessionStartedAt && entry.timestamp) {
        sessionStartedAt = new Date(entry.timestamp).getTime();
      }
      // Track end time
      if (entry.timestamp) {
        sessionEndedAt = new Date(entry.timestamp).getTime();
      }
    }

    if (!sessionStartedAt) {
      console.log('    No timestamp found, skipping');
      totalSkipped++;
      continue;
    }

    // Use project-specific ID or generate one
    const actualProjectId = cwd ? hash(cwd) : projectId;

    // Upsert project for this cwd
    if (cwd && cwd !== PROJECT_DIR) {
      const cwdProjectId = hash(cwd);
      const cwdProjectName = path.basename(cwd);
      const cwdExisting = db.prepare('SELECT id FROM projects WHERE id = ?').get(cwdProjectId);
      if (!cwdExisting) {
        db.prepare(
          'INSERT INTO projects (id, name, root_path, updated_at) VALUES (?, ?, ?, ?)',
        ).run(cwdProjectId, cwdProjectName, cwd, Date.now());
      }
    }

    // Create session
    db.prepare(
      `INSERT OR IGNORE INTO sessions (id, project_id, agent_name, agent_version, branch, status, started_at, ended_at, metadata)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, '{}')`,
    ).run(sessionId, actualProjectId, agentName, agentVersion || null, branch || null, sessionStartedAt, sessionEndedAt);

    // Import events
    let lastRequestId = null;

    for (const entry of lines) {
      if (!entry.type || !entry.timestamp) continue;

      const ts = new Date(entry.timestamp).getTime();
      const eventId = entry.uuid || uuid();
      const parentId = entry.parentUuid || undefined;
      const messageSize = Buffer.byteLength(JSON.stringify(entry), 'utf-8');
      const tokens = estimateTokens(JSON.stringify(entry));

      let direction = 'server-to-client';
      let msgType = 'notification';
      let method = undefined;
      let params = undefined;
      let result = undefined;
      let error = undefined;
      let toolName = undefined;
      let requestId = undefined;
      const relatedEventId = parentId;

      // Helper: safely get content as array
      const msgContent = entry.message?.content;
      const contentArr = Array.isArray(msgContent) ? msgContent : (msgContent ? [{ type: 'text', text: String(msgContent) }] : []);

      switch (entry.type) {
        case 'user':
          direction = 'client-to-server';
          msgType = 'request';
          method = 'user.prompt';
          {
            const contentTypes = contentArr.map((c) => c.type || 'text');
            const firstText = contentArr.find((c) => c.text)?.text || '';
            params = {
              role: entry.message?.role,
              content: contentTypes.join(','),
              textLength: firstText.length,
            };
          }
          requestId = entry.uuid;
          lastRequestId = entry.uuid;
          break;

        case 'assistant':
          direction = 'server-to-client';
          msgType = 'response';
          requestId = parentId || lastRequestId;

          // Extract tool_use blocks
          const toolUses = contentArr.filter((c) => c.type === 'tool_use');
          const thinkingBlocks = contentArr.filter((c) => c.type === 'thinking');
          const textBlocks = contentArr.filter((c) => c.type === 'text');

          if (toolUses.length > 0) {
            // Create separate event for each tool_use
            for (const tu of toolUses) {
              seqNum++;
              method = 'tool.use';
              toolName = tu.name;
              params = { name: tu.name, input: tu.input };
              result = undefined;
              error = undefined;

              insertEvent.run(
                uuid(), sessionId, seqNum, ts, 'server-to-client', 'request',
                method, JSON.stringify(params), null, null,
                tu.id, eventId, toolName, messageSize, tokens, null, actualProjectId,
              );
              eventCount++;

              // Check for tool result in subsequent lines
              // (tool results come as separate user messages with tool_result type)
            }
          } else if (thinkingBlocks.length > 0 || textBlocks.length > 0) {
            method = 'assistant.message';
            const textContent = thinkingBlocks.map((t) => t.thinking || '').join('\n') +
              textBlocks.map((t) => t.text || '').join('\n');
            result = {
              model: entry.message?.model,
              stop_reason: entry.message?.stop_reason,
              content_types: entry.message?.content?.map((c) => c.type) || [],
            };
            params = textContent ? { preview: textContent.slice(0, 500) } : {};
          }

          // Track tokens
          if (entry.message?.usage) {
            const { input_tokens, output_tokens } = entry.message.usage;
            const model = entry.message.model || 'unknown';
            const pricing = getPricing(model);
            const cost =
              (input_tokens / 1000) * pricing.inputPer1k +
              (output_tokens / 1000) * pricing.outputPer1k;

            totalTokensIn += input_tokens || 0;
            totalTokensOut += output_tokens || 0;
            totalCost += cost;

            insertTokenCost.run(
              uuid(), sessionId, toolName || 'assistant', ts,
              input_tokens || 0, output_tokens || 0, model, cost, actualProjectId,
            );
          }
          break;

        case 'attachment':
          method = entry.attachment?.type || 'attachment';
          params = {
            type: entry.attachment?.type,
            hookName: entry.attachment?.hookName,
            skillCount: entry.attachment?.skillCount,
            isInitial: entry.attachment?.isInitial,
          };
          break;

        case 'system':
          method = `system.${entry.subtype || 'event'}`;
          params = {
            subtype: entry.subtype,
            hookCount: entry.hookCount,
            preventedContinuation: entry.preventedContinuation,
          };
          if (entry.hookErrors?.length > 0) {
            error = { code: 0, message: entry.hookErrors.join('; ') };
          }
          break;

        case 'file-history-snapshot':
          method = 'file.history.snapshot';
          params = {
            messageId: entry.messageId,
            isSnapshotUpdate: entry.isSnapshotUpdate,
          };
          break;

        case 'queue-operation':
          method = `queue.${entry.operation}`;
          break;

        default:
          method = entry.type;
          params = { type: entry.type };
          break;
      }

      seqNum++;
      insertEvent.run(
        eventId, sessionId, seqNum, ts, direction, msgType,
        method || null,
        params ? JSON.stringify(params) : null,
        result ? JSON.stringify(result) : null,
        error ? JSON.stringify(error) : null,
        requestId || null,
        relatedEventId || null,
        toolName || null,
        messageSize, tokens, null, actualProjectId,
      );
      eventCount++;
    }

    // Update session totals
    db.prepare(
      `UPDATE sessions SET total_events = ?, total_tokens = ?, total_cost = ? WHERE id = ?`,
    ).run(eventCount, totalTokensIn + totalTokensOut, totalCost, sessionId);

    console.log(`    ✓ ${eventCount} events, ${(totalTokensIn + totalTokensOut).toLocaleString()} tokens, $${totalCost.toFixed(4)} cost`);
    totalImported++;
  }

  // Summary
  const sessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
  const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  const totalCost = db.prepare('SELECT COALESCE(SUM(total_cost), 0) as c FROM sessions').get().c;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Import complete:`);
  console.log(`  New sessions imported: ${totalImported}`);
  console.log(`  Already imported:      ${totalSkipped}`);
  console.log(`  Total sessions in DB:  ${sessionCount}`);
  console.log(`  Total events in DB:    ${eventCount}`);
  console.log(`  Total tracked cost:    $${totalCost.toFixed(4)}`);
  console.log(`${'─'.repeat(50)}`);

  db.close();
  return totalImported;
}

// ── CLI Entry ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');

async function run() {
  let imported;
  do {
    imported = await main();
    if (watchMode) {
      console.log(`\nWatching for new sessions... (Ctrl+C to stop)`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  } while (watchMode);
}

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
