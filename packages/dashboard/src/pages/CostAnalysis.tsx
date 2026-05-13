import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions, getCostAnalysis } from '../api/client';
import { CostTrendChart } from '../components/charts/CostTrendChart';
import { ToolUsagePie } from '../components/charts/ToolUsagePie';

export function CostAnalysis() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cost Analysis</h2>
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
          All Sessions
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

      {/* Cost Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Cost Trend</h3>
          <CostTrendChart />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tool Cost Breakdown</h3>
          <ToolUsagePie />
        </div>
      </div>

      {/* Detailed Breakdown */}
      {costData && 'toolBreakdown' in costData && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-3 px-4 font-medium">Tool</th>
                <th className="text-right py-3 px-4 font-medium">Calls</th>
                <th className="text-right py-3 px-4 font-medium">Input Tokens</th>
                <th className="text-right py-3 px-4 font-medium">Output Tokens</th>
                <th className="text-right py-3 px-4 font-medium">Cost</th>
                <th className="text-right py-3 px-4 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {costData.toolBreakdown.map((t) => {
                const pct = costData.totalCost > 0 ? (t.cost / costData.totalCost) * 100 : 0;
                return (
                  <tr key={t.toolName} className="border-b border-gray-800/50">
                    <td className="py-3 px-4 text-gray-300">{t.toolName}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{t.callCount}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {t.tokensIn.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {t.tokensOut.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-green-400 font-mono">
                      ${t.cost.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs w-10">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
