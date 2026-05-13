import fs from 'node:fs';
import path from 'node:path';
// Import not needed here — ConfigSchema.safeParse uses Zod internally

import { ConfigSchema, type DevSorcererConfig } from './schema.js';
import { defaultConfig } from './defaults.js';

const CONFIG_FILENAME = '.devsorcerer.json';

let cachedConfig: DevSorcererConfig | null = null;

export function loadConfig(projectRoot?: string): DevSorcererConfig {
  if (cachedConfig) return cachedConfig;

  const config: DevSorcererConfig = { ...defaultConfig };

  // 1. Global config: ~/.devsorcerer.json
  const globalPath = path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    CONFIG_FILENAME,
  );
  if (fs.existsSync(globalPath)) {
    try {
      const globalConfig = JSON.parse(fs.readFileSync(globalPath, 'utf-8'));
      Object.assign(config, globalConfig);
    } catch {
      // Silently ignore malformed global config
    }
  }

  // 2. Project config: <project-root>/.devsorcerer.json
  const projectPath = projectRoot
    ? path.join(projectRoot, CONFIG_FILENAME)
    : path.resolve(CONFIG_FILENAME);
  if (fs.existsSync(projectPath)) {
    try {
      const projectConfig = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
      Object.assign(config, projectConfig);
    } catch {
      // Silently ignore malformed project config
    }
  }

  // 3. Environment variables: DEVSO_<KEY>
  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (!envKey.startsWith('DEVSO_')) continue;
    const key = envKey.slice(6).replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    const lowerKey =
      key.charAt(0).toLowerCase() + key.slice(1);
    if (lowerKey in config) {
      try {
        (config as Record<string, unknown>)[lowerKey] = JSON.parse(envVal!);
      } catch {
        (config as Record<string, unknown>)[lowerKey] = envVal;
      }
    }
  }

  // Validate
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid config, using defaults:', result.error);
    return { ...defaultConfig };
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function saveConfig(
  updates: Partial<DevSorcererConfig>,
  projectRoot?: string,
): DevSorcererConfig {
  const current = loadConfig(projectRoot);
  const merged = { ...current, ...updates };
  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error}`);
  }

  const configPath = projectRoot
    ? path.join(projectRoot, CONFIG_FILENAME)
    : path.resolve(CONFIG_FILENAME);

  fs.writeFileSync(configPath, JSON.stringify(result.data, null, 2));
  cachedConfig = result.data;
  return cachedConfig;
}

export function getConfig(key: keyof DevSorcererConfig): unknown {
  return loadConfig()[key];
}

export function setConfig(
  key: keyof DevSorcererConfig,
  value: unknown,
  projectRoot?: string,
): DevSorcererConfig {
  return saveConfig({ [key]: value } as Partial<DevSorcererConfig>, projectRoot);
}

export function resetConfig(): void {
  cachedConfig = null;
}
