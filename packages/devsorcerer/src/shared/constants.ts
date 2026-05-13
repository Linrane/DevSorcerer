import type { PricingTable } from './types.js';

export const DEFAULT_DB_PATH = '.vault/devsorcerer.sqlite';
export const DEFAULT_LANCEDB_PATH = '.vault/lancedb';
export const DEFAULT_SERVER_PORT = 3199;
export const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIMENSIONS = 384;
export const MAX_CHUNK_SIZE_CHARS = 2000;
export const CHUNK_OVERLAP_CHARS = 200;
export const KNOWLEDGE_SEARCH_DEFAULT_LIMIT = 10;
export const WEBSOCKET_PATH = '/ws/live';

export const DEFAULT_PRICING: PricingTable = {
  'claude-sonnet-4-20250514': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-opus-4-20250514': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-haiku-4-5-20251001': { inputPer1k: 0.001, outputPer1k: 0.005 },
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-4.1': { inputPer1k: 0.003, outputPer1k: 0.024 },
  'gpt-5': { inputPer1k: 0.01, outputPer1k: 0.04 },
  'deepseek-v4': { inputPer1k: 0.0015, outputPer1k: 0.006 },
  default: { inputPer1k: 0.005, outputPer1k: 0.02 },
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
