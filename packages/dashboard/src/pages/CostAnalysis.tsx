import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions, getCostAnalysis, type SessionCost, type ProjectCost } from '../api/client';
import { CostTrendChart } from '../components/charts/CostTrendChart';
import { ToolUsagePie } from '../components/charts/ToolUsagePie';
import { useT } from '../i18n';
import { Cpu } from 'lucide-react';

function isSessionCost(d: SessionCost | ProjectCost): d is SessionCost {
  return 'sessionId' in d && 'modelBreakdown' in d;
}

export function CostAnalysis() {
  const { t } = useT();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showModels, setShowModels] = useState(true);

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'cost'],
    queryFn: () => getSessions({ limit: 50 }),
  });

  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ['cost', selectedSessionId || 'all', timeRange],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const fromDate =
        timeRange === '7d' ? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] :
        timeRange === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] :
        timeRange === '90d' ? new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0] :
        undefined;
      return getCostAnalysis(
        selectedSessionId
          ? { session_id: selectedSessionId, from: fromDate, to: today }
          : { project_id: 'all', from: fromDate, to: today },
      );
    },
  });

  const sessions = sessionsData?.sessions || [];
  const modelBreakdown = costData && 'modelBreakdown' in costData ? costData.modelBreakdown : undefined;
  const totalCost = costData?.totalCost || 0;
  const totalTokens = costData?.totalTokens || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('Cost Analysis')}</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeRange === r
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Session Selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSessionId(null)}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            !selectedSessionId
              ? 'bg-purple-600/20 text-purple-300'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {t('All Sessions')}
        </button>
        {sessions.slice(0, 10).map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSessionId(s.id)}
            className={`px-3 py-1.5 text-sm rounded-lg font-mono ${
              selectedSessionId === s.id
                ? 'bg-purple-600/20 text-purple-300'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s.id.slice(0, 12)}...
          </button>
        ))}
      </div>

      {/* Summary stat cards */}
      {costData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">{t('Total Cost')}</div>
            <div className="text-2xl font-bold text-green-400">${totalCost.toFixed(4)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">{t('Total Tokens')}</div>
            <div className="text-2xl font-bold text-gray-200">{totalTokens.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">{t('Avg Cost / 1K Tokens')}</div>
            <div className="text-2xl font-bold text-purple-400">
              ${totalTokens > 0 ? ((totalCost / (totalTokens / 1000)) * 1000).toFixed(6) : '0.000000'}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">{t('Cost Trend')}</h3>
          <CostTrendChart />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">{t('Tool Cost Breakdown')}</h3>
          <ToolUsagePie />
        </div>
      </div>

      {/* Model Breakdown */}
      {modelBreakdown && modelBreakdown.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Cpu size={16} /> {t('Per-Model Cost')}
            </h3>
            <button
              onClick={() => setShowModels(!showModels)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              {showModels ? t('Hide') : t('Show')}
            </button>
          </div>
          {showModels && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left py-3 px-4 font-medium">{t('Model')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Calls')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Input Tokens')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Output Tokens')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Cost')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('% of Total')}</th>
                </tr>
              </thead>
              <tbody>
                {modelBreakdown.map((m) => {
                  const pct = totalCost > 0 ? (m.cost / totalCost) * 100 : 0;
                  return (
                    <tr key={m.model} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-gray-300 font-mono text-xs">{m.model}</td>
                      <td className="py-3 px-4 text-right text-gray-400">{m.callCount}</td>
                      <td className="py-3 px-4 text-right text-gray-400">{m.tokensIn.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-gray-400">{m.tokensOut.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-green-400 font-mono">${m.cost.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-500 text-xs w-10">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tool Breakdown */}
      {costData && 'toolBreakdown' in costData && costData.toolBreakdown.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-300 px-4 py-3 border-b border-gray-800">
            {t('Per-Tool Breakdown')}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-3 px-4 font-medium">{t('Tool')}</th>
                <th className="text-right py-3 px-4 font-medium">{t('Calls')}</th>
                <th className="text-right py-3 px-4 font-medium">{t('Input Tokens')}</th>
                <th className="text-right py-3 px-4 font-medium">{t('Output Tokens')}</th>
                <th className="text-right py-3 px-4 font-medium">{t('Cost')}</th>
                <th className="text-right py-3 px-4 font-medium">{t('% of Total')}</th>
              </tr>
            </thead>
            <tbody>
              {costData.toolBreakdown.map((t) => {
                const pct = totalCost > 0 ? (t.cost / totalCost) * 100 : 0;
                return (
                  <tr key={t.toolName} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-4 text-gray-300">{t.toolName}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{t.callCount}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{t.tokensIn.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{t.tokensOut.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-mono">${t.cost.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-500 text-xs w-10">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {(!costData || (costData && !('toolBreakdown' in costData)) || (costData && 'toolBreakdown' in costData && costData.toolBreakdown.length === 0)) && !costLoading && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <div className="text-gray-600 text-sm space-y-2">
            <p className="text-lg">{t('No cost data available yet.')}</p>
            <p>{t('Start an AI session with MCP tools enabled, then import the session data to see costs here.')}</p>
          </div>
        </div>
      )}

      {costLoading && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <div className="text-gray-500 text-sm">{t('Loading cost data...')}</div>
        </div>
      )}
    </div>
  );
}
