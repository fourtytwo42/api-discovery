# WebSocket Proxy Setup

## Overview

The WebSocket proxy allows proxied websites to use WebSocket connections. Since Next.js API routes don't support WebSocket upgrades, we run a separate WebSocket server.

## Architecture

1. **WebSocket Proxy Server** (`src/lib/proxy/websocket-server.ts`)
   - Runs on port 3001 (configurable via `WEBSOCKET_PORT`)
   - Handles WebSocket upgrade requests
   - Proxies WebSocket connections to destination servers

2. **JavaScript Interceptor** (injected into proxied HTML)
   - Intercepts `new WebSocket()` calls
   - Rewrites WebSocket URLs to use the proxy server

3. **PM2 Configuration**
   - Runs both Next.js app and WebSocket server
   - Managed together for easy deployment

## Setup

### 1. Install Dependencies

```bash
npm install ws @types/ws
```

### 2. Start WebSocket Server

**Development:**
```bash
npm run ws:server
```

**Production (with PM2):**
```bash
pm2 start ecosystem.config.js
```

This will start both:
- `api-discovery` - Next.js app (port 3000)
- `api-discovery-ws` - WebSocket server (port 3001)

### 3. Configuration

Set environment variable if you want a different port:
```bash
export WEBSOCKET_PORT=3001
```

## How It Works

1. When a proxied page tries to create a WebSocket connection:
   ```javascript
   const ws = new WebSocket('wss://example.com/ws');
   ```

2. The JavaScript interceptor rewrites it to:
   ```javascript
   const ws = new WebSocket('ws://your-proxy:3001/ws-proxy/ws?endpointId=xxx');
   ```

3. The WebSocket proxy server:
   - Extracts `endpointId` from query params
   - Looks up the destination URL from database
   - Creates a WebSocket connection to the destination
   - Proxies messages bidirectionally

## Alternative Approaches

### Option 1: Separate WebSocket Server (Current Implementation)
✅ **Pros:**
- Clean separation of concerns
- Easy to scale independently
- Works with Next.js without modifications

❌ **Cons:**
- Requires managing two processes
- Additional port to expose

### Option 2: Custom Next.js Server
✅ **Pros:**
- Single process
- Can handle HTTP and WebSocket in one server

❌ **Cons:**
- Requires custom server.js (loses some Next.js optimizations)
- More complex setup

### Option 3: Reverse Proxy (nginx/traefik)
✅ **Pros:**
- Can handle WebSocket upgrades at proxy level
- Industry standard approach
- Better for production

❌ **Cons:**
- Requires additional infrastructure
- More complex configuration

## Production Recommendations

For production, consider:

1. **Use a reverse proxy** (nginx/traefik) that handles WebSocket upgrades
2. **Run WebSocket server on same port** using path-based routing:
   - `/` → Next.js app
   - `/ws-proxy` → WebSocket server
3. **Use a load balancer** that supports WebSocket sticky sessions

## Troubleshooting

### WebSocket connections fail
- Check WebSocket server is running: `pm2 list`
- Check port 3001 is accessible
- Check browser console for connection errors
- Verify endpoint is ACTIVE in database

### Messages not proxying
- Check WebSocket proxy server logs: `pm2 logs api-discovery-ws`
- Verify destination WebSocket URL is correct
- Check network tab for WebSocket frames

