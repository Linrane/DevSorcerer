import type { SecurityRule, RiskFinding, RiskSeverity, RiskCategory } from '../shared/types.js';

export const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'SECRET-001',
    category: 'secret',
    severity: 'critical',
    description: 'Hardcoded API key, token, or password in source code',
    patterns: [
      /(['\"`](?:sk|api[_-]?key|token|secret|password|AUTH_TOKEN)['\"`]\s*[:=]\s*['\"`][A-Za-z0-9_\-]{16,}['\"`])/gi,
      /-----BEGIN\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----/,
      /(ghp_[A-Za-z0-9_]{36})/,
      /(xox[bpras]-[A-Za-z0-9-]+)/,
      /(sk-[A-Za-z0-9]{32,})/,
    ],
  },
  {
    id: 'INJECT-001',
    category: 'injection',
    severity: 'critical',
    description: 'SQL query built via string concatenation (SQL injection risk)',
    fileGlobs: ['*.ts', '*.js', '*.py', '*.go', '*.java', '*.rb', '*.php'],
    patterns: [
      /([\"'`]\s*(?:SELECT|INSERT|UPDATE|DELETE)\s.*(?:\+|\$\{))/i,
      /execute\s*\(\s*[\"'`].*%s/i,
      /cursor\.execute\s*\(\s*f[\"']/i,
      /\.query\s*\(\s*[\"'`].*\+/,
    ],
  },
  {
    id: 'INJECT-002',
    category: 'injection',
    severity: 'critical',
    description: 'Shell command built with user input (command injection risk)',
    fileGlobs: ['*.ts', '*.js', '*.py', '*.go', '*.rb'],
    patterns: [
      /(?:exec|execSync|spawn|execFile)\s*\(\s*[\"'`].*\$\{/,
      /(?:subprocess\.call|os\.system)\s*\(\s*['\"].*\+/,
      /child_process\.exec\s*\(\s*[^)]*req\.(?:params|query|body)/,
    ],
  },
  {
    id: 'EVAL-001',
    category: 'eval',
    severity: 'critical',
    description: 'Dynamic code execution via eval() or equivalent',
    fileGlobs: ['*.ts', '*.js', '*.py'],
    patterns: [
      /\beval\s*\(/,
      /\bnew\s+Function\s*\(/,
      /\bexec\s*\(/,
      /\bsetTimeout\s*\(\s*['\"`].*\$\{/,
      /\bsetInterval\s*\(\s*['\"`].*\$\{/,
    ],
  },
  {
    id: 'PATH-001',
    category: 'path-traversal',
    severity: 'high',
    description: 'File path constructed with unsanitized input',
    fileGlobs: ['*.ts', '*.js', '*.py'],
    patterns: [
      /path\.(?:join|resolve)\s*\([^)]*req\.(?:params|query|body)/,
      /fs\.(?:readFile|writeFile)\s*\([^)]*\.\./,
      /path\.join\s*\([^)]*process\.argv/,
    ],
  },
  {
    id: 'AUTH-001',
    category: 'auth',
    severity: 'high',
    description: 'Loose comparison in authentication logic (auth bypass risk)',
    patterns: [
      /if\s*\(\s*(?:req\.body\.isAdmin|user\.isAdmin)\s*==\s*(?:true|1)\s*\)/,
      /\.authenticate\s*\(\s*\)\s*=>\s*true/,
      /if\s*\(\s*!?(?:user|req\.user)\s*\)\s*return\s*next\s*\(\s*\)/,
    ],
  },
  {
    id: 'CRYPTO-001',
    category: 'crypto',
    severity: 'high',
    description: 'Use of weak or broken cryptographic primitives',
    patterns: [
      /\b(?:md5|sha1)\s*\(/i,
      /['\"]aes-128-ecb['\"]/i,
      /Math\.random\s*\(\s*\)\s*.*(?:token|password|secret|key)/i,
      /createHash\s*\(\s*['\"]md5['\"]/i,
    ],
  },
  {
    id: 'DEP-001',
    category: 'unsafe-dependency',
    severity: 'medium',
    description: 'Dependency with known vulnerabilities (check alerts)',
    fileGlobs: ['package.json', 'requirements.txt', 'Pipfile', 'Cargo.toml', 'go.mod'],
    patterns: [
      // Pattern to detect addition of suspicious packages
      /['\"]\s*:\s*['\"][\^~]?\d/,
    ],
  },
];

export class RulesEngine {
  private rules: SecurityRule[];

  constructor(rules?: SecurityRule[]) {
    this.rules = rules || SECURITY_RULES;
  }

  scanContent(
    content: string,
    filePath: string,
    sessionId: string,
  ): RiskFinding[] {
    const findings: RiskFinding[] = [];
    const lines = content.split('\n');

    const relevantRules = this.rules.filter(
      (r) =>
        !r.fileGlobs ||
        r.fileGlobs.some(
          (g) =>
            filePath.endsWith(g.replace('*', '')) || new RegExp(g.replace(/\*/g, '.*')).test(filePath),
        ),
    );

    for (const rule of relevantRules) {
      for (const pattern of rule.patterns) {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx]!;
          pattern.lastIndex = 0;

          let match: RegExpExecArray | null;
          while ((match = pattern.exec(line)) !== null) {
            if (match[0].length < 3) continue; // Skip empty matches

            const snippet =
              match[0].length > 120
                ? match[0].substring(0, 117) + '...'
                : match[0];

            findings.push({
              id: `${rule.id}-${sessionId.slice(0, 8)}-${filePath.replace(/[/\\]/g, '_')}-${lineIdx + 1}`,
              sessionId,
              severity: rule.severity,
              category: rule.category,
              ruleId: rule.id,
              filePath,
              lineStart: lineIdx + 1,
              lineEnd: lineIdx + 1,
              snippet,
              description: rule.description,
            });
          }
        }
      }
    }

    return findings;
  }

  scanSnippet(
    snippet: string,
    filePath: string,
    sessionId: string,
  ): RiskFinding[] {
    return this.scanContent(snippet, filePath, sessionId);
  }

  calculateOverallScore(findings: RiskFinding[]): number {
    if (findings.length === 0) return 0;

    const severityWeights: Record<RiskSeverity, number> = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };

    let score = 0;
    for (const f of findings) {
      score += severityWeights[f.severity] || 0;
    }

    // Cap at 100
    return Math.min(100, score * 2);
  }
}
