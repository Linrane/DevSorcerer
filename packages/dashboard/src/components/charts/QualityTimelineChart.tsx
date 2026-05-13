import { useQuery } from '@tanstack/react-query';
import { getQualityAnalysis } from '../../api/client';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

export function QualityTimelineChart() {
  const { data } = useQuery({
    queryKey: ['quality', 'radar'],
    queryFn: () => getQualityAnalysis({ project_id: '' }),
  });

  const q = data && 'acceptanceRate' in data ? data : null;

  const chartData = q
    ? [
        { subject: 'Acceptance', value: q.acceptanceRate, fullMark: 100 },
        {
          subject: 'Low Rollback',
          value: Math.max(0, 100 - ((q.rollbackCount ?? 0) * 20)),
          fullMark: 100,
        },
        { subject: 'Low Bugs', value: q.bugCount ? Math.max(0, 100 - q.bugCount * 10) : 100, fullMark: 100 },
        { subject: 'Created', value: Math.min(100, (q.filesCreated ?? 0) * 10), fullMark: 100 },
        { subject: 'Modified', value: Math.min(100, (q.filesModified ?? 0) * 10), fullMark: 100 },
      ]
    : [];

  if (!q) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        No quality data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#1f2937" />
        <PolarAngleAxis dataKey="subject" stroke="#4b5563" fontSize={11} />
        <PolarRadiusAxis stroke="#4b5563" fontSize={10} />
        <Radar
          name="Quality"
          dataKey="value"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
