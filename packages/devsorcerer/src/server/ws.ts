import type { FastifyInstance } from 'fastify';
import { WEBSOCKET_PATH } from '../shared/constants.js';

interface WSClient {
  send(data: string): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  readyState: number;
  OPEN: number;
}

const clients = new Set<WSClient>();

export function registerWebSocket(app: FastifyInstance): void {
  app.get(WEBSOCKET_PATH, { websocket: true }, (socket, _req) => {
    clients.add(socket as unknown as WSClient);
    console.log(`WebSocket client connected (total: ${clients.size})`);

    socket.send(
      JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'Connected to DevSorcerer live event stream',
      }),
    );

    socket.on('close', () => {
      clients.delete(socket as unknown as WSClient);
      console.log(`WebSocket client disconnected (total: ${clients.size})`);
    });

    socket.on('error', (err: Error) => {
      console.error('WebSocket error:', err.message);
      clients.delete(socket as unknown as WSClient);
    });
  });
}

export function broadcastEvent(event: {
  type: string;
  sessionId?: string;
  toolName?: string;
  timestamp?: number;
  data?: unknown;
}): void {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || Date.now(),
  });

  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
