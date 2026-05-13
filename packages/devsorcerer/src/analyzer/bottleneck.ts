import { getEventsForAnalysis } from '../storage/repositories/events.js';
import type {
  BottleneckReport,
  ErrorLoop,
  ToolLatency,
  ThinkingStep,
  FeedbackLoop,
  CapturedEvent,
  ErrorLoopPattern,
} from '../shared/types.js';

export class BottleneckAnalyzer {
  analyzeSession(sessionId: string): BottleneckReport {
    const events = getEventsForAnalysis(sessionId);
    if (events.length === 0) {
      return {
        sessionId,
        totalDurationMs: 0,
        slowestTools: [],
        errorLoops: [],
        thinkingChain: [],
        feedbackLoops: [],
      };
    }

    const totalDurationMs =
      events[events.length - 1]!.timestamp - events[0]!.timestamp;

    const errorLoops = this.detectErrorLoops(events);
    const slowTools = this.detectSlowTools(events);
    const thinkingChain = this.reconstructThinkingChain(events);
    const feedbackLoops = this.detectFeedbackLoops(events);

    return {
      sessionId,
      totalDurationMs,
      slowestTools: slowTools,
      errorLoops,
      thinkingChain,
      feedbackLoops,
    };
  }

  private detectErrorLoops(events: CapturedEvent[]): ErrorLoop[] {
    const errorEvents = events.filter((e) => e.isError && e.toolName);
    const loops: ErrorLoop[] = [];
    const windowSize = 10;

    for (let i = 0; i < errorEvents.length; i++) {
      const window = errorEvents.slice(i, i + windowSize);
      const toolCounts = new Map<string, CapturedEvent[]>();

      for (const e of window) {
        const existing = toolCounts.get(e.toolName!) || [];
        existing.push(e);
        toolCounts.set(e.toolName!, existing);
      }

      for (const [toolName, occurrences] of toolCounts) {
        if (occurrences.length >= 3) {
          const pattern = this.classifyErrorPattern(occurrences);
          const errors = occurrences
            .map((e) => e.error?.message || 'Unknown error')
            .filter((m, idx, arr) => arr.indexOf(m) === idx);

          loops.push({
            toolName,
            attempts: occurrences.length,
            errors,
            durationMs:
              occurrences[occurrences.length - 1]!.timestamp -
              occurrences[0]!.timestamp,
            pattern,
          });

          // Skip ahead past this window
          i += occurrences.length;
          break;
        }
      }
    }

    return loops;
  }

  private classifyErrorPattern(
    occurrences: CapturedEvent[],
  ): ErrorLoopPattern {
    // Check if arguments are identical across all attempts
    const args = occurrences.map((e) => JSON.stringify(e.params));
    const uniqueArgs = new Set(args);

    if (uniqueArgs.size === 1) return 'duplicate-params';
    if (uniqueArgs.size === 2) return 'oscillating';
    return 'incremental-fix';
  }

  private detectSlowTools(events: CapturedEvent[]): ToolLatency[] {
    const toolLatencies = new Map<
      string,
      { latencies: number[]; count: number }
    >();

    for (const e of events) {
      if (e.latencyMs !== undefined && e.toolName) {
        const existing = toolLatencies.get(e.toolName) || {
          latencies: [],
          count: 0,
        };
        existing.latencies.push(e.latencyMs);
        existing.count++;
        toolLatencies.set(e.toolName, existing);
      }
    }

    const results: ToolLatency[] = [];
    for (const [toolName, data] of toolLatencies) {
      const sorted = [...data.latencies].sort((a, b) => a - b);
      const avg =
        data.latencies.reduce((s, l) => s + l, 0) / data.latencies.length;
      const p95Idx = Math.ceil(sorted.length * 0.95) - 1;
      const p95 = sorted[p95Idx] || avg;

      results.push({
        toolName,
        avgLatencyMs: Math.round(avg),
        p95LatencyMs: Math.round(p95),
        callCount: data.count,
        isSlow: p95 > 5000, // 5 seconds threshold
      });
    }

    return results.sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);
  }

  private reconstructThinkingChain(events: CapturedEvent[]): ThinkingStep[] {
    const toolEvents = events.filter(
      (e) => e.toolName && (e.msgType === 'request' || e.msgType === 'response'),
    );

    return toolEvents.map((e, idx) => ({
      seq: idx + 1,
      eventId: e.id,
      toolName: e.toolName!,
      timestamp: e.timestamp,
      summary: this.summarizeEvent(e),
      latencyMs: e.latencyMs,
      isError: e.isError,
    }));
  }

  private summarizeEvent(event: CapturedEvent): string {
    if (event.isError) {
      return `ERROR: ${event.error?.message || 'Tool call failed'}`;
    }

    const params = event.params as Record<string, unknown> | undefined;
    const args = params?.arguments as Record<string, unknown> | undefined;

    if (event.toolName === 'read_file' || event.toolName === 'Read') {
      const fp = args?.filePath || args?.path;
      return fp ? `Read: ${fp}` : 'Read file';
    }
    if (
      event.toolName === 'write_file' ||
      event.toolName === 'write_to_file' ||
      event.toolName === 'Write'
    ) {
      const fp = args?.filePath || args?.path;
      return fp ? `Wrote: ${fp}` : 'Wrote file';
    }
    if (event.toolName === 'search_content' || event.toolName === 'Grep') {
      const pattern = args?.pattern || args?.query;
      return pattern ? `Searched: ${pattern}` : 'Searched codebase';
    }
    if (event.toolName === 'execute_command' || event.toolName === 'Bash') {
      const cmd = typeof args?.command === 'string' ? args.command : undefined;
      return cmd ? `Ran: ${cmd.slice(0, 60)}` : 'Ran command';
    }

    return `${event.toolName}: ${event.method || 'called'}`;
  }

  private detectFeedbackLoops(events: CapturedEvent[]): FeedbackLoop[] {
    const toolCalls = events
      .filter((e) => e.toolName && e.msgType === 'request')
      .map((e) => e.toolName!);

    const loops: FeedbackLoop[] = [];
    const minCycleLen = 2;
    const maxCycleLen = 5;

    for (let cycleLen = minCycleLen; cycleLen <= maxCycleLen; cycleLen++) {
      for (let i = 0; i < toolCalls.length - cycleLen * 2; i++) {
        const slice1 = toolCalls.slice(i, i + cycleLen);
        const slice2 = toolCalls.slice(i + cycleLen, i + cycleLen * 2);

        if (slice1.join(',') === slice2.join(',')) {
          loops.push({
            toolNames: [...new Set(slice1)],
            cycleCount: 2,
            durationMs:
              events[Math.min(i + cycleLen * 2, events.length - 1)]!.timestamp -
              events[i]!.timestamp,
          });
          break;
        }
      }
    }

    return loops;
  }
}
