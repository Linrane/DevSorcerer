import type { TimelineStep } from '../../api/client';
import { Wrench, AlertCircle, ChevronRight } from 'lucide-react';

interface TimelineViewProps {
  steps: TimelineStep[];
}

export function TimelineView({ steps }: TimelineViewProps) {
  const visible = steps.filter((s) => s.toolName).slice(-30);

  return (
    <div className="space-y-0">
      {visible.map((step, idx) => {
        const time = new Date(step.timestamp).toLocaleTimeString();
        return (
          <div
            key={step.id}
            className={`flex items-start gap-3 py-2 px-2 hover:bg-gray-800/50 rounded transition-colors ${
              step.isError ? 'bg-red-500/5' : ''
            }`}
          >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${
                  step.isError ? 'bg-red-400 timeline-highlight' : 'bg-gray-600'
                }`}
              />
              {idx < visible.length - 1 && (
                <div className="w-px h-full bg-gray-800 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">{time}</span>
                <Wrench size={12} className="text-gray-600" />
                <span className="text-xs font-medium text-gray-300">{step.toolName}</span>
                {step.isError && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle size={12} /> Error
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5 truncate">{step.summary}</p>
            </div>

            {/* Latency */}
            {step.latencyMs ? (
              <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
                {step.latencyMs > 1000
                  ? `${(step.latencyMs / 1000).toFixed(1)}s`
                  : `${step.latencyMs}ms`}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
