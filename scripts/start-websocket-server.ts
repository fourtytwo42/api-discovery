#!/usr/bin/env tsx
import { WebSocketProxyServer } from '../src/lib/proxy/websocket-server';

const port = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);

const server = new WebSocketProxyServer(port);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing WebSocket server...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing WebSocket server...');
  server.close();
  process.exit(0);
});

