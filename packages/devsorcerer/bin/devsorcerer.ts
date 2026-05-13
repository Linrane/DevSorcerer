#!/usr/bin/env node
import { Cli } from 'clipanion';
import { RootCommand } from '../src/cli/root.js';
import { StartCommand } from '../src/cli/commands/start.js';
import { ProxyCommand } from '../src/cli/commands/proxy.js';
import { StatusCommand } from '../src/cli/commands/status.js';
import { DashboardCommand } from '../src/cli/commands/dashboard.js';
import {
  AnalyzeCostCommand,
  AnalyzeRiskCommand,
  AnalyzeQualityCommand,
} from '../src/cli/commands/analyze.js';
import { ShowCommand } from '../src/cli/commands/show.js';
import { AuditExportCommand } from '../src/cli/commands/audit.js';
import { KnowledgeSearchCommand } from '../src/cli/commands/knowledge.js';
import {
  ConfigShowCommand,
  ConfigSetCommand,
  ConfigGetCommand,
  ConfigResetCommand,
} from '../src/cli/commands/config.js';

const cli = new Cli({
  binaryLabel: 'DevSorcerer',
  binaryName: 'devsorcerer',
  binaryVersion: '0.1.0',
});

// Register all commands
cli.register(RootCommand);
cli.register(StartCommand);
cli.register(ProxyCommand);
cli.register(StatusCommand);
cli.register(DashboardCommand);
cli.register(AnalyzeCostCommand);
cli.register(AnalyzeRiskCommand);
cli.register(AnalyzeQualityCommand);
cli.register(ShowCommand);
cli.register(AuditExportCommand);
cli.register(KnowledgeSearchCommand);
cli.register(ConfigShowCommand);
cli.register(ConfigSetCommand);
cli.register(ConfigGetCommand);
cli.register(ConfigResetCommand);

cli.runExit(process.argv.slice(2));
