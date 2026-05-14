import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/client';
import { Settings as SettingsIcon, Save, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useT, languages } from '../i18n';

export function Settings() {
  const { t, lang, setLang } = useT();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (settings) setLocalSettings({ ...settings });
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    mutation.mutate(localSettings as Record<string, unknown>);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <SettingsIcon size={24} /> {t('Settings')}
      </h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        {/* Language */}
        <div>
          <label className="text-sm text-gray-400 flex items-center gap-1.5 mb-2">
            <Globe size={14} /> {t('Language')}
          </label>
          <div className="flex gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  lang === l.code
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Server Port */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Server Port')}</label>
          <input
            type="number"
            value={(localSettings.serverPort as number) || 3199}
            onChange={(e) => handleChange('serverPort', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200"
          />
        </div>

        {/* DB Path */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Database Path')}</label>
          <input
            type="text"
            value={(localSettings.dbPath as string) || '.vault/devsorcerer.sqlite'}
            onChange={(e) => handleChange('dbPath', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono"
          />
        </div>

        {/* Embedding Model */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Embedding Model')}</label>
          <input
            type="text"
            value={
              (localSettings.embeddingModel as string) || 'Xenova/all-MiniLM-L6-v2'
            }
            onChange={(e) => handleChange('embeddingModel', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono"
          />
          <p className="text-xs text-gray-600 mt-1">
            {t('Requires model to be available from HuggingFace Hub.')}
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Dashboard Enabled')}</span>
            <input
              type="checkbox"
              checked={(localSettings.dashboardEnabled as boolean) ?? true}
              onChange={(e) => handleChange('dashboardEnabled', e.target.checked)}
              className="toggle"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Capture Enabled')}</span>
            <input
              type="checkbox"
              checked={(localSettings.captureEnabled as boolean) ?? true}
              onChange={(e) => handleChange('captureEnabled', e.target.checked)}
              className="toggle"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Anonymize Exports by Default')}</span>
            <input
              type="checkbox"
              checked={(localSettings.anonymizeExport as boolean) ?? false}
              onChange={(e) => handleChange('anonymizeExport', e.target.checked)}
              className="toggle"
            />
          </label>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {mutation.isPending ? t('Saving...') : t('Save Settings')}
        </button>

        {mutation.isSuccess && (
          <p className="text-sm text-green-400 text-center">{t('Settings saved successfully.')}</p>
        )}
        {mutation.isError && (
          <p className="text-sm text-red-400 text-center">
            {t('Failed to save:')} {mutation.error instanceof Error ? mutation.error.message : t('Unknown error')}
          </p>
        )}
      </div>
    </div>
  );
}
