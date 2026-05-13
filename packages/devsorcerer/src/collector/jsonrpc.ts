import type { JSONRPCMessage, JSONRPCError, MessageType, MessageDirection } from '../shared/types.js';

export interface ParsedMessage {
  message: JSONRPCMessage;
  raw: string;
}

export class JSONRPCParser {
  static parse(line: string): ParsedMessage | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
      const message = JSON.parse(trimmed) as JSONRPCMessage;
      if (!JSONRPCParser.validate(message)) return null;
      return { message, raw: trimmed };
    } catch {
      return null;
    }
  }

  static serialize(message: JSONRPCMessage): string {
    return JSON.stringify(message);
  }

  static validate(message: unknown): message is JSONRPCMessage {
    if (typeof message !== 'object' || message === null) return false;
    const m = message as Record<string, unknown>;
    if (m.jsonrpc !== '2.0') return false;
    return true;
  }

  static classifyMessage(message: JSONRPCMessage): {
    type: MessageType;
    isNotification: boolean;
  } {
    if (message.id === undefined) {
      return { type: 'notification', isNotification: true };
    }
    if (message.method !== undefined) {
      return { type: 'request', isNotification: false };
    }
    return { type: 'response', isNotification: false };
  }

  static extractToolName(message: JSONRPCMessage): string | undefined {
    if (message.method === 'tools/call') {
      const params = message.params as Record<string, unknown> | undefined;
      if (params?.name && typeof params.name === 'string') {
        return params.name;
      }
    }
    return undefined;
  }

  static isError(message: JSONRPCMessage): boolean {
    return message.error !== undefined;
  }

  static extractErrorMessage(err: JSONRPCError): string {
    return `[${err.code}] ${err.message}`;
  }
}

// Pairs requests with responses to calculate latency
export class MessageCorrelator {
  private pending = new Map<
    string | number,
    { request: JSONRPCMessage; timestamp: number }
  >();

  trackRequest(msg: JSONRPCMessage): void {
    if (msg.id !== undefined) {
      this.pending.set(msg.id, { request: msg, timestamp: Date.now() });
    }
  }

  resolveResponse(
    msg: JSONRPCMessage,
  ): { request: JSONRPCMessage; latencyMs: number } | null {
    if (msg.id === undefined) return null;
    const pending = this.pending.get(msg.id);
    if (!pending) return null;
    this.pending.delete(msg.id);
    return {
      request: pending.request,
      latencyMs: Date.now() - pending.timestamp,
    };
  }

  clear(): void {
    this.pending.clear();
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}
