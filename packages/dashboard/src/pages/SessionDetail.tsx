import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSession, getSessionTimeline } from '../api/client';
import { TimelineView } from '../components/session/TimelineView';
import { ToolCallCard } from '../components/session/ToolCallCard';
import { ErrorLoopHighlight } from '../components/session/ErrorLoopHighlight';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => getSessionTimeline(id!),
    enabled: !!id,
  });

  if (!session) {
    return <div className="text-gray-500">Loading session...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold font-mono text-purple-400">
            {session.id.slice(0, 20)}...
          </h2>
          <span
            className={`px-3 py-1 rounded-lg text-sm ${
              session.status === 'completed'
                ? 'bg-green-500/10 text-green-400'
                : session.status === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-blue-500/10 text-blue-400'
            }`}
          >
            {session.status}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Agent: </span>
            <span className="text-gray-300">{session.agentName} v{session.agentVersion || '?'}</span>
          </div>
          <div>
            <span className="text-gray-500">Branch: </span>
            <span className="text-gray-300 font-mono">{session.branch || 'unknown'}</span>
          </div>
          <div>
            <span className="text-gray-500">Started: </span>
            <span className="text-gray-300">{new Date(session.startedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Cost: </span>
            <span className="text-green-400 font-mono">${session.totalCost.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        <StatBox label="Events" value={session.totalEvents} />
        <StatBox label="Tokens" value={`${(session.totalTokens / 1000).toFixed(1)}K`} />
        <StatBox label="Cost" value={`$${session.totalCost.toFixed(3)}`} color="text-green-400" />
        {timeline && (
          <>
            <StatBox label="Tool Calls" value={timeline.steps.filter(s => s.toolName).length} />
            <StatBox
              label="Errors"
              value={timeline.steps.filter(s => s.isError).length}
              color={timeline.steps.some((s) => s.isError) ? 'text-red-400' : undefined}
            />
            <StatBox
              label="Duration"
              value={
                timeline.steps.length > 1
                  ? `${Math.round(
                      (timeline.steps[timeline.steps.length - 1]!.timestamp -
                        timeline.steps[0]!.timestamp) /
                        1000,
                    )}s`
                  : '-'
              }
            />
          </>
        )}
      </div>

      {/* Timeline and Details */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Timeline</h3>
          {timeline && <TimelineView steps={timeline.steps} />}
        </div>
        <div className="col-span-3 space-y-4">
          {timeline && <ErrorLoopHighlight steps={timeline.steps} />}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Tool Calls</h3>
            <div className="space-y-2">
              {timeline?.steps
                .filter((s) => s.toolName)
                .slice(-8)
                .reverse()
                .map((step) => (
                  <ToolCallCard key={step.id} step={step} />
                ))}
            </div>
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
      <p className={`font-mono font-semibold ${color || 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  );
}
