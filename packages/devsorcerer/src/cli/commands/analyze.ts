import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { CostAnalyzer } from '../../analyzer/cost.js';
import { RiskAnalyzer } from '../../analyzer/risk.js';
import { QualityAnalyzer } from '../../analyzer/quality.js';
import type { RiskSeverity } from '../../shared/types.js';
import {
  validateSessionId,
  validateProjectId,
  validateDateFormat,
  validateSeverity,
} from '../../shared/validation.js';

export class AnalyzeCostCommand extends Command {
  static override paths = [['analyze', 'cost']];
  static override usage = Command.Usage({
    description: 'Analyze token cost across projects and sessions',
    examples: [
      ['Cost by project', 'devsorcerer analyze cost --project myapp --from 2026-05-01'],
      ['Cost by session', 'devsorcerer analyze cost --session abc123 --group-by tool'],
      ['JSON output', 'devsorcerer analyze cost --project myapp --format json'],
    ],
  });

  project = Option.String('--project', { description: 'Filter by project' });
  session = Option.String('--session', { description: 'Specific session ID' });
  from = Option.String('--from', { description: 'Start date (YYYY-MM-DD)' });
  to = Option.String('--to', { description: 'End date (YYYY-MM-DD)' });
  format = Option.String('--format', { description: 'Output: table, json, csv' });
  groupBy = Option.String('--group-by', { description: 'Aggregation: tool, session, day' });

  async execute(): Promise<number> {
    if (!this.session && !this.project) {
      this.context.stderr.write('Error: --session or --project is required.\n');
      this.context.stderr.write('Usage: devsorcerer analyze cost --project <name> or --session <id>\n');
      this.context.stderr.write('Run with --help for full options.\n');
      return 1;
    }

    if (this.session) validateSessionId(this.session);
    if (this.project) validateProjectId(this.project);
    if (this.from) validateDateFormat(this.from, '--from');
    if (this.to) validateDateFormat(this.to, '--to');

    const config = loadConfig();
    const db = initDb(config.dbPath);
    const analyzer = new CostAnalyzer(config.pricing);

    try {
      if (this.session) {
        const cost = analyzer.analyzeSession(this.session);
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(cost, null, 2) + '\n');
        } else {
          this.context.stdout.write(analyzer.formatSessionReport(cost) + '\n');
        }
      } else if (this.project) {
        const cost = analyzer.analyzeProject(this.project, this.from, this.to);
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(cost, null, 2) + '\n');
        } else {
          this.context.stdout.write(`Project: ${cost.projectId}\n`);
          this.context.stdout.write(`Sessions: ${cost.sessionCount}\n`);
          this.context.stdout.write(`Total Tokens: ${cost.totalTokens.toLocaleString()}\n`);
          this.context.stdout.write(`Total Cost: $${cost.totalCost.toFixed(4)}\n\n`);
          this.context.stdout.write('Tool Breakdown:\n');
          for (const t of cost.toolBreakdown) {
            this.context.stdout.write(
              `  ${t.toolName.padEnd(20)} ${t.callCount.toString().padStart(4)} calls  $${t.cost.toFixed(4)}\n`,
            );
          }
        }
      }
    } finally {
      db.close();
    }

    return 0;
  }
}

export class AnalyzeRiskCommand extends Command {
  static override paths = [['analyze', 'risk']];
  static override usage = Command.Usage({
    description: 'Scan AI-generated code for security vulnerabilities',
    examples: [
      ['Scan a session', 'devsorcerer analyze risk --session abc123'],
      ['Filter by severity', 'devsorcerer analyze risk --project myapp --severity high'],
      ['SARIF output for CI', 'devsorcerer analyze risk --session abc123 --format sarif'],
    ],
  });

  session = Option.String('--session', { description: 'Specific session ID' });
  project = Option.String('--project', { description: 'All sessions in project' });
  severity = Option.String('--severity', { description: 'Minimum: critical, high, medium, low' });
  format = Option.String('--format', { description: 'Output: table, json, sarif' });

  async execute(): Promise<number> {
    if (!this.session && !this.project) {
      this.context.stderr.write('Error: --session or --project is required.\n');
      this.context.stderr.write('Usage: devsorcerer analyze risk --session <id> or --project <name>\n');
      return 1;
    }

    if (this.session) validateSessionId(this.session);
    if (this.project) validateProjectId(this.project);
    if (this.severity) validateSeverity(this.severity);

    const config = loadConfig();
    const db = initDb(config.dbPath);
    const analyzer = new RiskAnalyzer();

    try {
      if (this.session) {
        const report = analyzer.analyzeSession(this.session);
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(report, null, 2) + '\n');
        } else if (this.format === 'sarif') {
          this.context.stdout.write(this.toSarif(report) + '\n');
        } else {
          this.context.stdout.write(`Session: ${report.sessionId}\n`);
          this.context.stdout.write(`Risk Score: ${report.overallScore}/100\n`);
          this.context.stdout.write(`Findings: ${report.findings.length}\n\n`);
          for (const f of report.findings) {
            this.context.stdout.write(
              `[${f.severity.toUpperCase()}] ${f.category} - ${f.filePath}:${f.lineStart}\n`,
            );
            this.context.stdout.write(`  ${f.description}\n`);
            this.context.stdout.write(`  > ${f.snippet.slice(0, 80)}\n\n`);
          }
        }
      } else if (this.project) {
        const findings = analyzer.analyzeProject(
          this.project,
          this.severity as RiskSeverity | undefined,
        );
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(findings, null, 2) + '\n');
        } else {
          this.context.stdout.write(`Project: ${this.project}\n`);
          this.context.stdout.write(`Findings: ${findings.length}\n\n`);
          for (const f of findings) {
            this.context.stdout.write(
              `[${f.severity.toUpperCase()}] ${f.filePath}: ${f.description.slice(0, 60)}\n`,
            );
          }
        }
      }
    } finally {
      db.close();
    }

    return 0;
  }

  private toSarif(report: { sessionId: string; findings: Array<{ id: string; severity: string; filePath: string; lineStart?: number; description: string; ruleId: string }> }): string {
    return JSON.stringify(
      {
        $schema:
          'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        version: '2.1.0',
        runs: [
          {
            tool: {
              driver: {
                name: 'DevSorcerer',
                version: '0.3.1',
                rules: [...new Set(report.findings.map((f) => f.ruleId))].map((id) => ({ id, name: id })),
              },
            },
            results: report.findings.map((f) => ({
              ruleId: f.ruleId,
              level: f.severity === 'critical' || f.severity === 'high' ? 'error' : 'warning',
              message: { text: f.description },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: f.filePath },
                    region: f.lineStart ? { startLine: f.lineStart } : {},
                  },
                },
              ],
            })),
          },
        ],
      },
      null,
      2,
    );
  }
}

export class AnalyzeQualityCommand extends Command {
  static override paths = [['analyze', 'quality']];
  static override usage = Command.Usage({
    description: 'Analyze code quality metrics for AI contributions',
  });

  project = Option.String('--project', { description: 'Filter by project' });
  session = Option.String('--session', { description: 'Specific session ID' });
  from = Option.String('--from', { description: 'Start date (YYYY-MM-DD)' });
  to = Option.String('--to', { description: 'End date (YYYY-MM-DD)' });
  format = Option.String('--format', { description: 'Output: table, json' });

  async execute(): Promise<number> {
    if (!this.session && !this.project) {
      this.context.stderr.write('Error: --session or --project is required.\n');
      this.context.stderr.write('Usage: devsorcerer analyze quality --session <id> or --project <name>\n');
      return 1;
    }

    if (this.session) validateSessionId(this.session);
    if (this.project) validateProjectId(this.project);
    if (this.from) validateDateFormat(this.from, '--from');
    if (this.to) validateDateFormat(this.to, '--to');

    const config = loadConfig();
    const db = initDb(config.dbPath);
    const analyzer = new QualityAnalyzer();

    try {
      if (this.session) {
        const report = analyzer.analyzeSession(this.session);
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(report, null, 2) + '\n');
        } else {
          this.context.stdout.write(`Session: ${report.sessionId}\n`);
          this.context.stdout.write(`Acceptance Rate: ${report.acceptanceRate}%\n`);
          this.context.stdout.write(`Files Created: ${report.filesCreated}\n`);
          this.context.stdout.write(`Files Modified: ${report.filesModified}\n`);
          this.context.stdout.write(`Files Accepted: ${report.filesAccepted}\n`);
          this.context.stdout.write(`Rollbacks: ${report.rollbackCount}\n`);
          if (report.bugCount !== null) {
            this.context.stdout.write(`AI Bugs: ${report.bugCount}\n`);
          }
        }
      } else if (this.project) {
        const quality = analyzer.getProjectQuality(this.project, {
          from: this.from,
          to: this.to,
        });
        if (this.format === 'json') {
          this.context.stdout.write(JSON.stringify(quality, null, 2) + '\n');
        } else {
          this.context.stdout.write(`Project: ${quality.projectId}\n`);
          this.context.stdout.write(`AI Commits: ${quality.totalAiCommits}\n`);
          this.context.stdout.write(`Acceptance Rate: ${quality.acceptanceRate.toFixed(1)}%\n`);
          this.context.stdout.write(`Rollback Rate: ${quality.rollbackRate.toFixed(1)}%\n`);
          this.context.stdout.write(`AI Bug Rate: ${quality.aiBugRate.toFixed(1)}%\n`);
        }
      }
    } finally {
      db.close();
    }

    return 0;
  }
}
