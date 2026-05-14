import { getDb } from '../storage/db.js';
import { loadConfig } from '../config/loader.js';
import { isoDate, formatCost } from '../shared/utils.js';
import { DEFAULT_PRICING } from '../shared/constants.js';
import type {
  SessionCost,
  ProjectCost,
  DailyCost,
  ToolCostBreakdown,
  ModelCostBreakdown,
  PricingTable,
} from '../shared/types.js';

function resolvePricing(pricing?: PricingTable): PricingTable {
  if (pricing && Object.keys(pricing).length > 0) return pricing;
  const cfg = loadConfig().pricing;
  if (cfg && Object.keys(cfg).length > 0) return cfg;
  return DEFAULT_PRICING;
}

function getModelRate(pricing: PricingTable, model: string | null): PricingEntry {
  if (model && pricing[model]) return pricing[model]!;
  if (model) {
    const keys = Object.keys(pricing).filter(k => k !== 'default');
    for (const key of keys) {
      if ((model.startsWith(key) || key.startsWith(model)) && pricing[key]) return pricing[key]!;
    }
  }
  return (pricing.default as PricingEntry) || { inputPer1k: 0.003, outputPer1k: 0.015 };
}

// Import needed type
import type { PricingEntry } from '../shared/types.js';

export class CostAnalyzer {
  private pricing: PricingTable;

  constructor(pricing?: PricingTable) {
    this.pricing = resolvePricing(pricing);
  }

  analyzeSession(sessionId: string): SessionCost {
    const db = getDb();

    // ── Tool breakdown from token_costs ──
    const toolRows = db
      .prepare(
        `SELECT tool_name, COUNT(*) as call_count,
                COALESCE(SUM(tokens_input), 0) as total_input,
                COALESCE(SUM(tokens_output), 0) as total_output,
                COALESCE(SUM(cost), 0) as total_cost
         FROM token_costs WHERE session_id = ?
         GROUP BY tool_name ORDER BY total_cost DESC`,
      )
      .all(sessionId) as Array<{
      tool_name: string; call_count: number;
      total_input: number; total_output: number; total_cost: number;
    }>;

    // ── Model breakdown from token_costs ──
    const modelRows = db
      .prepare(
        `SELECT COALESCE(model, 'unknown') as model, COUNT(*) as call_count,
                COALESCE(SUM(tokens_input), 0) as total_input,
                COALESCE(SUM(tokens_output), 0) as total_output,
                COALESCE(SUM(cost), 0) as total_cost
         FROM token_costs WHERE session_id = ?
         GROUP BY model ORDER BY total_cost DESC`,
      )
      .all(sessionId) as Array<{
      model: string; call_count: number;
      total_input: number; total_output: number; total_cost: number;
    }>;

    if (toolRows.length === 0) {
      return this.analyzeSessionFromEvents(sessionId);
    }

    const toolBreakdown: ToolCostBreakdown[] = toolRows.map((r) => ({
      toolName: r.tool_name,
      callCount: r.call_count,
      tokensIn: r.total_input,
      tokensOut: r.total_output,
      cost: r.total_cost,
    }));

    const modelBreakdown: ModelCostBreakdown[] = modelRows
      .filter((r) => r.model !== '<synthetic>' && r.total_cost > 0)
      .map((r) => ({
        model: r.model,
        callCount: r.call_count,
        tokensIn: r.total_input,
        tokensOut: r.total_output,
        cost: r.total_cost,
      }));

    const totalTokens = toolBreakdown.reduce((s, t) => s + t.tokensIn + t.tokensOut, 0);
    const totalCost = toolBreakdown.reduce((s, t) => s + t.cost, 0);

    return { sessionId, totalTokens, totalCost, toolBreakdown, modelBreakdown };
  }

  private analyzeSessionFromEvents(sessionId: string): SessionCost {
    const db = getDb();

    const toolRows = db
      .prepare(
        `SELECT tool_name, COUNT(*) as call_count,
                COALESCE(SUM(estimated_tokens), 0) as total_tokens
         FROM events WHERE session_id = ? AND tool_name IS NOT NULL
         GROUP BY tool_name ORDER BY total_tokens DESC`,
      )
      .all(sessionId) as Array<{ tool_name: string; call_count: number; total_tokens: number }>;

    // Try to get model info from token_costs — if any exist use those rates
    const modelInfo = db
      .prepare('SELECT DISTINCT model FROM token_costs WHERE session_id = ? AND model IS NOT NULL LIMIT 1')
      .get(sessionId) as { model: string } | undefined;

    const detectedModel = modelInfo?.model ?? null;
    const rate = getModelRate(this.pricing, detectedModel) || this.pricing.default || { inputPer1k: 0.003, outputPer1k: 0.015 };

    const toolBreakdown: ToolCostBreakdown[] = toolRows.map((r) => {
      // For tool calls the token split is roughly the estimated tokens
      // 30% input context + 70% output = tool params and results
      const tokensIn = Math.round(r.total_tokens * 0.3);
      const tokensOut = Math.round(r.total_tokens * 0.7);
      const cost =
        (tokensIn / 1000) * rate.inputPer1k +
        (tokensOut / 1000) * rate.outputPer1k;
      return {
        toolName: r.tool_name,
        callCount: r.call_count,
        tokensIn,
        tokensOut,
        cost: Math.round(cost * 10000) / 10000,
      };
    });

    const totalTokens = toolRows.reduce((s, r) => s + r.total_tokens, 0);

    return {
      sessionId,
      totalTokens,
      totalCost: toolBreakdown.reduce((s, t) => s + t.cost, 0),
      toolBreakdown,
      modelBreakdown: detectedModel
        ? [{ model: detectedModel, callCount: 1, tokensIn: totalTokens, tokensOut: 0, cost: 0 }]
        : [],
    };
  }

  analyzeProject(projectId: string, from?: string, to?: string): ProjectCost {
    const db = getDb();
    const isAllProjects = projectId === 'all';

    let query = `
      SELECT s.id as session_id, s.started_at, tc.tool_name,
             COALESCE(SUM(tc.tokens_input), 0) as total_input,
             COALESCE(SUM(tc.tokens_output), 0) as total_output,
             COALESCE(SUM(tc.cost), 0) as total_cost,
             COUNT(*) as call_count
      FROM sessions s
      LEFT JOIN token_costs tc ON tc.session_id = s.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (!isAllProjects) { params.push(projectId); query += ' AND s.project_id = ?'; }
    if (from) { params.push(new Date(from).getTime()); query += ' AND s.started_at >= ?'; }
    if (to)   { params.push(new Date(to).getTime());   query += ' AND s.started_at <= ?'; }
    query += ' GROUP BY tc.tool_name ORDER BY total_cost DESC';

    const rows = db.prepare(query).all(...params) as Array<{
      session_id: string; started_at: number; tool_name: string | null;
      total_input: number; total_output: number; total_cost: number; call_count: number;
    }>;

    // Also get model breakdown for project
    let modelQuery = `
      SELECT COALESCE(tc.model, 'unknown') as model, COUNT(*) as call_count,
             COALESCE(SUM(tc.tokens_input), 0) as total_input,
             COALESCE(SUM(tc.tokens_output), 0) as total_output,
             COALESCE(SUM(tc.cost), 0) as total_cost
      FROM sessions s
      JOIN token_costs tc ON tc.session_id = s.id
      WHERE 1=1
    `;
    const modelParams: unknown[] = [];
    if (!isAllProjects) { modelParams.push(projectId); modelQuery += ' AND s.project_id = ?'; }
    if (from) { modelParams.push(new Date(from).getTime()); modelQuery += ' AND s.started_at >= ?'; }
    if (to)   { modelParams.push(new Date(to).getTime());   modelQuery += ' AND s.started_at <= ?'; }
    modelQuery += ' GROUP BY tc.model ORDER BY total_cost DESC';

    const modelRows = db.prepare(modelQuery).all(...modelParams) as Array<{
      model: string; call_count: number; total_input: number; total_output: number; total_cost: number;
    }>;

    // Group by tool
    const toolMap = new Map<string, ToolCostBreakdown>();
    const dailyMap = new Map<string, { tokens: number; cost: number; sessions: Set<string> }>();

    for (const r of rows) {
      const tool = r.tool_name || 'unknown';
      const e = toolMap.get(tool) || { toolName: tool, callCount: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
      e.callCount += r.call_count;
      e.tokensIn += r.total_input;
      e.tokensOut += r.total_output;
      e.cost += r.total_cost;
      toolMap.set(tool, e);

      const day = isoDate(r.started_at);
      const d = dailyMap.get(day) || { tokens: 0, cost: 0, sessions: new Set() };
      d.tokens += r.total_input + r.total_output;
      d.cost += r.total_cost;
      d.sessions.add(r.session_id);
      dailyMap.set(day, d);
    }

    const dailyCosts: DailyCost[] = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, tokens: d.tokens, cost: d.cost, sessionCount: d.sessions.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const toolBreakdown = Array.from(toolMap.values()).sort((a, b) => b.cost - a.cost);
    const modelBreakdown: ModelCostBreakdown[] = modelRows
      .filter(r => r.model !== '<synthetic>' && r.total_cost > 0)
      .map(r => ({
        model: r.model, callCount: r.call_count,
        tokensIn: r.total_input, tokensOut: r.total_output, cost: r.total_cost,
      }));

    const totalTokens = toolBreakdown.reduce((s, t) => s + t.tokensIn + t.tokensOut, 0);
    const totalCost = toolBreakdown.reduce((s, t) => s + t.cost, 0);

    return {
      projectId,
      sessionCount: new Set(rows.map((r) => r.session_id)).size,
      totalTokens, totalCost,
      dailyCosts, toolBreakdown, modelBreakdown,
    };
  }

  formatSessionReport(cost: SessionCost): string {
    const lines: string[] = [
      `Session: ${cost.sessionId}`,
      `Total Tokens:   ${cost.totalTokens.toLocaleString()}`,
      `Total Cost:     ${formatCost(cost.totalCost)}`,
      '',
      'Tool Breakdown:',
      '──────────────────────────────────────────',
    ];
    for (const t of cost.toolBreakdown) {
      lines.push(`  ${t.toolName.padEnd(20)} ${t.callCount.toString().padStart(4)} calls  ${formatCost(t.cost).padStart(10)}  (${t.tokensIn.toLocaleString()} in / ${t.tokensOut.toLocaleString()} out)`);
    }
    if (cost.modelBreakdown.length > 0) {
      lines.push('', 'Model Breakdown:', '──────────────────────────────────────────');
      for (const m of cost.modelBreakdown) {
        lines.push(`  ${m.model.padEnd(25)} ${m.callCount.toString().padStart(4)} calls  ${formatCost(m.cost).padStart(10)}`);
      }
    }
    return lines.join('\n');
  }
}
