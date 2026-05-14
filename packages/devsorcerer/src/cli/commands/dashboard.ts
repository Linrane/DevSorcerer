import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { validatePort } from '../../shared/validation.js';

export class DashboardCommand extends Command {
  static override paths = [['dashboard']];
  static override usage = Command.Usage({
    description: 'Open the DevSorcerer dashboard in your browser',
  });

  port = Option.String('-p,--port', { description: 'Dashboard port (default: from config)' });

  async execute(): Promise<number> {
    const config = loadConfig();
    const port = this.port ? validatePort(this.port, 'port') : config.serverPort;
    const url = `http://localhost:${port}`;

    this.context.stdout.write(`Opening DevSorcerer Dashboard at ${url}\n`);
    this.context.stdout.write('(Make sure "devsorcerer start" is running first)\n');

    try {
      const { default: open } = await import('open');
      await open(url);
    } catch {
      this.context.stdout.write(`Dashboard URL: ${url}\n`);
      this.context.stdout.write('(Install "open" package or open manually)\n');
    }

    return 0;
  }
}
