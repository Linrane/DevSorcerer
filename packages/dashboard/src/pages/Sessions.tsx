import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../api/client';
import { Link } from 'react-router-dom';
import { Search, ListTree } from 'lucide-react';
import { useT } from '../i18n';

export function Sessions() {
  const { t } = useT();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ListTree size={22} /> {t('Sessions')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">{sessions.length}{t(' total')}</span>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder={t('Search sessions...')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          <ListTree size={48} className="mx-auto mb-3 text-gray-700" />
          <p>{t('No sessions yet.')}</p>
          <p className="text-sm mt-1">{t('Start the devsorcerer proxy to begin capturing AI agent activity.')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left py-3 px-4 font-medium">{t('Session ID')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('Agent')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('Branch')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('Started')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Events')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Tokens')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Cost')}</th>
                  <th className="text-right py-3 px-4 font-medium">{t('Status')}</th>
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
                    <td className="py-3 px-4 text-gray-500 text-xs">
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
                        {t(s.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="block bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-purple-400 text-sm">{s.id.slice(0, 16)}...</span>
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
                    {t(s.status)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>{s.agentName}</span>
                    <span>{s.branch || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{new Date(s.startedAt).toLocaleString()}</span>
                    <span className="text-green-400">${s.totalCost.toFixed(4)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {t('No sessions matching')} "{filter}".
            </div>
          )}
        </>
      )}
    </div>
  );
}
