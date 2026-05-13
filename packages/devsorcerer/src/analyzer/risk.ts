import { getEventsForAnalysis } from '../storage/repositories/events.js';
import { insertRiskFindings, getRiskFindings as getCachedFindings } from '../storage/repositories/analyses.js';
import { DiffParser, type DiffExtract } from './diff-parser.js';
import { RulesEngine, SECURITY_RULES } from './rules-engine.js';
import type { RiskReport, RiskFinding, RiskSeverity } from '../shared/types.js';

export class RiskAnalyzer {
  private diffParser: DiffParser;
  private rulesEngine: RulesEngine;

  constructor() {
    this.diffParser = new DiffParser();
    this.rulesEngine = new RulesEngine(SECURITY_RULES);
  }

  analyzeSession(sessionId: string): RiskReport {
    // Check cache first
    const cached = getCachedFindings(sessionId);
    if (cached && Array.isArray(cached)) {
      return {
        sessionId,
        overallScore: this.rulesEngine.calculateOverallScore(cached as RiskFinding[]),
        findings: cached as RiskFinding[],
      };
    }

    const events = getEventsForAnalysis(sessionId);
    const diffs = this.diffParser.extractDiffs(events);

    const allFindings: RiskFinding[] = [];
    for (const diff of diffs) {
      const content = diff.newContent;
      const findings = this.rulesEngine.scanContent(
        content,
        diff.filePath,
        sessionId,
      );
      allFindings.push(...findings);
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueFindings = allFindings.filter((f) => {
      const key = `${f.ruleId}:${f.filePath}:${f.lineStart}:${f.snippet.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Persist findings
    if (uniqueFindings.length > 0) {
      insertRiskFindings(uniqueFindings);
    }

    return {
      sessionId,
      overallScore: this.rulesEngine.calculateOverallScore(uniqueFindings),
      findings: uniqueFindings,
    };
  }

  analyzeProject(
    projectId: string,
    minSeverity?: RiskSeverity,
  ): RiskFinding[] {
    // Get findings for all sessions in project via DB
    const findings = getCachedFindings(undefined, undefined);
    // Filter by severity if requested
    if (minSeverity) {
      const severityOrder: RiskSeverity[] = ['critical', 'high', 'medium', 'low'];
      const minIdx = severityOrder.indexOf(minSeverity);
      return findings.filter((f) => {
        const idx = severityOrder.indexOf(f.severity as RiskSeverity);
        return idx >= 0 && idx <= minIdx;
      });
    }
    return findings;
  }
}
