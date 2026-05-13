import { JSONRPCParser } from './jsonrpc.js';
import { detectGitContext, buildProjectId, type GitContext } from '../git/detector.js';
import { generateId } from '../shared/utils.js';
import type {
  RawEvent,
  CapturedEvent,
  JSONRPCMessage,
  MessageDirection,
  MessageType,
} from '../shared/types.js';

export interface EnrichmentContext {
  sessionId: string;
  projectRoot: string;
  seqNum: number;
  direction: MessageDirection;
}

let gitCache: GitContext | null = null;

export function getGitContext(projectRoot: string): GitContext | null {
  if (!gitCache) {
    gitCache = detectGitContext(projectRoot);
  }
  return gitCache;
}

export function getProjectId(projectRoot: string): string {
  const git = getGitContext(projectRoot);
  if (git) return buildProjectId(git);
  // Fallback: hash of the path
  let hash = 0;
  for (let i = 0; i < projectRoot.length; i++) {
    hash = (hash << 5) - hash + projectRoot.charCodeAt(i);
    hash |= 0;
  }
  const name = projectRoot.split(/[/\\]/).pop() || 'unknown';
  return `${name}-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

export class EventEnricher {
  private projectRoot: string;
  private projectId: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.projectId = getProjectId(projectRoot);
  }

  enrich(raw: RawEvent, message: JSONRPCMessage): CapturedEvent {
    const toolName = JSONRPCParser.extractToolName(message);
    const isError = JSONRPCParser.isError(message);

    // Estimate tokens from message content
    const paramsText = message.params
      ? JSON.stringify(message.params)
      : '';
    const resultText = message.result
      ? JSON.stringify(message.result)
      : '';
    const errorText = message.error
      ? JSON.stringify(message.error)
      : '';
    const estimatedTokens = this.estimateTokens(
      paramsText + resultText + errorText,
    );

    return {
      id: generateId(),
      sessionId: raw.sessionId,
      seqNum: raw.seqNum,
      timestamp: raw.timestamp,
      direction: raw.direction,
      msgType: raw.msgType,
      method: raw.method,
      params: raw.params,
      result: raw.result,
      error: raw.error,
      requestId: raw.requestId,
      messageSize: raw.messageSize,
      estimatedTokens,
      toolName,
      isError,
      projectId: this.projectId,
    };
  }

  // Simple token estimation using character-based heuristic.
  // This is a fallback; the real implementation uses gpt-tokenizer.
  private estimateTokens(text: string): number {
    if (!text) return 1;
    // Rough heuristic: ~4 characters per token for English text,
    // ~2 characters per token for JSON/code
    return Math.ceil(text.length / 3);
  }
}
