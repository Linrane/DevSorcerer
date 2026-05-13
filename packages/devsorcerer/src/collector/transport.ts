import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { JSONRPCParser } from './jsonrpc.js';
import type { JSONRPCMessage } from '../shared/types.js';

export type MessageHandler = (message: JSONRPCMessage, raw: string) => void;
export type ErrorHandler = (error: Error) => void;
export type CloseHandler = (code: number | null) => void;

export interface SpawnTarget {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface StdioTransport {
  start(target: SpawnTarget): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: MessageHandler): void;
  onError(handler: ErrorHandler): void;
  onClose(handler: CloseHandler): void;
  send(message: JSONRPCMessage): void;
}

export class StdioMCPTransport implements StdioTransport {
  private process: ChildProcess | null = null;
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private stdin: NodeJS.ReadableStream | null = null;

  async start(target: SpawnTarget): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(target.command, target.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...target.env },
        shell: process.platform === 'win32', // Windows needs shell for npx
      });

      this.process.on('error', (err) => {
        for (const h of this.errorHandlers) h(err);
        reject(err);
      });

      this.process.on('close', (code) => {
        for (const h of this.closeHandlers) h(code);
      });

      // Read MCP server stdout line by line
      if (this.process.stdout) {
        const rl = createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line: string) => {
          const parsed = JSONRPCParser.parse(line);
          if (parsed) {
            for (const h of this.messageHandlers) {
              h(parsed.message, parsed.raw);
            }
          }
        });
      }

      // Forward stderr to our stderr for debugging
      if (this.process.stderr) {
        this.process.stderr.pipe(process.stderr);
      }

      resolve();
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill();
      this.process = null;
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  onClose(handler: CloseHandler): void {
    this.closeHandlers.push(handler);
  }

  send(message: JSONRPCMessage): void {
    if (this.process?.stdin) {
      const line = JSONRPCParser.serialize(message) + '\n';
      this.process.stdin.write(line);
    }
  }
}

// HTTP/SSE transport for connecting to remote MCP servers
export interface HttpTransport {
  start(listenPort: number, upstreamUrl: string): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: MessageHandler): void;
}

export class HttpMCPTransport implements HttpTransport {
  private isRunning = false;
  private upstreamUrl: string = '';
  private messageHandlers: MessageHandler[] = [];
  private running = false;

  async start(listenPort: number, upstreamUrl: string): Promise<void> {
    this.upstreamUrl = upstreamUrl;
    this.running = true;
    // In a real implementation, this would:
    // 1. Start an HTTP server on listenPort
    // 2. Accept POST requests from the agent
    // 3. Forward to upstreamUrl via fetch
    // 4. Support SSE for streaming responses
    // For now, the stdio transport is the primary mode.
    throw new Error(
      'HTTP transport is not yet implemented. Use stdio transport instead.',
    );
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }
}
