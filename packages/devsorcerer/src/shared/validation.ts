// ============================================================
// Input validation and foolproof guards for CLI & API
// ============================================================

import type { DevSorcererConfig } from './types.js';

// ---- Basic Validators ----

export function validatePort(port: unknown, label = 'port'): number {
  const num = typeof port === 'string' ? parseInt(port, 10) : port;
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new Error(`${label} must be a number, got: ${String(port)}`);
  }
  if (!Number.isInteger(num) || num < 1024 || num > 65535) {
    throw new Error(`${label} must be between 1024 and 65535, got: ${num}`);
  }
  return num;
}

export function validateDateFormat(date: string, label = 'date'): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} must be in YYYY-MM-DD format, got: "${date}"`);
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is not a valid date: "${date}"`);
  }
}

export function validateSessionId(id: unknown): string {
  if (typeof id !== 'string' || id.length < 1) {
    throw new Error(`session ID must be a non-empty string, got: ${String(id)}`);
  }
  return id;
}

export function validateProjectId(id: unknown): string {
  if (typeof id !== 'string' || id.length < 1) {
    throw new Error(`project ID must be a non-empty string, got: ${String(id)}`);
  }
  return id;
}

export function validateLimit(limit: unknown, maxLimit = 1000): number {
  const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new Error(`limit must be a number, got: ${String(limit)}`);
  }
  if (!Number.isInteger(num) || num < 1 || num > maxLimit) {
    throw new Error(`limit must be between 1 and ${maxLimit}, got: ${num}`);
  }
  return num;
}

export function validateOutputPath(filePath: unknown): string {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('output path must be a non-empty string');
  }
  if (filePath.includes('..')) {
    throw new Error(`output path must not contain "..": "${filePath}"`);
  }
  return filePath;
}

export function validateSeverity(severity: string): void {
  const valid = ['critical', 'high', 'medium', 'low'];
  if (!valid.includes(severity)) {
    throw new Error(`severity must be one of: ${valid.join(', ')}, got: "${severity}"`);
  }
}

export function validateAuditFormat(format: string): void {
  const valid = ['csv', 'json', 'ndjson'];
  if (!valid.includes(format)) {
    throw new Error(`format must be one of: ${valid.join(', ')}, got: "${format}"`);
  }
}

export function validateAuditScope(scope: string): void {
  const valid = ['full', 'anonymized'];
  if (!valid.includes(scope)) {
    throw new Error(`scope must be one of: ${valid.join(', ')}, got: "${scope}"`);
  }
}

// ---- Config Validation ----

export function validateConfig(config: DevSorcererConfig): string[] {
  const warnings: string[] = [];

  if (config.serverPort < 1024 || config.serverPort > 65535) {
    warnings.push(`serverPort ${config.serverPort} is outside 1024-65535`);
  }

  for (const [model, pricing] of Object.entries(config.pricing)) {
    if (model === 'default') continue;
    if (pricing.inputPer1k <= 0) {
      warnings.push(`pricing.${model}.inputPer1k must be positive`);
    }
    if (pricing.outputPer1k <= 0) {
      warnings.push(`pricing.${model}.outputPer1k must be positive`);
    }
  }

  if (!config.embeddingModel || config.embeddingModel.length === 0) {
    warnings.push('embeddingModel is empty');
  }

  return warnings;
}

// ---- Input Sanitization ----

export function sanitizeSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new Error('search query cannot be empty');
  }
  if (trimmed.length > 500) {
    throw new Error('search query too long (max 500 characters)');
  }
  return trimmed;
}

export function sanitizeConfigKey(key: string): string {
  const validKeys: Array<string> = [
    'dbPath', 'lancedbPath', 'serverPort', 'pricing',
    'embeddingModel', 'anonymizeExport', 'dashboardEnabled', 'captureEnabled',
  ];
  if (!validKeys.includes(key)) {
    throw new Error(`Unknown config key "${key}". Valid keys: ${validKeys.join(', ')}`);
  }
  return key;
}
