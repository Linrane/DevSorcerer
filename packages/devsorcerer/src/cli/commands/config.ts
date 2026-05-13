import { Command, Option } from 'clipanion';
import { loadConfig, saveConfig } from '../../config/loader.js';

export class ConfigShowCommand extends Command {
  static override paths = [['config', 'show']];
  static override usage = Command.Usage({ description: 'Show current configuration' });

  async execute(): Promise<number> {
    const config = loadConfig();
    this.context.stdout.write(JSON.stringify(config, null, 2) + '\n');
    return 0;
  }
}

export class ConfigSetCommand extends Command {
  static override paths = [['config', 'set']];
  static override usage = Command.Usage({
    description: 'Set a configuration value',
    examples: [
      ['Set server port', 'devsorcerer config set serverPort 4000'],
      ['Set DB path', 'devsorcerer config set dbPath /custom/path/sorcerer.sqlite'],
    ],
  });

  key = Option.String({ required: true, name: 'key' });
  value = Option.String({ required: true, name: 'value' });

  async execute(): Promise<number> {
    try {
      const parsed = JSON.parse(this.value);
      saveConfig({ [this.key]: parsed });
    } catch {
      saveConfig({ [this.key]: this.value } as Partial<Record<string, unknown>> as never);
    }
    this.context.stdout.write(`Config updated: ${this.key} = ${this.value}\n`);
    return 0;
  }
}

export class ConfigGetCommand extends Command {
  static override paths = [['config', 'get']];
  static override usage = Command.Usage({ description: 'Get a configuration value' });

  key = Option.String({ required: true, name: 'key' });

  async execute(): Promise<number> {
    const config = loadConfig();
    const value = (config as Record<string, unknown>)[this.key];
    if (value === undefined) {
      this.context.stdout.write(`Key not found: ${this.key}\n`);
      return 1;
    }
    this.context.stdout.write(JSON.stringify(value) + '\n');
    return 0;
  }
}

export class ConfigResetCommand extends Command {
  static override paths = [['config', 'reset']];
  static override usage = Command.Usage({ description: 'Reset configuration to defaults' });

  async execute(): Promise<number> {
    saveConfig({});
    this.context.stdout.write('Configuration reset to defaults.\n');
    return 0;
  }
}
