import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { startServer } from '../../server/app.js';
import { validatePort } from '../../shared/validation.js';
import { importAllClaudeCodeSessions } from '../../import/sessionImporter.js';

export class StartCommand extends Command {
  static override paths = [['start']];
  static override usage = Command.Usage({
    description: 'Start the DevSorcerer collector and dashboard server',
  });

  port = Option.String('-p,--port', { description: 'Dashboard port (default: from config)' });
  noDashboard = Option.Boolean('--no-dashboard', { description: 'Collector only, no web UI' });
  headless = Option.Boolean('--headless', { description: 'Do not open browser' });

  async execute(): Promise<number> {
    const config = loadConfig();
    const port = this.port ? validatePort(this.port, 'port') : config.serverPort;

    this.context.stdout.write(`DevSorcerer v0.4.0 starting...\n`);

    // Initialize database
    initDb(config.dbPath);
    this.context.stdout.write(`  Database: ${config.dbPath}\n`);

    // Auto-import Claude Code sessions on startup
    this.context.stdout.write('  Importing Claude Code sessions...\n');
    try {
      const results = importAllClaudeCodeSessions();
      const imported = results.filter((r) => !r.skipped);
      const skipped = results.filter((r) => r.skipped);
      if (imported.length > 0) {
        this.context.stdout.write(`  ✓ Imported ${imported.length} session(s)\n`);
        for (const r of imported) {
          this.context.stdout.write(`    - ${r.sessionId}: ${r.toolCalls} tool calls, $${r.totalCost.toFixed(4)}\n`);
        }
      }
      if (skipped.length > 0) {
        this.context.stdout.write(`  • Skipped ${skipped.length} already-imported session(s)\n`);
      }
      if (results.length === 0) {
        this.context.stdout.write('  • No Claude Code sessions found\n');
      }
    } catch (err) {
      this.context.stdout.write(`  ⚠ Session import failed: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
    }

    // Start API server
    const app = await startServer(port);

    if (!this.noDashboard && config.dashboardEnabled) {
      this.context.stdout.write(`  Dashboard: http://localhost:${port}\n`);
      if (!this.headless) {
        try {
          const { default: open } = await import('open');
          await open(`http://localhost:${port}`);
        } catch {
          // Don't fail if browser open fails
        }
      }
    }

    // Graceful shutdown
    const shutdown = async () => {
      this.context.stdout.write('\nShutting down...\n');
      clearInterval(importInterval);
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    this.context.stdout.write(`DevSorcerer is running. Press Ctrl+C to stop.\n`);

    // Periodic auto-import: check for new Claude Code sessions every 5 minutes
    const importInterval = setInterval(() => {
      try {
        const results = importAllClaudeCodeSessions();
        const imported = results.filter((r) => !r.skipped);
        if (imported.length > 0) {
          this.context.stdout.write(`  ✓ Auto-imported ${imported.length} new session(s)\n`);
        }
      } catch { /* silent — don't crash on polling errors */ }
    }, 5 * 60 * 1000);

    // Keep process alive
    await new Promise(() => {});

    return 0;
  }
}
