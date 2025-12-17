import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse } from 'url';
import { prisma } from '@/lib/database/prisma';
import { validateProxyUrl } from '@/lib/proxy/validation';

interface WebSocketProxyConnection {
  ws: WebSocket;
  endpointId: string;
  targetUrl: string;
  targetWs: WebSocket | null;
}

export class WebSocketProxyServer {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketProxyConnection> = new Map();

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port, path: '/ws-proxy' });
    this.setupHandlers();
    console.log(`WebSocket proxy server listening on port ${port}`);
  }

  private setupHandlers() {
    this.wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      try {
        const url = parse(request.url || '', true);
        const endpointId = url.query.endpointId as string;
        const path = url.pathname?.replace('/ws-proxy', '') || '';

        if (!endpointId) {
          ws.close(1008, 'Missing endpointId');
          return;
        }

        // Get endpoint
        const endpoint = await prisma.endpoint.findUnique({
          where: { id: endpointId },
        });

        if (!endpoint) {
          ws.close(1008, 'Endpoint not found');
          return;
        }

        if (endpoint.status !== 'ACTIVE') {
          ws.close(1008, 'Endpoint is not active');
          return;
        }

        // Validate destination URL
        const urlValidation = validateProxyUrl(endpoint.destinationUrl);
        if (!urlValidation.valid) {
          ws.close(1008, urlValidation.error || 'Invalid destination URL');
          return;
        }

        // Build target WebSocket URL
        const destinationUrl = new URL(endpoint.destinationUrl);
        const wsProtocol = destinationUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const targetWsUrl = `${wsProtocol}//${destinationUrl.host}${path}${url.search || ''}`;

        // Create connection to target WebSocket
        const targetWs = new WebSocket(targetWsUrl);

        const connectionId = `${endpointId}-${Date.now()}`;
        const connection: WebSocketProxyConnection = {
          ws,
          endpointId,
          targetUrl: targetWsUrl,
          targetWs,
        };

        this.connections.set(connectionId, connection);

        // Forward messages from client to target
        ws.on('message', (data: Buffer) => {
          if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data);
          }
        });

        // Forward messages from target to client
        targetWs.on('message', (data: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // Handle target connection open
        targetWs.on('open', () => {
          console.log(`WebSocket proxy connected: ${endpointId} -> ${targetWsUrl}`);
        });

        // Handle errors
        targetWs.on('error', (error) => {
          console.error(`WebSocket proxy error for ${endpointId}:`, error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1011, 'Target connection error');
          }
        });

        ws.on('error', (error) => {
          console.error(`Client WebSocket error for ${endpointId}:`, error);
        });

        // Handle close
        const cleanup = () => {
          this.connections.delete(connectionId);
          if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
            targetWs.close();
          }
        };

        ws.on('close', cleanup);
        targetWs.on('close', () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          cleanup();
        });
      } catch (error) {
        console.error('WebSocket proxy connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  public close() {
    // Close all connections
    this.connections.forEach((conn) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
      if (conn.targetWs && (conn.targetWs.readyState === WebSocket.OPEN || conn.targetWs.readyState === WebSocket.CONNECTING)) {
        conn.targetWs.close();
      }
    });
    this.connections.clear();
    this.wss.close();
  }
}

