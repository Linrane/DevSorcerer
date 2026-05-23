import { DEFAULT_PRICING } from '../shared/constants.js';
import type { DevSorcererConfig } from './schema.js';

export const defaultConfig: DevSorcererConfig = {
  dbPath: '.vault/devsorcerer.sqlite',
  lancedbPath: '.vault/lancedb',
  serverPort: 3199,
  pricing: { ...DEFAULT_PRICING },
  embeddingModel: 'Xenova/bge-m3',
  anonymizeExport: false,
  dashboardEnabled: true,
  captureEnabled: true,
};
