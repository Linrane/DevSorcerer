import { useQuery } from '@tanstack/react-query';
import { getSessions, getQualityAnalysis } from '../api/client';
import { QualityTimelineChart } from '../components/charts/QualityTimelineChart';
import { TrendingUp, RotateCcw, Bug, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export function Quality() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'quality'],
    queryFn: () => getSessions({ limit: 50 }),
  });

  const { data: qualityData } = useQuery({
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
  const q =
    qualityData && 'acceptanceRate' in qualityData ? qualityData : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Quality Metrics</h2>

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

      {q ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Acceptance Rate"
              value={`${q.acceptanceRate}%`}
              icon={CheckCircle}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Files Created"
              value={q.filesCreated}
              icon={TrendingUp}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Rollbacks"
              value={q.rollbackCount}
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

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Quality Timeline</h3>
              <QualityTimelineChart />
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Session Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Files Modified</span>
                  <span className="text-gray-300">{q.filesModified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Files Accepted</span>
                  <span className="text-green-400">{q.filesAccepted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Acceptance</span>
                  <span className={q.acceptanceRate >= 80 ? 'text-green-400' : 'text-yellow-400'}>
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
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
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
