#!/usr/bin/env node
import('../dist/cli/root.js').then(async ({ RootCommand }) => {
  const { Cli } = await import('clipanion');
  const { StartCommand } = await import('../dist/cli/commands/start.js');
  const { ProxyCommand } = await import('../dist/cli/commands/proxy.js');
  const { StatusCommand } = await import('../dist/cli/commands/status.js');
  const { DashboardCommand } = await import('../dist/cli/commands/dashboard.js');
  const { AnalyzeCostCommand, AnalyzeRiskCommand, AnalyzeQualityCommand } = await import('../dist/cli/commands/analyze.js');
  const { ShowCommand } = await import('../dist/cli/commands/show.js');
  const { AuditExportCommand } = await import('../dist/cli/commands/audit.js');
  const { KnowledgeSearchCommand } = await import('../dist/cli/commands/knowledge.js');
  const { ConfigShowCommand, ConfigSetCommand, ConfigGetCommand, ConfigResetCommand } = await import('../dist/cli/commands/config.js');
  const { ValidateCommand } = await import('../dist/cli/commands/validate.js');

  const cli = new Cli({
    binaryLabel: 'DevSorcerer',
    binaryName: 'devsorcerer',
    binaryVersion: '0.2.0',
  });

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
  cli.register(ValidateCommand);

  cli.runExit(process.argv.slice(2));
});
