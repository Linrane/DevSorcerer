import type { TimelineStep } from '../../api/client';
import { AlertTriangle, Repeat } from 'lucide-react';
import { useT } from '../../i18n';

interface ErrorLoopHighlightProps {
  steps: TimelineStep[];
}

export function ErrorLoopHighlight({ steps }: ErrorLoopHighlightProps) {
  const { t } = useT();
  // Detect error loops: same tool called >= 3 times with errors in close succession
  const errorSteps = steps.filter((s) => s.isError && s.toolName);
  if (errorSteps.length === 0) return null;

  // Group consecutive errors by tool
  const loops: Array<{ toolName: string; count: number; start: number; end: number }> = [];
  for (let i = 0; i < errorSteps.length; i++) {
    const tool = errorSteps[i]!.toolName!;
    let count = 1;
    let j = i + 1;
    while (j < errorSteps.length && errorSteps[j]!.toolName === tool) {
      count++;
      j++;
    }
    if (count >= 3) {
      loops.push({
        toolName: tool,
        count,
        start: errorSteps[i]!.timestamp,
        end: errorSteps[j - 1]!.timestamp,
      });
    }
    i = j - 1;
  }

  if (loops.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-red-400" />
        <h3 className="text-sm font-medium text-red-300">{t('Error Loops Detected')}</h3>
      </div>
      {loops.map((loop, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between py-2 border-b border-red-500/10 last:border-0"
        >
          <div className="flex items-center gap-2">
            <Repeat size={14} className="text-red-400" />
            <span className="text-sm text-red-300 font-mono">{loop.toolName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-red-400">{loop.count} {t('failed attempts')}</span>
            <span className="text-xs text-red-500">
              {(loop.end - loop.start) > 1000
                ? `${((loop.end - loop.start) / 1000).toFixed(1)}s`
                : `${loop.end - loop.start}ms`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
