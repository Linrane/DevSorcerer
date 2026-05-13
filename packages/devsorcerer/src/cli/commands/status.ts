import { Command } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { getDb } from '../../storage/db.js';

export class StatusCommand extends Command {
  static override paths = [['status']];
  static override usage = Command.Usage({
    description: 'Show collector and database status',
  });

  async execute(): Promise<number> {
    const config = loadConfig();

    this.context.stdout.write('DevSorcerer Status\n');
    this.context.stdout.write('==================\n\n');

    try {
      const db = getDb();
      const sessions = db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number };
      const events = db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number };
      const projects = db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number };
      const activeSessions = db
        .prepare("SELECT COUNT(*) as c FROM sessions WHERE status = 'active'")
        .get() as { c: number };

      const totalCost = db
        .prepare('SELECT COALESCE(SUM(total_cost), 0) as c FROM sessions')
        .get() as { c: number };

      this.context.stdout.write(`Database: ${config.dbPath}\n`);
      this.context.stdout.write(`Projects: ${projects.c}\n`);
      this.context.stdout.write(`Sessions: ${sessions.c} (${activeSessions.c} active)\n`);
      this.context.stdout.write(`Events:   ${events.c.toLocaleString()}\n`);
      this.context.stdout.write(`Total Cost: $${totalCost.c.toFixed(4)}\n`);
    } catch {
      this.context.stdout.write('Database not initialized. Run "devsorcerer start" first.\n');
    }

    return 0;
  }
}
