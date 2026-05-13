import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../api/client';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export function Sessions() {
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'list'],
    queryFn: () => getSessions({ limit: 100 }),
    refetchInterval: 10000,
  });

  const sessions = data?.sessions || [];

  const filtered = filter
    ? sessions.filter(
        (s) =>
          s.id.includes(filter) ||
          s.agentName.toLowerCase().includes(filter.toLowerCase()) ||
          s.branch?.toLowerCase().includes(filter.toLowerCase()),
      )
    : sessions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search sessions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading sessions...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-3 px-4 font-medium">Session ID</th>
                <th className="text-left py-3 px-4 font-medium">Agent</th>
                <th className="text-left py-3 px-4 font-medium">Branch</th>
                <th className="text-left py-3 px-4 font-medium">Started</th>
                <th className="text-right py-3 px-4 font-medium">Events</th>
                <th className="text-right py-3 px-4 font-medium">Tokens</th>
                <th className="text-right py-3 px-4 font-medium">Cost</th>
                <th className="text-right py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 px-4 font-mono">
                    <Link
                      to={`/sessions/${s.id}`}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      {s.id.slice(0, 16)}...
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{s.agentName}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                    {s.branch || '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {s.totalEvents}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {(s.totalTokens / 1000).toFixed(1)}K
                  </td>
                  <td className="py-3 px-4 text-right text-green-400 font-mono">
                    ${s.totalCost.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.status === 'completed'
                          ? 'bg-green-500/10 text-green-400'
                          : s.status === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : s.status === 'active'
                              ? 'bg-blue-500/10 text-blue-400'
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
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No sessions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
