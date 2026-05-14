import { Command, Option } from 'clipanion';

export class RootCommand extends Command {
  static override paths = [Command.Default];

  static override usage = Command.Usage({
    description: 'DevSorcerer — AI development observability platform',
    details:
      'Black box for your AI coding agents. Capture, analyze, and audit every tool call.',
    examples: [
      ['Start collector and dashboard', 'devsorcerer start'],
      ['Start proxy for a specific MCP server', 'devsorcerer proxy --target npx --target-args @anthropic/mcp-server-filesystem .'],
      ['Analyze cost per project', 'devsorcerer analyze cost --project myapp --from 2026-05-01'],
      ['Scan for security risks', 'devsorcerer analyze risk --session abc123'],
      ['Replay a session', 'devsorcerer show abc123 --timeline'],
      ['Export audit log', 'devsorcerer audit export --project myapp --format ndjson'],
      ['Search knowledge', 'devsorcerer knowledge search "OAuth implementation"'],
    ],
  });

  showVersion = Option.Boolean('--version,-V', { description: 'Show version information' });

  async execute(): Promise<number> {
    if (this.showVersion) {
      this.context.stdout.write('0.2.2\n');
      return 0;
    }
    this.context.stdout.write('DevSorcerer v0.2.2\n');
    this.context.stdout.write('Run "devsorcerer --help" for available commands.\n');
    return 0;
  }
}
