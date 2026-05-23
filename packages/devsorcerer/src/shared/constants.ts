import type { PricingTable } from './types.js';

export const DEFAULT_DB_PATH = '.vault/devsorcerer.sqlite';
export const DEFAULT_LANCEDB_PATH = '.vault/lancedb';
export const DEFAULT_SERVER_PORT = 3199;
export const DEFAULT_EMBEDDING_MODEL = 'Xenova/bge-m3';
export const EMBEDDING_DIMENSIONS = 1024;
export const MAX_CHUNK_SIZE_CHARS = 2000;
export const CHUNK_OVERLAP_CHARS = 200;
export const KNOWLEDGE_SEARCH_DEFAULT_LIMIT = 10;
export const WEBSOCKET_PATH = '/ws/live';

// Single source of truth for model pricing.
// Users can override via Settings → Pricing Editor or .devsorcerer.json.
export const DEFAULT_PRICING: PricingTable = {
  // Anthropic Claude (per 1k tokens, USD)
  'claude-opus-4-7':            { inputPer1k: 0.015,  outputPer1k: 0.075 },
  'claude-sonnet-4-6':          { inputPer1k: 0.003,  outputPer1k: 0.015 },
  'claude-haiku-4-5-20251001':  { inputPer1k: 0.001,  outputPer1k: 0.005 },
  'claude-opus-4-20250514':     { inputPer1k: 0.015,  outputPer1k: 0.075 },
  'claude-sonnet-4-20250514':   { inputPer1k: 0.003,  outputPer1k: 0.015 },

  // OpenAI (per 1k tokens, USD)
  'gpt-4o':                     { inputPer1k: 0.005,  outputPer1k: 0.015 },
  'gpt-4.1':                    { inputPer1k: 0.003,  outputPer1k: 0.024 },
  'gpt-4.1-mini':               { inputPer1k: 0.0004, outputPer1k: 0.0016 },
  'gpt-5':                      { inputPer1k: 0.01,   outputPer1k: 0.04 },
  'gpt-5-mini':                 { inputPer1k: 0.00085,outputPer1k: 0.0034 },
  'o4-mini':                    { inputPer1k: 0.0011, outputPer1k: 0.0044 },
  'o3':                         { inputPer1k: 0.01,   outputPer1k: 0.04 },

  // Google Gemini (per 1k tokens, USD)
  'gemini-2.5-pro':             { inputPer1k: 0.0035, outputPer1k: 0.00875 },
  'gemini-2.5-flash':           { inputPer1k: 0.000075,outputPer1k: 0.0003 },

  // DeepSeek (per 1k tokens, USD)
  'deepseek-v4-pro':            { inputPer1k: 0.00055,outputPer1k: 0.00219 },
  'deepseek-v4':                { inputPer1k: 0.0015, outputPer1k: 0.006 },
  'deepseek-v3':                { inputPer1k: 0.00027,outputPer1k: 0.0011 },
  'deepseek-r1':                { inputPer1k: 0.00055,outputPer1k: 0.00219 },

  // Fallback — used when model doesn't match any key above
  default:                      { inputPer1k: 0.003,  outputPer1k: 0.015 },
};

export const MCP_METHODS = {
  INITIALIZE: 'initialize',
  INITIALIZED: 'notifications/initialized',
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',
  LOGGING_SET_LEVEL: 'logging/setLevel',
  PING: 'ping',
} as const;
