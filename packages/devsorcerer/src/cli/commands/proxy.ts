import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { MCPProxy } from '../../collector/proxy.js';
import { SessionManager } from '../../collector/session.js';
import { EventEnricher } from '../../collector/enricher.js';

export class ProxyCommand extends Command {
  static override paths = [['proxy']];
  static override usage = Command.Usage({
    description:
      'Run as a transparent MCP proxy between an agent and an MCP server',
    details:
      'This is the low-level command agents use in their MCP config.\n' +
      'It intercepts all JSON-RPC messages between the agent and server.\n\n' +
      'Example MCP config:\n' +
      '  {\n' +
      '    "mcpServers": {\n' +
      '      "devsorcerer-fs": {\n' +
      '        "command": "devsorcerer",\n' +
      '        "args": ["proxy", "-t", "npx", "--target-args", "-y @anthropic/mcp-server-filesystem", "."]\n' +
      '      }\n' +
      '    }\n' +
      '  }',
  });

  target = Option.String('-t,--target', {
    required: true,
    description: 'Command to spawn the MCP server',
  });
  targetArgs = Option.Array('--target-args', {
    description: 'Arguments for the MCP server command',
  });
  targetUrl = Option.String('--target-url', {
    description: 'HTTP URL for MCP server (alternative to --target)',
  });
  transport = Option.String('--transport', {
    description: 'Transport mode: stdio (default) or http',
  });
  projectRoot = Option.String('--project-root', {
    description: 'Explicit project root (default: cwd)',
  });

  async execute(): Promise<number> {
    if (!this.target) {
      this.context.stderr.write('Error: --target <command> is required.\n');
      this.context.stderr.write('Example: devsorcerer proxy -t npx --target-args -y @anthropic/mcp-server-filesystem .\n');
      return 1;
    }

    const projectRoot = this.projectRoot || process.cwd();
    const config = loadConfig(projectRoot);

    // Initialize database
    initDb(config.dbPath);

    const sessionManager = new SessionManager(projectRoot);
    const enricher = new EventEnricher(projectRoot);

    const proxy = new MCPProxy({
      target: {
        command: this.target,
        args: this.targetArgs ?? [],
      },
      projectRoot,
      sessionManager,
      enricher,
    });

    this.context.stdout.write(
      `DevSorcerer MCP Proxy v0.3.1\n`,
    );

    if (this.targetUrl) {
      this.context.stdout.write(
        `  Mode: HTTP proxy → ${this.targetUrl}\n`,
      );
      this.context.stdout.write(
        `  (HTTP transport support is planned for a future release)\n`,
      );
      // Fallback for now
    } else {
      this.context.stdout.write(
        `  Mode: stdio proxy → ${this.target} ${(this.targetArgs ?? []).join(' ')}\n`,
      );
    }

    // Graceful shutdown
    const shutdown = async () => {
      await proxy.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await proxy.startWithTarget({
      command: this.target,
      args: this.targetArgs ?? [],
    });

    // Keep alive until stdin ends or process is killed
    await new Promise<void>((resolve) => {
      process.stdin.on('end', () => {
        shutdown().then(resolve);
      });
    });

    return 0;
  }
}
