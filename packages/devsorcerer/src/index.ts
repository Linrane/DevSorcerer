// DevSorcerer - AI Development Observatory Platform

// Collector
export { MCPProxy } from './collector/proxy.js';
export { JSONRPCParser, MessageCorrelator } from './collector/jsonrpc.js';
export { StdioMCPTransport } from './collector/transport.js';
export { EventEnricher } from './collector/enricher.js';
export { SessionManager } from './collector/session.js';

// Analyzers
export { CostAnalyzer } from './analyzer/cost.js';
export { RiskAnalyzer } from './analyzer/risk.js';
export { QualityAnalyzer } from './analyzer/quality.js';
export { BottleneckAnalyzer } from './analyzer/bottleneck.js';
export { RulesEngine, SECURITY_RULES } from './analyzer/rules-engine.js';

// Knowledge
export { SimpleEmbedder, TransformerEmbedder, createEmbedder } from './knowledge/embedder.js';
export { KnowledgeSearcher } from './knowledge/searcher.js';
export { KnowledgeIndexer } from './knowledge/indexer.js';
export { MemoryVectorStore, LanceDBVectorStore } from './knowledge/vectorstore.js';

// Storage
export { initDb, getDb, closeDb } from './storage/db.js';

// Server
export { createApp, startServer } from './server/app.js';

// Config
export { loadConfig, saveConfig } from './config/loader.js';
export { defaultConfig } from './config/defaults.js';
