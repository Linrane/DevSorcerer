import { useQuery } from '@tanstack/react-query';
import { getRiskAnalysis } from '../../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function RiskSeverityBar() {
  const { data } = useQuery({
    queryKey: ['risk', 'severity-bar'],
    queryFn: () => getRiskAnalysis({ project_id: '' }),
  });

  const findings = data && 'findings' in data ? data.findings : [];

  const severityCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  const chartData = [
    { name: 'Critical', value: severityCounts.critical, fill: '#ef4444' },
    { name: 'High', value: severityCounts.high, fill: '#f97316' },
    { name: 'Medium', value: severityCounts.medium, fill: '#eab308' },
    { name: 'Low', value: severityCounts.low, fill: '#3b82f6' },
  ];

  const total = findings.length;

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No risk findings yet. Run risk analysis on sessions to see results.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis type="number" stroke="#4b5563" fontSize={11} />
        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={11} width={60} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
