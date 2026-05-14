import { useQuery } from '@tanstack/react-query';
import { getCostAnalysis } from '../../api/client';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useT } from '../../i18n';

const COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#eab308',
  '#ef4444', '#ec4899', '#06b6d4', '#f97316',
];

export function ToolUsagePie() {
  const { t } = useT();
  const { data } = useQuery({
    queryKey: ['cost', 'tool-pie'],
    queryFn: () => getCostAnalysis({ project_id: 'all' }),
  });

  const breakdown =
    data && 'toolBreakdown' in data
      ? data.toolBreakdown.slice(0, 8)
      : [];

  const pieData = breakdown.map((t) => ({
    name: t.toolName,
    value: Math.round(t.cost * 10000) / 10000,
  }));

  if (pieData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        {t('No tool usage data yet.')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {pieData.map((_, idx) => (
            <Cell
              key={idx}
              fill={COLORS[idx % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, t('Cost')]}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
