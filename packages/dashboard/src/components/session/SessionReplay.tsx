import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Wrench, AlertTriangle, Clock, FileText } from 'lucide-react';
import type { TimelineStep } from '../../api/client';
import { useT } from '../../i18n';

interface SessionReplayProps {
  steps: TimelineStep[];
}

export function SessionReplay({ steps }: SessionReplayProps) {
  const { t } = useT();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepCount = steps.length;
  const currentStep = steps[currentIndex];

  const goToStep = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, stepCount - 1)));
  }, [stepCount]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || stepCount === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const delay = 1000 / speed;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= stepCount - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, stepCount]);

  // Stop at end
  useEffect(() => {
    if (currentIndex >= stepCount - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, stepCount]);

  if (stepCount === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <FileText size={32} className="mx-auto mb-2 text-gray-700" />
        <p className="text-sm">{t('No timeline data available.')}</p>
      </div>
    );
  }

  const errorCount = steps.filter((s) => s.isError).length;
  const totalLatency = steps.reduce((sum, s) => sum + (s.latencyMs || 0), 0);

  return (
    <div className="space-y-4">
      {/* Player controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        {/* Progress bar */}
        <div className="relative h-2 bg-gray-800 rounded-full mb-3 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${stepCount > 1 ? (currentIndex / (stepCount - 1)) * 100 : 100}%` }}
          />
          {/* Error markers */}
          {steps.map((s, i) =>
            s.isError ? (
              <div
                key={i}
                className="absolute top-0 w-1 h-full bg-red-500"
                style={{ left: `${(i / Math.max(stepCount - 1, 1)) * 100}%` }}
                title={`Error at step ${i + 1}`}
              />
            ) : null,
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToStep(0)}
              disabled={currentIndex === 0}
              className="p-1.5 text-gray-400 hover:text-gray-200 disabled:text-gray-700"
              title={t('Start')}
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white"
              title={isPlaying ? t('Pause') : t('Play')}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button
              onClick={() => goToStep(stepCount - 1)}
              disabled={currentIndex >= stepCount - 1}
              className="p-1.5 text-gray-400 hover:text-gray-200 disabled:text-gray-700"
              title={t('End')}
            >
              <SkipForward size={16} />
            </button>
            <span className="text-sm text-gray-500 ml-2">
              {t('Step')} {currentIndex + 1} / {stepCount}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed control */}
            <div className="flex items-center gap-1">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    speed === s
                      ? 'bg-purple-600/20 text-purple-300'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-400" />
            {errorCount} {t('errors')}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {(totalLatency / 1000).toFixed(1)}s {t('total latency')}
          </span>
        </div>
      </div>

      {/* Current step display */}
      {currentStep && (
        <div className={`bg-gray-900 rounded-xl border p-4 ${
          currentStep.isError ? 'border-red-500/30 bg-red-500/5' : 'border-gray-800'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              currentStep.isError ? 'bg-red-500/10' : 'bg-gray-800'
            }`}>
              <Wrench
                size={18}
                className={currentStep.isError ? 'text-red-400' : 'text-purple-400'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-200">
                  {currentStep.toolName || currentStep.direction}
                </span>
                {currentStep.isError && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                    {t('Error')}
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {new Date(currentStep.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {currentStep.summary && (
                <p className="text-sm text-gray-400 mt-1">{currentStep.summary}</p>
              )}
              {currentStep.latencyMs && (
                <p className="text-xs text-gray-600 mt-1">
                  {t('Latency')}: {currentStep.latencyMs > 1000
                    ? `${(currentStep.latencyMs / 1000).toFixed(1)}s`
                    : `${currentStep.latencyMs}ms`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress slider */}
      <input
        type="range"
        min={0}
        max={Math.max(stepCount - 1, 0)}
        value={currentIndex}
        onChange={(e) => goToStep(parseInt(e.target.value, 10))}
        className="w-full h-1 appearance-none bg-gray-800 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
      />
    </div>
  );
}
