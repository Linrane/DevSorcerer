import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../api/client';
import { Link } from 'react-router-dom';
import { Search, ListTree, Clock, Cpu, FolderGit2, Hash } from 'lucide-react';
import { useT } from '../i18n';

function formatDuration(startedAt: number, endedAt?: number): string {
  const end = endedAt || Date.now();
  const ms = end - startedAt;
  if (ms < 0) return '<1m';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(ms / 1000)}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-CA', { month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

export function Sessions() {
  const { t } = useT();
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'list'],
    queryFn: () => getSessions({ limit: 200 }),
    refetchInterval: 15000,
  });

  const sessions = data?.sessions || [];

  const filtered = filter
    ? sessions.filter(
        (s) =>
          s.id.includes(filter) ||
          s.agentName.toLowerCase().includes(filter.toLowerCase()) ||
          s.branch?.toLowerCase().includes(filter.toLowerCase()) ||
          s.title?.toLowerCase().includes(filter.toLowerCase()) ||
          s.projectName?.toLowerCase().includes(filter.toLowerCase()),
      )
    : sessions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ListTree size={22} /> {t('Sessions')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {filtered.length !== sessions.length ? `${filtered.length}/` : ''}{sessions.length}{t(' total')}
          </span>
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
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 w-full sm:w-72"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
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
          <div className="hidden lg:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
                  <th className="text-center py-3 px-2 font-medium w-10">#</th>
                  <th className="text-left py-3 px-3 font-medium">{t('Session')}</th>
                  <th className="text-left py-3 px-3 font-medium">{t('Project')}</th>
                  <th className="text-left py-3 px-3 font-medium">{t('Model')}</th>
                  <th className="text-left py-3 px-3 font-medium hidden xl:table-cell">{t('Started')}</th>
                  <th className="text-center py-3 px-3 font-medium">{t('Duration')}</th>
                  <th className="text-right py-3 px-3 font-medium">{t('Tools')}</th>
                  <th className="text-right py-3 px-3 font-medium">{t('Tokens')}</th>
                  <th className="text-right py-3 px-3 font-medium">{t('Cost')}</th>
                  <th className="text-center py-3 px-3 font-medium">{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group"
                  >
                    <td className="py-3 px-2 text-center text-gray-600 text-xs font-mono">
                      {i + 1}
                    </td>
                    <td className="py-3 px-3 max-w-80">
                      <Link
                        to={`/sessions/${s.id}`}
                        className="text-purple-400 hover:text-purple-300 font-medium block truncate"
                      >
                        {s.title || s.id.slice(0, 16) + '...'}
                      </Link>
                      {s.title && (
                        <span className="text-xs text-gray-600 font-mono block truncate">
                          {s.id.slice(0, 12)}...
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">
                        <FolderGit2 size={11} />
                        {s.projectName || s.projectId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {s.modelName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400">
                          <Cpu size={11} />
                          {s.modelName}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs hidden xl:table-cell">
                      {formatDate(s.startedAt)}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-400 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(s.startedAt, s.endedAt)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400 font-mono text-xs">
                      {s.totalEvents}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400 font-mono text-xs">
                      {(s.totalTokens / 1000).toFixed(1)}K
                    </td>
                    <td className="py-3 px-3 text-right text-green-400 font-mono text-xs">
                      ${s.totalCost.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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

          {/* Tablet / Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((s, i) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="block bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-600 font-mono flex-shrink-0">#{i + 1}</span>
                    <span className="font-medium text-purple-300 text-sm truncate">
                      {s.title || s.id.slice(0, 16) + '...'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
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

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                    <FolderGit2 size={10} />
                    {s.projectName || s.projectId}
                  </span>
                  {s.modelName && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400">
                      <Cpu size={10} />
                      {s.modelName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-500">
                    <Clock size={10} />
                    {formatDuration(s.startedAt, s.endedAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(s.startedAt)}</span>
                  <div className="flex items-center gap-4">
                    <span>{s.totalEvents} {t('tools')}</span>
                    <span>{(s.totalTokens / 1000).toFixed(1)}K</span>
                    <span className="text-green-400 font-mono">${s.totalCost.toFixed(4)}</span>
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
