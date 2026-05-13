import type { TimelineStep } from '../../api/client';
import { AlertCircle, Clock, Wrench } from 'lucide-react';

interface ToolCallCardProps {
  step: TimelineStep;
}

export function ToolCallCard({ step }: ToolCallCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        step.isError
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
      }`}
    >
      <div className={`p-1.5 rounded ${step.isError ? 'bg-red-500/10 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
        <Wrench size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{step.toolName}</span>
          {step.isError && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> Error
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{step.summary}</p>
      </div>
      <div className="text-right">
        {step.latencyMs && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={10} />
            {step.latencyMs > 1000
              ? `${(step.latencyMs / 1000).toFixed(1)}s`
              : `${step.latencyMs}ms`}
          </span>
        )}
      </div>
    </div>
  );
}
