import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getStatus, getSessions, getCostAnalysis } from '../api/client';
import { CostTrendChart } from '../components/charts/CostTrendChart';
import { ToolUsagePie } from '../components/charts/ToolUsagePie';
import {
  Activity,
  DollarSign,
  Layers,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export function Overview() {
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
    refetchInterval: 15000,
  });
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'recent'],
    queryFn: () => getSessions({ limit: 10 }),
  });
  const { data: costData } = useQuery({
    queryKey: ['cost', 'overview'],
    queryFn: () => getCostAnalysis({ project_id: 'all' }),
  });

  const sessions = sessionsData?.sessions || [];
  const totalCost = costData && 'totalCost' in costData ? costData.totalCost : 0;
  const totalTokens = costData && 'totalTokens' in costData ? costData.totalTokens : 0;

  const statCards = [
    {
      label: 'Total Sessions',
      value: (status?.database.sessions || 0).toLocaleString(),
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Cost',
      value: `$${totalCost.toFixed(4)}`,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Total Tokens',
      value: totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : totalTokens.toLocaleString(),
      icon: Layers,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Projects',
      value: (status?.database.projects || 0).toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <span className="text-xs text-gray-600 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full live-dot" />
          Live
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Cost Trend</h3>
          <CostTrendChart />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Top Tools by Usage</h3>
          <ToolUsagePie />
        </div>
      </div>

      {/* Quick Insights + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Why DevSorcerer? */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">What DevSorcerer Tells You</h3>
          <div className="space-y-3">
            {[
              { q: 'Why did this AI task cost so much?', a: 'Token cost per tool call, by project and date.' },
              { q: 'Is AI-generated code secure?', a: 'Scans every diff for secrets, injection, unsafe patterns.' },
              { q: 'Why does AI keep failing?', a: 'Replays thinking chain, highlights error loops.' },
              { q: 'What\'s the ROI of AI coding?', a: 'Acceptance rate, rollback rate, AI bug rate.' },
            ].map((item) => (
              <div key={item.q} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-colors">
                <p className="text-sm text-gray-300 font-medium">{item.q}</p>
                <p className="text-xs text-gray-500 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Recent Sessions</h3>
            <Link to="/sessions" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">
              No sessions yet. Start a devsorcerer proxy to capture AI activity.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 font-medium">Session</th>
                  <th className="text-left py-2 font-medium">Agent</th>
                  <th className="text-right py-2 font-medium">Tools</th>
                  <th className="text-right py-2 font-medium">Cost</th>
                  <th className="text-right py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 font-mono text-purple-400">
                      <Link to={`/sessions/${s.id}`} className="hover:underline">
                        {s.id.slice(0, 12)}...
                      </Link>
                    </td>
                    <td className="py-2 text-gray-300">{s.agentName}</td>
                    <td className="py-2 text-right text-gray-400">{s.totalEvents}</td>
                    <td className="py-2 text-right text-green-400 font-mono">
                      ${s.totalCost.toFixed(4)}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          s.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : s.status === 'error'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
