// ============================================================
// DevSorcerer Core Domain Types
// ============================================================

// ---- JSON-RPC 2.0 Types ----

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: JSONRPCError;
}

export type MessageType = 'request' | 'response' | 'notification';
export type MessageDirection = 'client-to-server' | 'server-to-client';

// ---- Project Context ----

export interface ProjectInfo {
  projectId: string;
  rootPath: string;
  remoteUrl?: string;
  branch?: string;
  commitHash?: string;
}

export interface AgentInfo {
  name: string;
  version?: string;
  capabilities?: Record<string, unknown>;
}

// ---- Session ----

export type SessionStatus = 'active' | 'completed' | 'error' | 'terminated';

export interface Session {
  id: string;
  projectId: string;
  agentName: string;
  agentVersion?: string;
  branch?: string;
  commitHash?: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  metadata: Record<string, unknown>;
  totalEvents: number;
  totalTokens: number;
  totalCost: number;
}

// ---- Events ----

export interface RawEvent {
  sessionId: string;
  seqNum: number;
  timestamp: number;
  direction: MessageDirection;
  msgType: MessageType;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: JSONRPCError;
  requestId?: string | number;
  messageSize: number;
}

export interface CapturedEvent extends RawEvent {
  id: string;
  relatedEventId?: string;
  toolName?: string;
  estimatedTokens: number;
  projectId: string;
  latencyMs?: number;
  isError: boolean;
}

// ---- Analysis: Cost ----

export interface ToolCostBreakdown {
  toolName: string;
  callCount: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface ModelCostBreakdown {
  model: string;
  callCount: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface SessionCost {
  sessionId: string;
  totalTokens: number;
  totalCost: number;
  toolBreakdown: ToolCostBreakdown[];
  modelBreakdown: ModelCostBreakdown[];
}

export interface ProjectCost {
  projectId: string;
  sessionCount: number;
  totalTokens: number;
  totalCost: number;
  dailyCosts: DailyCost[];
  toolBreakdown: ToolCostBreakdown[];
}

export interface DailyCost {
  date: string;
  tokens: number;
  cost: number;
  sessionCount: number;
}

// ---- Analysis: Risk ----

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskCategory =
  | 'secret'
  | 'injection'
  | 'path-traversal'
  | 'eval'
  | 'unsafe-dependency'
  | 'crypto'
  | 'auth';

export interface RiskFinding {
  id: string;
  sessionId: string;
  severity: RiskSeverity;
  category: RiskCategory;
  ruleId: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  snippet: string;
  description: string;
}

export interface RiskReport {
  sessionId: string;
  overallScore: number; // 0-100, higher = riskier
  findings: RiskFinding[];
}

export interface SecurityRule {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  patterns: RegExp[];
  fileGlobs?: string[];
}

// ---- Analysis: Quality ----

export interface QualityReport {
  sessionId: string;
  acceptanceRate: number;
  filesCreated: number;
  filesModified: number;
  filesAccepted: number;
  rollbackCount: number;
  bugCount: number | null; // null if no post-session tracking
}

export interface ProjectQuality {
  projectId: string;
  acceptanceRate: number;
  rollbackRate: number;
  aiBugRate: number;
  totalAiCommits: number;
}

// ---- Analysis: Bottleneck ----

export type ErrorLoopPattern = 'duplicate-params' | 'incremental-fix' | 'oscillating';

export interface ErrorLoop {
  toolName: string;
  attempts: number;
  errors: string[];
  durationMs: number;
  pattern: ErrorLoopPattern;
}

export interface ToolLatency {
  toolName: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
  callCount: number;
  isSlow: boolean;
}

export interface ThinkingStep {
  seq: number;
  eventId: string;
  toolName: string;
  timestamp: number;
  summary: string;
  latencyMs?: number;
  isError: boolean;
}

export interface BottleneckReport {
  sessionId: string;
  totalDurationMs: number;
  slowestTools: ToolLatency[];
  errorLoops: ErrorLoop[];
  thinkingChain: ThinkingStep[];
  feedbackLoops: FeedbackLoop[];
}

export interface FeedbackLoop {
  toolNames: string[];
  cycleCount: number;
  durationMs: number;
}

// ---- Knowledge ----

export interface DocumentChunk {
  id: string;
  sessionId: string;
  toolName: string;
  text: string;
  chunkHash: string;
  metadata: {
    timestamp: number;
    filePath?: string;
    projectBranch: string;
    tokenCount: number;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  contextBefore?: string;
  contextAfter?: string;
}

export interface SearchOptions {
  limit?: number;
  sessionId?: string;
  projectId?: string;
  toolFilter?: string[];
  dateRange?: DateRange;
  includeContext?: boolean;
  hybrid?: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  tookMs: number;
}

// ---- Audit ----

export interface AuditEntry {
  id: string;
  sessionId: string;
  eventId: string;
  timestamp: number;
  rawPayload: string;
  signature?: string;
}

export type AuditExportFormat = 'csv' | 'json' | 'ndjson';
export type AuditAnonymizeScope = 'full' | 'anonymized';

export interface AuditExportOptions {
  projectId?: string;
  dateRange?: DateRange;
  format: AuditExportFormat;
  scope: AuditAnonymizeScope;
  outputPath?: string;
}

// ---- Common ----

export interface DateRange {
  from?: string; // ISO date
  to?: string; // ISO date
}

export interface PricingEntry {
  inputPer1k: number;
  outputPer1k: number;
}

export type PricingTable = Record<string, PricingEntry>;

export interface DevSorcererConfig {
  dbPath: string;
  lancedbPath: string;
  serverPort: number;
  pricing: PricingTable;
  embeddingModel: string;
  anonymizeExport: boolean;
  dashboardEnabled: boolean;
  captureEnabled: boolean;
}

// ---- Repository Interfaces ----

export interface SessionRow {
  id: string;
  project_id: string;
  agent_name: string;
  agent_version: string | null;
  branch: string | null;
  commit_hash: string | null;
  status: string;
  started_at: number;
  ended_at: number | null;
  metadata: string;
  total_events: number;
  total_tokens: number;
  total_cost: number;
  created_at: number;
}

export interface EventRow {
  id: string;
  session_id: string;
  seq_num: number;
  timestamp: number;
  direction: string;
  msg_type: string;
  method: string | null;
  params: string | null;
  result: string | null;
  error: string | null;
  request_id: string | null;
  related_event_id: string | null;
  tool_name: string | null;
  message_size: number;
  estimated_tokens: number;
  latency_ms: number | null;
  project_id: string;
  created_at: number;
}
