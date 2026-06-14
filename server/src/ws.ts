import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

const clients = new Set<WebSocket>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function registerWebSocket(app: FastifyInstance): void {
  app.get('/api/ws', { websocket: true }, (socket, _req) => {
    clients.add(socket);

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });

  // Heartbeat every 30s to keep connections alive
  heartbeatTimer = setInterval(() => {
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.ping();
      }
    }
  }, 30000);

  // Cleanup on app close
  app.addHook('onClose', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    for (const client of clients) {
      client.close();
    }
    clients.clear();
  });
}

export function broadcast(event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}
