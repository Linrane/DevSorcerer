const BASE_URL = '/api';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Sessions
export function getSessions(params?: { project_id?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.project_id) search.set('project_id', params.project_id);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  return fetchAPI<{ sessions: Session[] }>(`/sessions?${search}`);
}

export function getSession(id: string) {
  return fetchAPI<Session>(`/sessions/${id}`);
}

export function getSessionTimeline(id: string) {
  return fetchAPI<{ sessionId: string; steps: TimelineStep[] }>(
    `/sessions/${id}/timeline`,
  );
}

export function getSessionEvents(
  id: string,
  params?: { tool?: string; limit?: number; offset?: number },
) {
  const search = new URLSearchParams();
  if (params?.tool) search.set('tool', params.tool);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  return fetchAPI<{ events: CapturedEvent[] }>(
    `/sessions/${id}/events?${search}`,
  );
}

// Analysis
export function getCostAnalysis(params: {
  project_id?: string;
  session_id?: string;
  from?: string;
  to?: string;
}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  return fetchAPI<SessionCost | ProjectCost>(`/analysis/cost?${search}`);
}

export function getRiskAnalysis(params: {
  session_id?: string;
  project_id?: string;
  severity?: string;
}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  return fetchAPI<RiskReport>(`/analysis/risk?${search}`);
}

export function getQualityAnalysis(params: {
  session_id?: string;
  project_id?: string;
  from?: string;
  to?: string;
}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  return fetchAPI<QualityReport | ProjectQuality>(
    `/analysis/quality?${search}`,
  );
}

// Knowledge
export function searchKnowledge(params: {
  q: string;
  project_id?: string;
  session_id?: string;
  limit?: number;
  hybrid?: boolean;
}) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  if (params.project_id) search.set('project_id', params.project_id);
  if (params.session_id) search.set('session_id', params.session_id);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.hybrid) search.set('hybrid', 'true');
  return fetchAPI<SearchResponse>(`/knowledge/search?${search}`);
}

// Status
export function getStatus() {
  return fetchAPI<{
    status: string;
    version: string;
    uptime: number;
    database: { sessions: number; events: number; projects: number };
    dashboard: { connectedClients: number };
  }>('/status');
}

// Audit
export function exportAudit(params: {
  project_id?: string;
  from?: string;
  to?: string;
  format?: string;
  scope?: string;
}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  return fetchAPI<{ export: Record<string, unknown> }>(
    `/audit/export?${search}`,
  );
}

// Settings
export function getSettings() {
  return fetchAPI<Record<string, unknown>>('/settings');
}

export function updateSettings(settings: Record<string, unknown>) {
  return fetchAPI<Record<string, unknown>>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export function resetPricing() {
  return fetchAPI<{ success: boolean; pricing: Record<string, { inputPer1k: number; outputPer1k: number }> }>(
    '/settings/pricing/reset',
    { method: 'POST' },
  );
}

// Types (mirror from backend)
export interface Session {
  id: string;
  projectId: string;
  agentName: string;
  agentVersion?: string;
  branch?: string;
  status: string;
  startedAt: number;
  endedAt?: number;
  totalEvents: number;
  totalTokens: number;
  totalCost: number;
  projectName?: string;
  title?: string;
  modelName?: string;
}

export interface TimelineStep {
  id: string;
  timestamp: number;
  toolName?: string;
  direction: string;
  isError: boolean;
  latencyMs?: number;
  summary: string;
}

export interface CapturedEvent {
  id: string;
  sessionId: string;
  seqNum: number;
  timestamp: number;
  toolName?: string;
  method?: string;
  direction: string;
  isError: boolean;
  latencyMs?: number;
  estimatedTokens: number;
}

export interface SessionCost {
  sessionId: string;
  totalTokens: number;
  totalCost: number;
  toolBreakdown: { toolName: string; callCount: number; tokensIn: number; tokensOut: number; cost: number }[];
  modelBreakdown: { model: string; callCount: number; tokensIn: number; tokensOut: number; cost: number }[];
}

export interface ProjectCost {
  projectId: string;
  sessionCount: number;
  totalTokens: number;
  totalCost: number;
  dailyCosts: { date: string; tokens: number; cost: number; sessionCount: number }[];
  toolBreakdown: { toolName: string; callCount: number; tokensIn: number; tokensOut: number; cost: number }[];
  modelBreakdown: { model: string; callCount: number; tokensIn: number; tokensOut: number; cost: number }[];
}

export interface RiskFinding {
  id: string;
  sessionId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  ruleId: string;
  filePath: string;
  lineStart?: number;
  snippet: string;
  description: string;
}

export interface RiskReport {
  sessionId: string;
  overallScore: number;
  findings: RiskFinding[];
}

export interface QualityReport {
  sessionId: string;
  acceptanceRate: number;
  filesCreated: number;
  filesModified: number;
  filesAccepted: number;
  rollbackCount: number;
  bugCount: number | null;
}

export interface ProjectQuality {
  projectId: string;
  acceptanceRate: number;
  rollbackRate: number;
  aiBugRate: number;
  totalAiCommits: number;
  filesCreated?: number;
  filesModified?: number;
  filesAccepted?: number;
  rollbackCount?: number;
  bugCount?: number | null;
}

export interface SearchResult {
  chunk: {
    id: string;
    sessionId: string;
    toolName: string;
    text: string;
    metadata: { timestamp: number; filePath?: string; projectBranch: string; tokenCount: number };
  };
  score: number;
  contextBefore?: string;
  contextAfter?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  tookMs: number;
}
