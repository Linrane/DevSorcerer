import { useQuery } from '@tanstack/react-query';
import { getSessions, getCostAnalysis } from '../../api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useT } from '../../i18n';

export function CostTrendChart() {
  const { t } = useT();

  const { data: costData, isLoading } = useQuery({
    queryKey: ['cost', 'all', 'all', 'cost-trend'],
    queryFn: () => getCostAnalysis({ project_id: 'all' }),
  });

  // Always call hooks at top level — never conditional
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'cost-trend-fallback'],
    queryFn: () => getSessions({ limit: 200 }),
    enabled: !costData || !('dailyCosts' in costData) || costData.dailyCosts.length === 0,
  });

  let chartData: { date: string; cost: number; sessions: number }[] = [];

  if (costData && 'dailyCosts' in costData && costData.dailyCosts.length > 0) {
    chartData = costData.dailyCosts
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date.slice(5),
        cost: Math.round(d.cost * 10000) / 10000,
        sessions: d.sessionCount,
      }));
  } else if (sessionsData?.sessions) {
    const dailyMap = new Map<string, { cost: number; count: number }>();
    for (const s of sessionsData.sessions) {
      const day = new Date(s.startedAt).toISOString().split('T')[0]!;
      const e = dailyMap.get(day) || { cost: 0, count: 0 };
      e.cost += s.totalCost || 0;
      e.count += 1;
      dailyMap.set(day, e);
    }
    chartData = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date: date.slice(5), cost: Math.round(d.cost * 10000) / 10000, sessions: d.count }));
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        {t('Loading cost data...')}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm flex-col gap-1">
        <p>{t('No cost data yet.')}</p>
        <p className="text-xs text-gray-700">{t('Import session data or start capturing to see trends.')}</p>
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
            backgroundColor: '#1f2937', border: '1px solid #374151',
            borderRadius: '8px', fontSize: '12px',
          }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, t('Cost')]}
        />
        <Area type="monotone" dataKey="cost" stroke="#8b5cf6"
          fill="url(#costGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
