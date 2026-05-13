import { StdioMCPTransport, type SpawnTarget } from './transport.js';
import { JSONRPCParser, MessageCorrelator } from './jsonrpc.js';
import { EventEnricher } from './enricher.js';
import { SessionManager } from './session.js';
import { insertEvent } from '../storage/repositories/events.js';
import { getDb } from '../storage/db.js';
import type { JSONRPCMessage, RawEvent } from '../shared/types.js';

export type ProxyEventHandler = (event: string) => void;

export interface ProxyConfig {
  target: SpawnTarget;
  projectRoot: string;
  sessionManager: SessionManager;
  enricher: EventEnricher;
}

// The MCPProxy is a transparent JSON-RPC proxy that sits between
// an AI agent (MCP client) and an actual MCP server.
//
// Flow:
//   Agent stdin  → proxy → MCP server stdin
//   Agent stdout ← proxy ← MCP server stdout
//
// Every message is parsed, logged to SQLite, and forwarded unchanged.

export class MCPProxy {
  private transport: StdioMCPTransport;
  private correlator: MessageCorrelator;
  private sessionManager: SessionManager;
  private enricher: EventEnricher;
  private projectRoot: string;
  private seqNum = 0;
  private eventHandlers: ProxyEventHandler[] = [];
  private isRunning = false;

  constructor(config: ProxyConfig) {
    this.transport = new StdioMCPTransport();
    this.correlator = new MessageCorrelator();
    this.sessionManager = config.sessionManager;
    this.enricher = config.enricher;
    this.projectRoot = config.projectRoot;
  }

  async start(): Promise<void> {
    // Monitor agent's stdin for JSON-RPC messages
    const stdin = process.stdin;
    stdin.setEncoding('utf-8');

    let buffer = '';
    stdin.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        this.handleAgentMessage(line);
      }
    });

    stdin.on('end', () => {
      // Process remaining buffer
      if (buffer.trim()) {
        this.handleAgentMessage(buffer);
      }
    });

    // Set up transport — it forwards to MCP server and captures responses
    this.transport.onMessage((message, raw) => {
      this.handleServerMessage(message, raw);
    });

    this.transport.onClose(async (_code) => {
      await this.sessionManager.endSession('completed');
      this.isRunning = false;
      this.emit('proxy:closed');
    });

    this.transport.onError((err) => {
      this.emit(`proxy:error:${err.message}`);
    });

    this.isRunning = true;
  }

  async startWithTarget(target: SpawnTarget): Promise<void> {
    await this.transport.start(target);
    await this.start();
  }

  async stop(): Promise<void> {
    await this.transport.stop();
    await this.sessionManager.endSession('terminated');
    this.correlator.clear();
    this.isRunning = false;
  }

  onEvent(handler: ProxyEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: string): void {
    for (const h of this.eventHandlers) h(event);
  }

  private handleAgentMessage(line: string): void {
    const parsed = JSONRPCParser.parse(line);
    if (!parsed) return;

    const { message } = parsed;
    const classified = JSONRPCParser.classifyMessage(message);
    const direction = 'client-to-server';

    // Auto-start session on first message if not already started
    if (!this.sessionManager.getActiveSession()) {
      const method = message.method;
      // Try to extract agent info from initialize
      const agentInfo = method === 'initialize'
        ? this.extractAgentInfo(message)
        : undefined;
      this.sessionManager.startSession(agentInfo);
    }

    // Track request for latency calculation
    if (classified.type === 'request') {
      this.correlator.trackRequest(message);
    }

    // Capture event
    this.captureEvent(message, direction);

    // Forward to MCP server
    this.transport.send(message);
  }

  private handleServerMessage(message: JSONRPCMessage, _raw: string): void {
    const direction = 'server-to-client';

    // Resolve request-response pairing for latency
    const classified = JSONRPCParser.classifyMessage(message);
    if (classified.type === 'response') {
      const resolved = this.correlator.resolveResponse(message);
      if (resolved) {
        // Latency is stored when creating the event
        this.captureEvent(message, direction, resolved.latencyMs);
        // Forward unchanged to agent stdout
        process.stdout.write(JSONRPCParser.serialize(message) + '\n');
        return;
      }
    }

    // Capture event
    this.captureEvent(message, direction);

    // Forward unchanged to agent stdout
    process.stdout.write(JSONRPCParser.serialize(message) + '\n');
  }

  private captureEvent(
    message: JSONRPCMessage,
    direction: 'client-to-server' | 'server-to-client',
    latencyMs?: number,
  ): void {
    try {
      const classified = JSONRPCParser.classifyMessage(message);
      const sessionId = this.sessionManager.getSessionId();
      const seqNum = ++this.seqNum;

      const rawEvent: RawEvent = {
        sessionId,
        seqNum,
        timestamp: Date.now(),
        direction,
        msgType: classified.type,
        method: message.method,
        params: message.params,
        result: message.result,
        error: message.error,
        requestId: message.id ? String(message.id) : undefined,
        messageSize: JSON.stringify(message).length,
      };

      const captured = this.enricher.enrich(rawEvent, message);
      if (latencyMs !== undefined) {
        captured.latencyMs = latencyMs;
      }

      insertEvent(captured);
      this.emit(`event:${captured.toolName || captured.method || 'unknown'}`);
    } catch (err) {
      // Never let event capture failure affect the proxy path
      this.emit(`error:capture:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private extractAgentInfo(message: JSONRPCMessage) {
    const params = message.params as Record<string, unknown> | undefined;
    const clientInfo = params?.clientInfo as Record<string, unknown> | undefined;
    return {
      name: (clientInfo?.name as string) || 'unknown-agent',
      version: (clientInfo?.version as string) || undefined,
    };
  }
}
