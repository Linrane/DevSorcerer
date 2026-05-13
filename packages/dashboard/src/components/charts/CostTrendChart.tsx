import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../../api/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export function CostTrendChart() {
  const { data } = useQuery({
    queryKey: ['sessions', 'cost-trend'],
    queryFn: () => getSessions({ limit: 100 }),
  });

  const sessions = data?.sessions || [];

  // Group sessions by date
  const dailyMap = new Map<string, { cost: number; count: number }>();
  for (const s of sessions) {
    const day = new Date(s.startedAt).toISOString().split('T')[0]!;
    const existing = dailyMap.get(day) || { cost: 0, count: 0 };
    existing.cost += s.totalCost;
    existing.count += 1;
    dailyMap.set(day, existing);
  }

  const chartData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date: date.slice(5), // MM-DD
      cost: Math.round(d.cost * 10000) / 10000,
      sessions: d.count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        No session data yet. Start capturing events to see trends.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" stroke="#4b5563" fontSize={11} />
        <YAxis stroke="#4b5563" fontSize={11} tickFormatter={(v: number) => `$${v}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#8b5cf6"
          fill="url(#costGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
