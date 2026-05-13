import { getDb } from '../storage/db.js';
import { loadConfig } from '../config/loader.js';
import { isoDate, formatCost } from '../shared/utils.js';
import type {
  SessionCost,
  ProjectCost,
  DailyCost,
  ToolCostBreakdown,
  PricingTable,
} from '../shared/types.js';

const DEFAULT_PRICING: PricingTable = {
  'claude-sonnet-4-20250514': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-opus-4-20250514': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-haiku-4-5-20251001': { inputPer1k: 0.001, outputPer1k: 0.005 },
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-4.1': { inputPer1k: 0.003, outputPer1k: 0.024 },
  'gpt-5': { inputPer1k: 0.01, outputPer1k: 0.04 },
  'deepseek-v4': { inputPer1k: 0.0015, outputPer1k: 0.006 },
  default: { inputPer1k: 0.005, outputPer1k: 0.02 },
};

export class CostAnalyzer {
  private pricing: PricingTable;

  constructor(pricing?: PricingTable) {
    this.pricing = pricing || loadConfig().pricing || DEFAULT_PRICING;
  }

  analyzeSession(sessionId: string): SessionCost {
    const db = getDb();

    // Aggregate by tool from token_costs table
    const toolRows = db
      .prepare(
        `SELECT tool_name, COUNT(*) as call_count,
                COALESCE(SUM(tokens_input), 0) as total_input,
                COALESCE(SUM(tokens_output), 0) as total_output,
                COALESCE(SUM(cost), 0) as total_cost
         FROM token_costs
         WHERE session_id = ?
         GROUP BY tool_name
         ORDER BY total_cost DESC`,
      )
      .all(sessionId) as Array<{
      tool_name: string;
      call_count: number;
      total_input: number;
      total_output: number;
      total_cost: number;
    }>;

    const toolBreakdown: ToolCostBreakdown[] = toolRows.map((r) => ({
      toolName: r.tool_name,
      callCount: r.call_count,
      tokensIn: r.total_input,
      tokensOut: r.total_output,
      cost: r.total_cost,
    }));

    // If no token_costs yet, fall back to events table
    if (toolBreakdown.length === 0) {
      return this.analyzeSessionFromEvents(sessionId);
    }

    const totalTokens =
      toolBreakdown.reduce((s, t) => s + t.tokensIn + t.tokensOut, 0);
    const totalCost = toolBreakdown.reduce((s, t) => s + t.cost, 0);

    return {
      sessionId,
      totalTokens,
      totalCost,
      toolBreakdown,
      modelBreakdown: [], // Populated from actual model detection
    };
  }

  private analyzeSessionFromEvents(sessionId: string): SessionCost {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT tool_name, COUNT(*) as call_count,
                COALESCE(SUM(estimated_tokens), 0) as total_tokens
         FROM events
         WHERE session_id = ? AND tool_name IS NOT NULL
         GROUP BY tool_name
         ORDER BY total_tokens DESC`,
      )
      .all(sessionId) as Array<{
      tool_name: string;
      call_count: number;
      total_tokens: number;
    }>;

    const defaultRate = this.pricing.default || { inputPer1k: 0.005, outputPer1k: 0.02 };
    const toolBreakdown: ToolCostBreakdown[] = rows.map((r) => {
      // Rough split: 30% input, 70% output for tool calls
      const tokensIn = Math.round(r.total_tokens * 0.3);
      const tokensOut = Math.round(r.total_tokens * 0.7);
      const cost =
        (tokensIn / 1000) * defaultRate.inputPer1k +
        (tokensOut / 1000) * defaultRate.outputPer1k;
      return {
        toolName: r.tool_name,
        callCount: r.call_count,
        tokensIn,
        tokensOut,
        cost: Math.round(cost * 10000) / 10000,
      };
    });

    return {
      sessionId,
      totalTokens: rows.reduce((s, r) => s + r.total_tokens, 0),
      totalCost: toolBreakdown.reduce((s, t) => s + t.cost, 0),
      toolBreakdown,
      modelBreakdown: [],
    };
  }

  analyzeProject(
    projectId: string,
    from?: string,
    to?: string,
  ): ProjectCost {
    const db = getDb();

    let query = `
      SELECT s.id as session_id, s.started_at, tc.tool_name,
             COALESCE(SUM(tc.tokens_input), 0) as total_input,
             COALESCE(SUM(tc.tokens_output), 0) as total_output,
             COALESCE(SUM(tc.cost), 0) as total_cost,
             COUNT(*) as call_count
      FROM sessions s
      LEFT JOIN token_costs tc ON tc.session_id = s.id
      WHERE s.project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (from) {
      const fromTs = new Date(from).getTime();
      query += ' AND s.started_at >= ?';
      params.push(fromTs);
    }
    if (to) {
      const toTs = new Date(to).getTime();
      query += ' AND s.started_at <= ?';
      params.push(toTs);
    }

    query += ' GROUP BY tc.tool_name ORDER BY total_cost DESC';

    const rows = db.prepare(query).all(...params) as Array<{
      session_id: string;
      started_at: number;
      tool_name: string | null;
      total_input: number;
      total_output: number;
      total_cost: number;
      call_count: number;
    }>;

    // Group by tool
    const toolMap = new Map<string, ToolCostBreakdown>();
    const dailyMap = new Map<string, { tokens: number; cost: number; sessions: Set<string> }>();

    for (const r of rows) {
      const tool = r.tool_name || 'unknown';
      const existing = toolMap.get(tool) || {
        toolName: tool,
        callCount: 0,
        tokensIn: 0,
        tokensOut: 0,
        cost: 0,
      };
      existing.callCount += r.call_count;
      existing.tokensIn += r.total_input;
      existing.tokensOut += r.total_output;
      existing.cost += r.total_cost;
      toolMap.set(tool, existing);

      // Daily aggregation
      const day = isoDate(r.started_at);
      const daily = dailyMap.get(day) || {
        tokens: 0,
        cost: 0,
        sessions: new Set(),
      };
      daily.tokens += r.total_input + r.total_output;
      daily.cost += r.total_cost;
      daily.sessions.add(r.session_id);
      dailyMap.set(day, daily);
    }

    const dailyCosts: DailyCost[] = Array.from(dailyMap.entries())
      .map(([date, d]) => ({
        date,
        tokens: d.tokens,
        cost: d.cost,
        sessionCount: d.sessions.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const toolBreakdown = Array.from(toolMap.values()).sort(
      (a, b) => b.cost - a.cost,
    );

    const totalTokens = toolBreakdown.reduce(
      (s, t) => s + t.tokensIn + t.tokensOut,
      0,
    );
    const totalCost = toolBreakdown.reduce((s, t) => s + t.cost, 0);

    return {
      projectId,
      sessionCount: new Set(rows.map((r) => r.session_id)).size,
      totalTokens,
      totalCost,
      dailyCosts,
      toolBreakdown,
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
      lines.push(
        `  ${t.toolName.padEnd(20)} ${t.callCount.toString().padStart(4)} calls  ${formatCost(t.cost).padStart(10)}  (${t.tokensIn.toLocaleString()} in / ${t.tokensOut.toLocaleString()} out)`,
      );
    }

    return lines.join('\n');
  }
}
