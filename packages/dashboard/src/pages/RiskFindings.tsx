import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSessions, getRiskAnalysis } from '../api/client';
import { RiskSeverityBar } from '../components/charts/RiskSeverityBar';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { RiskFinding } from '../api/client';
import { useState } from 'react';

const severityConfig = {
  critical: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL' },
  high: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'HIGH' },
  medium: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'MEDIUM' },
  low: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'LOW' },
};

export function RiskFindings() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'risk'],
    queryFn: () => getSessions({ limit: 50 }),
  });

  const { data: riskData, isLoading } = useQuery({
    queryKey: ['risk', selectedSession],
    queryFn: () =>
      getRiskAnalysis(
        selectedSession
          ? { session_id: selectedSession }
          : { project_id: '' },
      ),
    enabled: !!selectedSession,
  });

  const sessions = sessionsData?.sessions || [];
  const findings = riskData && 'findings' in riskData ? riskData.findings : [];
  const overallScore = riskData && 'overallScore' in riskData ? riskData.overallScore : 0;

  // Group findings by severity
  const bySeverity = {
    critical: findings.filter((f: RiskFinding) => f.severity === 'critical').length,
    high: findings.filter((f: RiskFinding) => f.severity === 'high').length,
    medium: findings.filter((f: RiskFinding) => f.severity === 'medium').length,
    low: findings.filter((f: RiskFinding) => f.severity === 'low').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield size={24} /> Risk Findings
        </h2>
        {overallScore > 0 && (
          <div
            className={`px-3 py-1 rounded-lg text-sm font-mono ${
              overallScore >= 50
                ? 'bg-red-500/10 text-red-400'
                : overallScore >= 25
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-green-500/10 text-green-400'
            }`}
          >
            Risk Score: {overallScore}/100
          </div>
        )}
      </div>

      {/* Session selector */}
      <div className="flex gap-2 flex-wrap">
        {sessions.slice(0, 15).map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSession(s.id)}
            className={`px-3 py-1.5 text-sm rounded-lg font-mono ${
              selectedSession === s.id
                ? 'bg-purple-600/20 text-purple-300'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s.id.slice(0, 10)}...
          </button>
        ))}
      </div>

      {/* Findings */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      ) : findings.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          <Shield size={48} className="mx-auto mb-3 text-gray-700" />
          <p>Select a session to scan for security risks.</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Each AI-generated code diff is scanned against 8 security rules — secrets, injection, path traversal, eval, crypto, auth, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Severity summary bar */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Severity Breakdown</h3>
            <div className="space-y-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                const count = bySeverity[severity];
                const config = severityConfig[severity];
                const Icon = config.icon;
                const max = findings.length || 1;
                const pct = (count / max) * 100;
                return (
                  <div key={severity} className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${config.bg}`}>
                      <Icon size={14} className={config.color} />
                    </div>
                    <span className="text-xs text-gray-400 w-16">{config.label}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual findings */}
          <div className="space-y-3">
            {findings.map((f: RiskFinding) => {
              const config = severityConfig[f.severity];
              const Icon = config.icon;
              return (
                <div
                  key={f.id}
                  className={`bg-gray-900 rounded-xl border ${config.border} p-4 hover:bg-gray-800/30 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                          {f.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                          {f.category}
                        </span>
                        <span className="text-xs text-gray-600">{f.ruleId}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{f.description}</p>
                      <div className="mt-2 bg-gray-950 rounded p-2 text-xs font-mono text-gray-400 overflow-x-auto">
                        <span className="text-gray-600">{f.filePath}</span>
                        {f.lineStart && (
                          <span className="text-gray-500">:{f.lineStart}</span>
                        )}
                        <pre className="mt-1 text-yellow-300/80">{f.snippet}</pre>
                      </div>
                    </div>
                    <Link
                      to={`/sessions/${f.sessionId}`}
                      className="text-gray-600 hover:text-gray-400 flex-shrink-0"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
