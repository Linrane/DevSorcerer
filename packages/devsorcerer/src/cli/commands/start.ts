import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { startServer } from '../../server/app.js';
import { validatePort } from '../../shared/validation.js';

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

    this.context.stdout.write(`DevSorcerer v0.3.0 starting...\n`);

    // Initialize database
    initDb(config.dbPath);
    this.context.stdout.write(`  Database: ${config.dbPath}\n`);

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
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    this.context.stdout.write(`DevSorcerer is running. Press Ctrl+C to stop.\n`);

    // Keep process alive
    await new Promise(() => {});

    return 0;
  }
}
