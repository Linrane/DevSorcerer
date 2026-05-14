import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSession, getSessionTimeline } from '../api/client';
import { SessionReplay } from '../components/session/SessionReplay';
import { ErrorLoopHighlight } from '../components/session/ErrorLoopHighlight';
import { ChevronRight } from 'lucide-react';
import { useT } from '../i18n';

export function SessionDetail() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id!),
    enabled: !!id,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => getSessionTimeline(id!),
    enabled: !!id,
  });

  const isLoading = sessionLoading || timelineLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('Session not found.')}</p>
        <Link to="/sessions" className="text-sm text-purple-400 hover:text-purple-300 mt-2 inline-block">
          {t('Back to sessions')}
        </Link>
      </div>
    );
  }

  const steps = timeline?.steps || [];
  const toolCalls = steps.filter((s) => s.toolName);
  const errors = steps.filter((s) => s.isError);
  const duration = steps.length > 1
    ? Math.round((steps[steps.length - 1]!.timestamp - steps[0]!.timestamp) / 1000)
    : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/sessions" className="hover:text-gray-300">{t('Sessions')}</Link>
        <ChevronRight size={14} />
        <span className="text-gray-400 font-mono text-xs">{id?.slice(0, 16)}...</span>
      </div>

      {/* Session Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold font-mono text-purple-400">
            {t('Session')} {session.id.slice(0, 20)}...
          </h2>
          <span
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              session.status === 'completed'
                ? 'bg-green-500/10 text-green-400'
                : session.status === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-blue-500/10 text-blue-400'
            }`}
          >
            {t(session.status)}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('Agent:')} </span>
            <span className="text-gray-300">{session.agentName} v{session.agentVersion || '?'}</span>
          </div>
          <div>
            <span className="text-gray-500">{t('Branch:')} </span>
            <span className="text-gray-300 font-mono">{session.branch || t('unknown')}</span>
          </div>
          <div>
            <span className="text-gray-500">{t('Started:')} </span>
            <span className="text-gray-300">{new Date(session.startedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">{t('Cost:')} </span>
            <span className="text-green-400 font-mono">${session.totalCost.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox label={t('Events')} value={session.totalEvents.toLocaleString()} />
        <StatBox label={t('Tokens')} value={`${(session.totalTokens / 1000).toFixed(1)}K`} />
        <StatBox label={t('Cost')} value={`$${session.totalCost.toFixed(3)}`} color="text-green-400" />
        <StatBox label={t('Tool Calls')} value={toolCalls.length} />
        <StatBox label={t('Errors')} value={errors.length} color={errors.length > 0 ? 'text-red-400' : undefined} />
        <StatBox label={t('Duration')} value={duration > 0 ? `${duration}s` : '-'} />
      </div>

      {/* Session Replay Player */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-4">{t('Timeline Replay')}</h3>
        <SessionReplay steps={steps} />
      </div>

      {/* Error Loops + Tool Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorLoopHighlight steps={steps} />
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('Tool Call Summary')}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {toolCalls.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">{t('No tool calls in this session.')}</p>
            ) : (
              (() => {
                const counts: Record<string, { count: number; errors: number; totalLatency: number }> = {};
                toolCalls.forEach((s) => {
                  const name = s.toolName || t('unknown');
                  if (!counts[name]) counts[name] = { count: 0, errors: 0, totalLatency: 0 };
                  counts[name].count++;
                  if (s.isError) counts[name].errors++;
                  counts[name].totalLatency += s.latencyMs || 0;
                });
                return Object.entries(counts)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([name, stats]) => (
                    <div key={name} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-300">{name}</span>
                        {stats.errors > 0 && (
                          <span className="text-xs text-red-400 ml-2">({stats.errors} {t('errors')})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="mr-3">{stats.count} {t('calls')}</span>
                        <span>{(stats.totalLatency / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  ));
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${color || 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  );
}
