import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSessions, exportAudit } from '../api/client';
import { FileText, Download, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';

export function AuditExport() {
  const { t } = useT();
  const [format, setFormat] = useState<'json' | 'csv' | 'ndjson'>('json');
  const [scope, setScope] = useState<'full' | 'anonymized'>('full');
  const [projectId, setProjectId] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'audit'],
    queryFn: () => getSessions({ limit: 50 }),
  });

  const sessions = sessionsData?.sessions || [];
  const projects = [...new Set(sessions.map((s) => s.projectId).filter(Boolean))];

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportAudit({
        project_id: projectId || undefined,
        format,
        scope,
      });
      // Download as file
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devsorcerer-audit-${new Date().toISOString().split('T')[0]}.${format === 'ndjson' ? 'ndjson' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ShieldCheck size={24} /> {t('Audit Export')}
      </h2>
      <p className="text-sm text-gray-500">
        {t('Export timestamped agent event logs for SOC2/ISO compliance audits. Supports CSV, JSON, and NDJSON formats with optional anonymization.')}
      </p>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        {/* Format */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">{t('Export Format')}</label>
          <div className="flex gap-2">
            {(['json', 'csv', 'ndjson'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 rounded-lg text-sm font-mono ${
                  format === f
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Scope */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">{t('Data Scope')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope('full')}
              className={`px-4 py-2 rounded-lg text-sm ${
                scope === 'full'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {t('Full (includes file paths, project names)')}
            </button>
            <button
              onClick={() => setScope('anonymized')}
              className={`px-4 py-2 rounded-lg text-sm ${
                scope === 'anonymized'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {t('Anonymized (strips identifiers)')}
            </button>
          </div>
        </div>

        {/* Project Filter */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            {t('Project Filter (optional)')}
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200"
          >
            <option value="">{t('All Projects')}</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          {exporting ? t('Exporting...') : t('Export Audit Log')}
        </button>

        <p className="text-xs text-gray-600 text-center">
          {t('Audit logs include timestamps, agent identity, tool calls, and event sequences. Raw code content is excluded in anonymized exports.')}
        </p>
      </div>
    </div>
  );
}
