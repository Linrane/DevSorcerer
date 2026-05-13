export const migration001 = `
-- Projects detected from git repos
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  root_path   TEXT NOT NULL,
  remote_url  TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Each agent invocation = one session
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  agent_name  TEXT NOT NULL,
  agent_version TEXT,
  branch      TEXT,
  commit_hash TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  metadata    TEXT,
  total_events INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost  REAL DEFAULT 0.0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Every intercepted JSON-RPC message
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  seq_num     INTEGER NOT NULL,
  timestamp   INTEGER NOT NULL,
  direction   TEXT NOT NULL,
  msg_type    TEXT NOT NULL,
  method      TEXT,
  params      TEXT,
  result      TEXT,
  error       TEXT,
  request_id  TEXT,
  related_event_id TEXT,
  tool_name   TEXT,
  message_size INTEGER,
  estimated_tokens INTEGER,
  latency_ms  INTEGER,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, seq_num);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool_name, session_id);
CREATE INDEX IF NOT EXISTS idx_events_project_time ON events(project_id, timestamp);

-- Analysis results cache
CREATE TABLE IF NOT EXISTS analysis_results (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  analysis_type TEXT NOT NULL,
  result      TEXT NOT NULL,
  computed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  version     INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_unique
  ON analysis_results(session_id, analysis_type);

-- Token cost tracking by tool
CREATE TABLE IF NOT EXISTS token_costs (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  tool_name   TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  tokens_input  INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  model       TEXT,
  cost        REAL DEFAULT 0.0,
  project_id  TEXT NOT NULL REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_token_costs_session ON token_costs(session_id);
CREATE INDEX IF NOT EXISTS idx_token_costs_project_date ON token_costs(project_id, timestamp);

-- Security risk findings
CREATE TABLE IF NOT EXISTS risk_findings (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  severity    TEXT NOT NULL,
  category    TEXT NOT NULL,
  rule_id     TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  line_start  INTEGER,
  line_end    INTEGER,
  snippet     TEXT NOT NULL,
  description TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_risk_session ON risk_findings(session_id);

-- Quality events (commits, rollbacks, bug fixes attributed to AI)
CREATE TABLE IF NOT EXISTS quality_events (
  id          TEXT PRIMARY KEY,
  session_id  TEXT,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  event_type  TEXT NOT NULL,
  file_path   TEXT,
  commit_hash TEXT,
  details     TEXT,
  timestamp   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_project ON quality_events(project_id, event_type, timestamp);

-- Knowledge search chunk metadata (vectors stored in LanceDB)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  tool_name   TEXT,
  chunk_text  TEXT NOT NULL,
  chunk_hash  TEXT NOT NULL,
  metadata    TEXT,
  lancedb_row_id INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_knowledge_session ON knowledge_chunks(session_id);

-- Key-value configuration
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Immutable audit trail for compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  raw_payload TEXT NOT NULL,
  signature   TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp);
`;
