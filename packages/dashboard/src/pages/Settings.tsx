import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/client';
import { Settings as SettingsIcon, Save, Globe, Plus, Trash2, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useT, languages } from '../i18n';

interface PricingEntry {
  inputPer1k: number;
  outputPer1k: number;
}

type PricingTable = Record<string, PricingEntry>;

export function Settings() {
  const { t, lang, setLang } = useT();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});
  const [pricing, setPricing] = useState<PricingTable>({});
  const [newModel, setNewModel] = useState('');
  const [newInput, setNewInput] = useState('0.003');
  const [newOutput, setNewOutput] = useState('0.015');
  const [pricingError, setPricingError] = useState('');
  const [addError, setAddError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
      setPricing((settings.pricing as PricingTable) || {});
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSavedMsg(t('Settings saved successfully.'));
      setPricingError('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setPricingError(err.message || t('Unknown error'));
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/pricing/reset', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setPricing(data.pricing as PricingTable);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSavedMsg(t('Pricing reset to defaults.'));
      setPricingError('');
      setTimeout(() => setSavedMsg(''), 3000);
    },
    onError: (err: Error) => {
      setPricingError(err.message);
    },
  });

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePricingChange = (model: string, field: 'inputPer1k' | 'outputPer1k', raw: string) => {
    const num = parseFloat(raw);
    setPricing((prev) => ({
      ...prev,
      [model]: {
        ...prev[model],
        [field]: isNaN(num) ? ('' as unknown as number) : num,
      },
    }));
  };

  const handleDeleteModel = (model: string) => {
    setPricing((prev) => {
      const next = { ...prev };
      delete next[model];
      return next;
    });
  };

  const handleAddModel = () => {
    const trimmed = newModel.trim();
    if (!trimmed) { setAddError(t('Model name is required.')); return; }
    if (pricing[trimmed]) { setAddError(t('This model already exists.')); return; }
    const inVal = parseFloat(newInput);
    const outVal = parseFloat(newOutput);
    if (isNaN(inVal) || inVal <= 0) { setAddError(t('Input price must be a positive number.')); return; }
    if (isNaN(outVal) || outVal <= 0) { setAddError(t('Output price must be a positive number.')); return; }
    setPricing((prev) => ({
      ...prev,
      [trimmed]: { inputPer1k: inVal, outputPer1k: outVal },
    }));
    setNewModel(''); setNewInput('0.003'); setNewOutput('0.015'); setAddError('');
  };

  const handleSave = () => {
    // Validate all pricing entries before saving
    const errors: string[] = [];
    for (const [model, rates] of Object.entries(pricing)) {
      if (!model.trim()) errors.push(t('Model name cannot be empty.'));
      if (typeof rates.inputPer1k !== 'number' || isNaN(rates.inputPer1k) || rates.inputPer1k <= 0) {
        errors.push(`"${model}": ${t('input price must be a positive number.')}`);
      }
      if (typeof rates.outputPer1k !== 'number' || isNaN(rates.outputPer1k) || rates.outputPer1k <= 0) {
        errors.push(`"${model}": ${t('output price must be a positive number.')}`);
      }
    }
    if (errors.length > 0) {
      setPricingError(errors.join('\n'));
      return;
    }
    setPricingError('');
    const merged = { ...localSettings, pricing };
    mutation.mutate(merged as Record<string, unknown>);
  };

  const formatExampleCost = (entry: PricingEntry) => {
    // Example: 1M input + 500K output tokens
    const cost = (1_000_000 / 1000) * entry.inputPer1k + (500_000 / 1000) * entry.outputPer1k;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <SettingsIcon size={24} /> {t('Settings')}
      </h2>

      {/* ── Server & General Settings ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <SettingsIcon size={16} /> {t('General')}
        </h3>

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

        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Server Port')}</label>
          <input
            type="number"
            value={(localSettings.serverPort as number) || 3199}
            onChange={(e) => handleChange('serverPort', parseInt(e.target.value, 10) || 3199)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Database Path')}</label>
          <input
            type="text"
            value={(localSettings.dbPath as string) || '.vault/devsorcerer.sqlite'}
            onChange={(e) => handleChange('dbPath', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">{t('Embedding Model')}</label>
          <input
            type="text"
            value={(localSettings.embeddingModel as string) || 'Xenova/all-MiniLM-L6-v2'}
            onChange={(e) => handleChange('embeddingModel', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono"
          />
          <p className="text-xs text-gray-600 mt-1">{t('Requires model to be available from HuggingFace Hub.')}</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Dashboard Enabled')}</span>
            <input type="checkbox" checked={(localSettings.dashboardEnabled as boolean) ?? true}
              onChange={(e) => handleChange('dashboardEnabled', e.target.checked)} className="toggle" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Capture Enabled')}</span>
            <input type="checkbox" checked={(localSettings.captureEnabled as boolean) ?? true}
              onChange={(e) => handleChange('captureEnabled', e.target.checked)} className="toggle" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{t('Anonymize Exports by Default')}</span>
            <input type="checkbox" checked={(localSettings.anonymizeExport as boolean) ?? false}
              onChange={(e) => handleChange('anonymizeExport', e.target.checked)} className="toggle" />
          </label>
        </div>
      </div>

      {/* ── Model Pricing Editor ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <DollarSign size={16} /> {t('Model Pricing')}
          </h3>
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors disabled:opacity-50"
            title={t('Reset all pricing to built-in defaults')}
          >
            <RotateCcw size={12} /> {t('Reset to Defaults')}
          </button>
        </div>

        <p className="text-xs text-gray-500">{t('Set per-model API pricing (USD per 1,000 tokens). Used to calculate accurate session costs.')}</p>

        {/* Existing pricing rows */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {Object.entries(pricing).filter(([k]) => k !== 'default').map(([model, rates]) => (
            <div key={model} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2.5 group">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-200 font-mono truncate">{model}</div>
                <div className="text-xs text-gray-500">
                  {t('Example 1M in + 500K out')}: <span className="text-green-400">{formatExampleCost(rates)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{t('In')}:</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={rates.inputPer1k}
                    onChange={(e) => handlePricingChange(model, 'inputPer1k', e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 text-right font-mono"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{t('Out')}:</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={rates.outputPer1k}
                    onChange={(e) => handlePricingChange(model, 'outputPer1k', e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 text-right font-mono"
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">$/1k</span>
                <button
                  onClick={() => handleDeleteModel(model)}
                  className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title={t('Remove model')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {Object.keys(pricing).filter(k => k !== 'default').length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
              {t('No custom pricing configured. Defaults will be used.')}
            </div>
          )}
        </div>

        {/* Default fallback pricing */}
        {pricing.default && (
          <div className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2 border border-dashed border-gray-700">
            <span className="text-xs text-gray-500 font-mono flex-1">default (fallback)</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('In')}: <span className="text-gray-300 font-mono">{pricing.default.inputPer1k}</span></span>
              <span className="text-xs text-gray-500">{t('Out')}: <span className="text-gray-300 font-mono">{pricing.default.outputPer1k}</span></span>
              <span className="text-xs text-gray-500">$/1k</span>
            </div>
          </div>
        )}

        {/* Add new model */}
        <div className="border-t border-gray-800 pt-3 space-y-2">
          <p className="text-xs text-gray-500">{t('Add a new model pricing entry:')}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('Model name (e.g. gpt-4o)')}
              value={newModel}
              onChange={(e) => { setNewModel(e.target.value); setAddError(''); }}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono"
            />
            <input
              type="number" step="0.0001" min="0.0001"
              placeholder="In $/1k"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              className="w-24 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 text-right font-mono"
            />
            <input
              type="number" step="0.0001" min="0.0001"
              placeholder="Out $/1k"
              value={newOutput}
              onChange={(e) => setNewOutput(e.target.value)}
              className="w-24 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 text-right font-mono"
            />
            <button
              onClick={handleAddModel}
              className="flex items-center gap-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm transition-colors"
            >
              <Plus size={16} /> {t('Add')}
            </button>
          </div>
          {addError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} /> {addError}
            </p>
          )}
        </div>
      </div>

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {mutation.isPending ? t('Saving...') : t('Save Settings')}
      </button>

      {savedMsg && <p className="text-sm text-green-400 text-center">{savedMsg}</p>}
      {pricingError && (
        <p className="text-sm text-red-400 text-center whitespace-pre-line flex items-center justify-center gap-1">
          <AlertTriangle size={14} /> {pricingError}
        </p>
      )}
    </div>
  );
}
