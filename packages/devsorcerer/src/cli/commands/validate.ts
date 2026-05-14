import { Command, Option } from 'clipanion';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { validateConfig } from '../../shared/validation.js';
import { detectGitContext } from '../../git/detector.js';
import chalk from 'chalk';

export class ValidateCommand extends Command {
  static override paths = [['validate']];
  static override usage = Command.Usage({
    description: 'Validate the DevSorcerer setup and check for issues',
    details:
      'Runs pre-flight checks on your configuration, database, git setup, and more.\n' +
      'Use this to diagnose issues before they cause problems.',
    examples: [
      ['Run all checks', 'devsorcerer validate'],
      ['Validate with specific project root', 'devsorcerer validate --project-root /path/to/project'],
    ],
  });

  projectRoot = Option.String('--project-root', {
    description: 'Project root to check (default: cwd)',
  });

  async execute(): Promise<number> {
    const projectRoot = this.projectRoot || process.cwd();
    const issues: string[] = [];
    const warnings: string[] = [];
    const ok: string[] = [];

    this.context.stdout.write(chalk.bold('\nDevSorcerer Validation\n'));
    this.context.stdout.write(chalk.gray('======================\n\n'));

    // 1. Config file check
    try {
      const config = loadConfig(projectRoot);
      ok.push('Config loaded successfully');

      const configWarnings = validateConfig(config);
      for (const w of configWarnings) {
        warnings.push(`Config: ${w}`);
      }

      this.context.stdout.write(`  ${chalk.green('✓')} Config: ${config.dbPath}\n`);
      this.context.stdout.write(`    Port: ${config.serverPort}  |  Embedding: ${config.embeddingModel}\n`);
    } catch (err) {
      issues.push(`Config: ${err instanceof Error ? err.message : String(err)}`);
      this.context.stdout.write(`  ${chalk.red('✗')} Config failed\n`);
    }

    // 2. Database check
    try {
      const config = loadConfig(projectRoot);
      const db = initDb(config.dbPath);
      const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
      const eventCount = (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
      ok.push(`Database: ${sessionCount} sessions, ${eventCount} events`);
      this.context.stdout.write(`  ${chalk.green('✓')} Database: ${sessionCount} sessions, ${eventCount.toLocaleString()} events\n`);
    } catch (err) {
      issues.push(`Database: ${err instanceof Error ? err.message : String(err)}`);
      this.context.stdout.write(`  ${chalk.red('✗')} Database check failed\n`);
    }

    // 3. Git context check
    const git = detectGitContext(projectRoot);
    if (!git) {
      warnings.push(`No git repository detected at ${projectRoot}. Project ID tracking will use fallback.`);
      this.context.stdout.write(`  ${chalk.yellow('!')} Git: not detected (fallback project ID will be used)\n`);
    } else {
      ok.push('Git repository detected');
      this.context.stdout.write(`  ${chalk.green('✓')} Git: repository detected (branch: ${git.branch || 'detached'})\n`);
    }

    // 4. Node.js version check
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0]!, 10);
    if (major >= 22) {
      ok.push(`Node.js ${nodeVersion}`);
      this.context.stdout.write(`  ${chalk.green('✓')} Node.js: ${nodeVersion} (>= 22 required)\n`);
    } else {
      issues.push(`Node.js ${nodeVersion} (>= 22 required)`);
      this.context.stdout.write(`  ${chalk.red('✗')} Node.js: ${nodeVersion} (>= 22 required)\n`);
    }

    // 5. Dashboard check
    const dashDist = findDashboardDist(projectRoot);
    if (dashDist) {
      ok.push(`Dashboard built at ${dashDist}`);
      this.context.stdout.write(`  ${chalk.green('✓')} Dashboard: built\n`);
    } else {
      warnings.push('Dashboard not built. Run "npm run build" to build it.');
      this.context.stdout.write(`  ${chalk.yellow('!')} Dashboard: not built (run "npm run build")\n`);
    }

    // Summary
    this.context.stdout.write(`\n${chalk.bold('Summary:')}\n`);
    this.context.stdout.write(`  ${chalk.green(`✓ ${ok.length} passed`)}  `);
    if (warnings.length > 0) {
      this.context.stdout.write(`${chalk.yellow(`! ${warnings.length} warnings`)}  `);
    }
    if (issues.length > 0) {
      this.context.stdout.write(`${chalk.red(`✗ ${issues.length} issues`)}`);
    }
    this.context.stdout.write('\n');

    if (warnings.length > 0) {
      this.context.stdout.write(chalk.yellow('\nWarnings:\n'));
      for (const w of warnings) {
        this.context.stdout.write(`  - ${w}\n`);
      }
    }

    if (issues.length > 0) {
      this.context.stdout.write(chalk.red('\nIssues:\n'));
      for (const i of issues) {
        this.context.stdout.write(`  - ${i}\n`);
      }
      return 1;
    }

    this.context.stdout.write(chalk.green('\nAll checks passed. Your DevSorcerer setup looks good.\n'));
    return 0;
  }
}

function findDashboardDist(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, 'packages', 'dashboard', 'dist', 'index.html'),
    path.join(projectRoot, '..', 'dashboard', 'dist', 'index.html'),
    path.join(process.cwd(), 'packages', 'dashboard', 'dist', 'index.html'),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand.replace(/[/\\]index\.html$/, '');
  }
  return null;
}
