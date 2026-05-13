import { z } from 'zod';

export const PricingEntrySchema = z.object({
  inputPer1k: z.number().positive(),
  outputPer1k: z.number().positive(),
});

export const ConfigSchema = z.object({
  dbPath: z.string().default('.vault/devsorcerer.sqlite'),
  lancedbPath: z.string().default('.vault/lancedb'),
  serverPort: z.number().int().min(1024).max(65535).default(3199),
  pricing: z.record(z.string(), PricingEntrySchema).default({}),
  embeddingModel: z.string().default('Xenova/all-MiniLM-L6-v2'),
  anonymizeExport: z.boolean().default(false),
  dashboardEnabled: z.boolean().default(true),
  captureEnabled: z.boolean().default(true),
});

export type DevSorcererConfig = z.infer<typeof ConfigSchema>;
