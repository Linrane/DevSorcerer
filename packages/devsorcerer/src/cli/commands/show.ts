import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { getSession } from '../../storage/repositories/sessions.js';
import { getSessionTimeline } from '../../storage/repositories/events.js';
import { BottleneckAnalyzer } from '../../analyzer/bottleneck.js';
import chalk from 'chalk';

export class ShowCommand extends Command {
  static override paths = [['show']];
  static override usage = Command.Usage({
    description: 'Replay a session with thinking chain visualization',
    examples: [
      ['Timeline view', 'devsorcerer show abc123 --timeline'],
      ['Thinking chain', 'devsorcerer show abc123 --chain'],
      ['Errors only', 'devsorcerer show abc123 --errors'],
      ['Filter by tool', 'devsorcerer show abc123 --tool write_file'],
    ],
  });

  sessionId = Option.String({ required: true, name: 'session-id' });
  timeline = Option.Boolean('--timeline', { description: 'Timeline view' });
  chain = Option.Boolean('--chain', { description: 'Thinking chain view' });
  errors = Option.Boolean('--errors', { description: 'Error-only view' });
  tool = Option.String('--tool', { description: 'Filter to specific tool' });
  format = Option.String('--format', { description: 'Output: text, json' });

  async execute(): Promise<number> {
    if (!this.sessionId || this.sessionId.length < 1) {
      this.context.stderr.write('Error: a valid session ID is required.\n');
      this.context.stderr.write('Usage: devsorcerer show <session-id> [--timeline|--chain|--errors]\n');
      return 1;
    }

    const config = loadConfig();
    const db = initDb(config.dbPath);

    try {
      const session = getSession(this.sessionId);
      if (!session) {
        this.context.stderr.write(`Error: Session not found: ${this.sessionId}\n`);
        this.context.stderr.write('Run "devsorcerer status" to see available sessions.\n');
        return 1;
      }

      const events = getSessionTimeline(this.sessionId);

      if (this.format === 'json') {
        this.context.stdout.write(JSON.stringify({ session, events }, null, 2) + '\n');
        return 0;
      }

      // Session info header
      this.context.stdout.write(chalk.bold(`\nSession: ${chalk.magenta(this.sessionId.slice(0, 16))}...\n`));
      this.context.stdout.write(`  Agent:    ${chalk.cyan(session.agentName)}${session.agentVersion ? ` v${session.agentVersion}` : ''}\n`);
      this.context.stdout.write(`  Branch:   ${chalk.yellow(session.branch || 'N/A')}\n`);
      this.context.stdout.write(`  Status:   ${session.status === 'completed' ? chalk.green(session.status) : chalk.red(session.status)}\n`);
      this.context.stdout.write(`  Events:   ${session.totalEvents}  Tokens: ${session.totalTokens.toLocaleString()}  Cost: $${session.totalCost.toFixed(4)}\n`);
      this.context.stdout.write(`  Duration: ${session.endedAt ? `${Math.round((session.endedAt - session.startedAt) / 1000)}s` : 'N/A'}\n\n`);

      // Error view
      if (this.errors) {
        const errorEvents = events.filter((e) => e.isError);
        this.context.stdout.write(chalk.red.bold('Errors:\n'));
        for (const e of errorEvents) {
          this.context.stdout.write(
            `  ${chalk.gray(new Date(e.timestamp).toLocaleTimeString())} ${chalk.yellow(e.toolName || 'unknown')}: ${chalk.red(e.error?.message || 'error')}\n`,
          );
        }
        return 0;
      }

      // Filter by tool
      let filtered = events;
      if (this.tool) {
        filtered = events.filter((e) => e.toolName === this.tool);
      }

      // Thinking chain view
      if (this.chain) {
        const analyzer = new BottleneckAnalyzer();
        const report = analyzer.analyzeSession(this.sessionId);
        this.context.stdout.write(chalk.bold('Thinking Chain:\n'));
        for (const step of report.thinkingChain) {
          const time = new Date(step.timestamp).toLocaleTimeString();
          const prefix = step.isError ? chalk.red('  ✗') : chalk.green('  ✓');
          const latency = step.latencyMs ? chalk.gray(` ${step.latencyMs}ms`) : '';
          this.context.stdout.write(`${prefix} ${chalk.gray(time)} ${chalk.cyan(step.toolName)}${latency}\n`);
          this.context.stdout.write(`    ${chalk.gray(step.summary.slice(0, 100))}\n`);
        }
        return 0;
      }

      // Default: timeline view
      this.context.stdout.write(chalk.bold('Timeline:\n'));
      this.context.stdout.write(chalk.gray('─'.repeat(80)) + '\n');

      let lastTime = filtered[0]?.timestamp || 0;
      for (const e of filtered) {
        if (!e.toolName) continue;
        const gap = e.timestamp - lastTime;
        const timeStr = new Date(e.timestamp).toLocaleTimeString();

        const gapStr = gap > 5000 ? chalk.gray(` +${Math.round(gap / 1000)}s`) : '';
        const toolStr = chalk.cyan(e.toolName.padEnd(20));
        const errorStr = e.isError ? chalk.red(' ERROR') : '';
        const latencyStr = e.latencyMs ? chalk.gray(` ${e.latencyMs}ms`) : '';

        this.context.stdout.write(`${chalk.gray(timeStr)} ${toolStr}${gapStr}${latencyStr}${errorStr}\n`);

        // Show summary for key tools
        if (e.toolName === 'write_file' || e.toolName === 'Write') {
          const params = e.params as Record<string, unknown> | undefined;
          const args = params?.arguments as Record<string, unknown> | undefined;
          const fp = args?.filePath || args?.path;
          if (fp) this.context.stdout.write(`  ${chalk.gray('├─')} ${chalk.green(fp)}\n`);
        } else if (e.toolName === 'search_content' || e.toolName === 'Grep') {
          const params = e.params as Record<string, unknown> | undefined;
          const args = params?.arguments as Record<string, unknown> | undefined;
          const pattern = args?.pattern;
          if (pattern) this.context.stdout.write(`  ${chalk.gray('├─')} ${chalk.yellow(pattern)}\n`);
        }

        lastTime = e.timestamp;
      }

      this.context.stdout.write(chalk.gray('─'.repeat(80)) + '\n');
    } finally {
      db.close();
    }

    return 0;
  }
}
