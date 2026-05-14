import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../storage/db.js';
import { generateId } from '../shared/utils.js';
import { loadConfig } from '../config/loader.js';
import { DEFAULT_PRICING } from '../shared/constants.js';
import type { PricingTable, PricingEntry } from '../shared/types.js';

interface CCUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface CCContentBlock {
  type: string;
  name?: string;
  id?: string;
  text?: string;
  thinking?: string;
}

interface CCMessage {
  id: string;
  role: string;
  model?: string;
  content?: CCContentBlock[];
  usage?: CCUsage;
}

interface CCEntry {
  type: string;
  uuid: string;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  entrypoint?: string;
  message?: CCMessage;
}

function resolvePricing(): PricingTable {
  const cfg = loadConfig().pricing;
  if (cfg && Object.keys(cfg).length > 0) return cfg;
  return DEFAULT_PRICING;
}

function getModelRate(pricing: PricingTable, model: string | null): PricingEntry {
  if (model && pricing[model]) return pricing[model]!;
  if (model) {
    for (const key of Object.keys(pricing)) {
      if (key === 'default') continue;
      if (model.startsWith(key) || key.startsWith(model)) {
        const entry = pricing[key];
        if (entry) return entry;
      }
    }
  }
  return (pricing.default as PricingEntry) || { inputPer1k: 0.003, outputPer1k: 0.015 };
}

function buildProjectId(cwd: string): string {
  let hash = 0;
  for (let i = 0; i < cwd.length; i++) {
    hash = (hash << 5) - hash + cwd.charCodeAt(i);
    hash |= 0;
  }
  const name = cwd.split(/[/\\]/).pop() || 'unknown';
  return `${name}-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

function upsertProject(id: string, rootPath: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) {
    const name = rootPath.split(/[/\\]/).pop() || id;
    db.prepare(
      'INSERT INTO projects (id, name, root_path) VALUES (?, ?, ?)',
    ).run(id, name, rootPath);
  }
}

function sessionExists(sessionId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  return !!row;
}

export interface ImportResult {
  sessionId: string;
  projectId: string;
  totalTokens: number;
  totalCost: number;
  toolCalls: number;
  skipped: boolean;
  error?: string;
}

export function importSessionFile(jsonlPath: string): ImportResult {
  const raw = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = raw.trim().split('\n');

  // Extract session metadata from first few entries
  let sessionId = '';
  let cwd = '';
  let gitBranch = '';
  let agentVersion = '';
  let agentName = 'claude-code';
  let startedAt = Date.now();

  for (const line of lines) {
    try {
      const entry: CCEntry = JSON.parse(line);
      if (entry.sessionId) sessionId = entry.sessionId;
      if (entry.cwd) cwd = entry.cwd;
      if (entry.gitBranch) gitBranch = entry.gitBranch;
      if (entry.version) agentVersion = entry.version;
      if (entry.entrypoint) agentName = entry.entrypoint;
      if (entry.timestamp && !startedAt) {
        startedAt = new Date(entry.timestamp).getTime();
      }
      if (sessionId && cwd) break;
    } catch { /* skip malformed lines */ }
  }

  if (!sessionId) {
    return { sessionId: '', projectId: '', totalTokens: 0, totalCost: 0, toolCalls: 0, skipped: true, error: 'No sessionId found' };
  }

  if (sessionExists(sessionId)) {
    return { sessionId, projectId: '', totalTokens: 0, totalCost: 0, toolCalls: 0, skipped: true };
  }

  const projectId = buildProjectId(cwd || process.cwd());
  upsertProject(projectId, cwd || process.cwd());

  const db = getDb();
  const pricing = resolvePricing();

  // Create session
  const firstTs = lines.length > 0 ? (() => {
    try { return new Date((JSON.parse(lines[0]!) as CCEntry).timestamp || '').getTime(); } catch { return Date.now(); }
  })() : Date.now();

  const lastTs = lines.length > 0 ? (() => {
    try { return new Date((JSON.parse(lines[lines.length - 1]!) as CCEntry).timestamp || '').getTime(); } catch { return Date.now(); }
  })() : Date.now();

  db.prepare(
    `INSERT INTO sessions (id, project_id, agent_name, agent_version, branch, status, started_at, ended_at, metadata)
     VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, '{}')`,
  ).run(sessionId, projectId, agentName, agentVersion || null, gitBranch || null, firstTs, lastTs);

  // Process assistant messages.
  // Streaming produces multiple entries per message.id (thinking + text/tool_use chunks).
  // We deduplicate token counting by message.id, but scan ALL chunks for tool_use content.
  const seenMsgIds = new Set<string>();
  let totalTokens = 0;
  let totalCost = 0;
  const toolCallCounts = new Map<string, number>();
  const modelTokens = new Map<string, { input: number; output: number }>();

  for (const line of lines) {
    try {
      const entry: CCEntry = JSON.parse(line);
      if (entry.type !== 'assistant' || !entry.message) continue;

      const msg = entry.message;
      if (!msg.id) continue;

      const isNew = !seenMsgIds.has(msg.id);

      // Always scan for tool_use blocks (may be in a different chunk than usage)
      if (msg.content) {
        for (const block of msg.content) {
          if (block.type === 'tool_use' && block.name) {
            toolCallCounts.set(block.name, (toolCallCounts.get(block.name) || 0) + 1);
          }
        }
      }

      // Only count tokens once per message.id
      if (!isNew) continue;
      seenMsgIds.add(msg.id);

      const model = msg.model || 'unknown';
      const usage = msg.usage;
      if (!usage) continue;

      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      totalTokens += inputTokens + outputTokens;

      const mt = modelTokens.get(model) || { input: 0, output: 0 };
      mt.input += inputTokens;
      mt.output += outputTokens;
      modelTokens.set(model, mt);
    } catch { /* skip */ }
  }

  // Calculate costs per model and insert token_costs
  for (const [model, tokens] of modelTokens) {
    const rate = getModelRate(pricing, model);
    const cost =
      (tokens.input / 1000) * rate.inputPer1k +
      (tokens.output / 1000) * rate.outputPer1k;

    // Insert one token_cost aggregate per model for this session
    db.prepare(
      `INSERT INTO token_costs (id, session_id, tool_name, timestamp, tokens_input, tokens_output, model, cost, project_id)
       VALUES (?, ?, 'session', ?, ?, ?, ?, ?, ?)`,
    ).run(
      generateId(), sessionId, firstTs,
      tokens.input, tokens.output, model,
      Math.round(cost * 10000) / 10000, projectId,
    );
    totalCost += cost;
  }

  totalCost = Math.round(totalCost * 10000) / 10000;

  // If no assistant messages found, create at least one token_cost entry from events
  if (modelTokens.size === 0) {
    // Count tool uses at minimum
    let toolCallsTotal = 0;
    for (const count of toolCallCounts.values()) toolCallsTotal += count;

    if (toolCallsTotal > 0) {
      const rate = getModelRate(pricing, null);
      const estimatedInput = toolCallsTotal * 2000;
      const estimatedOutput = toolCallsTotal * 500;
      const cost =
        (estimatedInput / 1000) * rate.inputPer1k +
        (estimatedOutput / 1000) * rate.outputPer1k;

      db.prepare(
        `INSERT INTO token_costs (id, session_id, tool_name, timestamp, tokens_input, tokens_output, model, cost, project_id)
         VALUES (?, ?, 'session', ?, ?, ?, 'unknown', ?, ?)`,
      ).run(
        generateId(), sessionId, firstTs,
        estimatedInput, estimatedOutput,
        Math.round(cost * 10000) / 10000, projectId,
      );
      totalTokens = estimatedInput + estimatedOutput;
      totalCost = Math.round(cost * 10000) / 10000;
    }
  }

  // Update session totals
  let totalEvents = 0;
  for (const count of toolCallCounts.values()) totalEvents += count;

  db.prepare(
    'UPDATE sessions SET total_events = ?, total_tokens = ?, total_cost = ? WHERE id = ?',
  ).run(totalEvents, totalTokens, totalCost, sessionId);

  return { sessionId, projectId, totalTokens, totalCost, toolCalls: totalEvents, skipped: false };
}

export function importAllClaudeCodeSessions(): ImportResult[] {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  const ccProjectsDir = path.join(home, '.claude', 'projects');

  if (!fs.existsSync(ccProjectsDir)) {
    return [];
  }

  const results: ImportResult[] = [];

  for (const entry of fs.readdirSync(ccProjectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(ccProjectsDir, entry.name);
    for (const file of fs.readdirSync(projectDir)) {
      if (!file.endsWith('.jsonl')) continue;
      const jsonlPath = path.join(projectDir, file);
      try {
        const result = importSessionFile(jsonlPath);
        results.push(result);
      } catch (err) {
        results.push({
          sessionId: file.replace('.jsonl', ''),
          projectId: '',
          totalTokens: 0,
          totalCost: 0,
          toolCalls: 0,
          skipped: true,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return results;
}
