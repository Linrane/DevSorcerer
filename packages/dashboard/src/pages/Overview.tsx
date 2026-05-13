import { useQuery } from '@tanstack/react-query';
import { getStatus, getSessions } from '../api/client';
import { CostTrendChart } from '../components/charts/CostTrendChart';
import { ToolUsagePie } from '../components/charts/ToolUsagePie';
import { RiskSeverityBar } from '../components/charts/RiskSeverityBar';
import {
  Activity,
  DollarSign,
  Shield,
  TrendingUp,
  Layers,
} from 'lucide-react';

export function Overview() {
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: getStatus, refetchInterval: 15000 });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => getSessions({ limit: 10 }) });

  const sessions = sessionsData?.sessions || [];
  const totalCost = sessions.reduce((s, s2) => s + s2.totalCost, 0);

  const statCards = [
    {
      label: 'Total Sessions',
      value: status?.database.sessions || 0,
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Events Captured',
      value: (status?.database.events || 0).toLocaleString(),
      icon: Layers,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Projects',
      value: status?.database.projects || 0,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
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
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Cost Trend (30 days)</h3>
          <CostTrendChart />
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Top Tools by Usage</h3>
          <ToolUsagePie />
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Sessions</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-2 font-medium">Session ID</th>
              <th className="text-left py-2 font-medium">Agent</th>
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-right py-2 font-medium">Tools</th>
              <th className="text-right py-2 font-medium">Cost</th>
              <th className="text-right py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 5).map((s) => (
              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 font-mono text-purple-400">
                  <a href={`/sessions/${s.id}`}>{s.id.slice(0, 12)}...</a>
                </td>
                <td className="py-2 text-gray-300">{s.agentName}</td>
                <td className="py-2 text-gray-500">
                  {new Date(s.startedAt).toLocaleDateString()}
                </td>
                <td className="py-2 text-right text-gray-400">{s.totalEvents}</td>
                <td className="py-2 text-right text-green-400">
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
      </div>
    </div>
  );
}
