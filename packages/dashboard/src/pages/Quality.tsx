import { useQuery } from '@tanstack/react-query';
import { getSessions, getQualityAnalysis } from '../api/client';
import { QualityTimelineChart } from '../components/charts/QualityTimelineChart';
import { TrendingUp, RotateCcw, Bug, CheckCircle, FileEdit, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

export function Quality() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'quality'],
    queryFn: () => getSessions({ limit: 50 }),
  });

  const { data: qualityData, isLoading } = useQuery({
    queryKey: ['quality', selectedSession],
    queryFn: () =>
      getQualityAnalysis(
        selectedSession
          ? { session_id: selectedSession }
          : { project_id: '' },
      ),
    enabled: !!selectedSession,
  });

  const sessions = sessionsData?.sessions || [];
  const q = qualityData && 'acceptanceRate' in qualityData ? qualityData : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ThumbsUp size={22} /> Quality Metrics
      </h2>
      <p className="text-sm text-gray-500">
        Measure how much AI-generated code is accepted, modified, or rolled back — so you can track ROI and code quality.
      </p>

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

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-48 rounded-xl" />
        </div>
      ) : q ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Acceptance Rate"
              value={`${q.acceptanceRate}%`}
              icon={CheckCircle}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Files Created"
              value={q.filesCreated ?? 0}
              icon={FileEdit}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Rollbacks"
              value={q.rollbackCount ?? 0}
              icon={RotateCcw}
              color="text-orange-400"
              bg="bg-orange-500/10"
            />
            <StatCard
              label="AI Bugs"
              value={q.bugCount ?? '-'}
              icon={Bug}
              color={q.bugCount ? 'text-red-400' : 'text-gray-500'}
              bg={q.bugCount ? 'bg-red-500/10' : 'bg-gray-500/10'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Quality Radar</h3>
              <QualityTimelineChart />
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Files Modified</span>
                  <span className="text-gray-300 font-mono">{q.filesModified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Files Accepted</span>
                  <span className="text-green-400 font-mono">{q.filesAccepted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Acceptance</span>
                  <span className={`font-mono ${q.acceptanceRate >= 80 ? 'text-green-400' : q.acceptanceRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {q.acceptanceRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          <TrendingUp size={48} className="mx-auto mb-3 text-gray-700" />
          <p>Select a session to view quality metrics.</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Quality analysis measures AI code acceptance rate, rollback frequency, and AI-introduced bugs via git history.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
