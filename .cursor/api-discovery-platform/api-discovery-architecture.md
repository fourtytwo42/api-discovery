# API Discovery Platform - Architecture

**Detailed system architecture for proxy-based API discovery and documentation generation**

## Proxy Server Architecture

### Core Proxy Implementation

**Technology:** Next.js API Routes with `http-proxy-middleware`

**Proxy Route Structure:**
```
/proxy/[...path]/route.ts - Catch-all proxy route
```

**How It Works:**
1. User accesses: `https://api-discovery.dev/proxy/{endpoint-id}/[...path]`
2. Next.js API route extracts endpoint ID from URL path
3. Looks up endpoint in database to get destination URL
4. Creates proxy instance with interception hooks
5. Intercepts request before forwarding (captures request)
6. Forwards request to destination URL
7. Intercepts response after receiving (captures response)
8. Stores captured data to database (async, non-blocking)
9. Returns response to user (transparent proxy)

### Proxy Implementation Details

```typescript
// app/proxy/[endpointId]/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { captureApiCall } from '@/lib/capture';
import { prisma } from '@/lib/database/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { endpointId: string; path: string[] } }
) {
  const { endpointId } = params;
  
  // Look up endpoint to get destination URL
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { destinationUrl: true, status: true },
  });
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  // Check if endpoint is active (proxy only works when ACTIVE)
  if (endpoint.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Endpoint proxy is no longer active' }, { status: 410 });
  }
  
  // Reconstruct target URL with path
  const targetPath = params.path.join('/');
  const targetUrl = `${endpoint.destinationUrl}/${targetPath}${request.nextUrl.search}`;

  // Create proxy middleware with interception
  const proxy = createProxyMiddleware({
    target: endpoint.destinationUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/proxy/${endpointId}`]: '', // Remove proxy prefix, forward path to destination
    },
    onProxyReq: async (proxyReq, req, res) => {
      // Capture request before forwarding
      const requestData = {
        method: req.method || 'GET',
        url: req.url || '',
        headers: req.headers,
        body: await getRequestBody(req),
        timestamp: new Date(),
      };
      
      // Store request ID for matching with response
      (req as any).captureId = await captureRequest(endpointId, requestData);
    },
    onProxyRes: async (proxyRes, req, res) => {
      // Capture response after receiving
      const captureId = (req as any).captureId;
      
      const responseData = {
        status: proxyRes.statusCode || 200,
        headers: proxyRes.headers,
        body: await getResponseBody(proxyRes),
        timestamp: new Date(),
        duration: Date.now() - (req as any).startTime,
      };
      
      await captureResponse(endpointId, captureId, responseData);
    },
    onError: (err, req, res) => {
      // Handle proxy errors
      logger.error('Proxy error', { endpointId, error: err.message });
      // Still capture the error for documentation
      captureError(endpointId, err);
    },
  });

  // Handle the proxy request
  return handleProxy(proxy, request);
}
```

### Request/Response Capture

**Capture Storage:**
- Store immediately on capture (async, non-blocking)
- Use database transactions for consistency
- Handle large payloads (streaming, truncation if needed)
- Filter sensitive data (auth tokens, passwords) optionally

**Capture Data Structure:**
```typescript
interface CapturedRequest {
  sessionId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyJson?: any;
  queryParams?: Record<string, string>;
  timestamp: Date;
}

interface CapturedResponse {
  captureId: string; // Links to request
  status: number;
  headers: Record<string, string>;
  body?: string;
  bodyJson?: any;
  duration: number; // Response time in ms
  timestamp: Date;
}
```

### Endpoint Management

**Endpoint Creation:**
- User creates endpoint via dashboard (provides name and destination URL)
- System generates unique endpoint ID
- Stores endpoint metadata (name, destination URL, user ID, status)
- Returns proxy URL with endpoint ID

**Proxy URL Format:**
```
https://api-discovery.dev/proxy/{endpoint-id}/[...path]
```

**Endpoint States:**
- `ACTIVE`: Endpoint created, proxy URL works, capturing API calls (action sequence being recorded)
- `REVIEW`: User paused capture, reviewing captured data (action sequence recorded)
- `PROCESSING`: User triggered documentation generation, AI processing in progress
- `MONITORING`: Documentation generated, proxy active, monitoring enabled (automated replay active)
- `COMPLETE`: Documentation generated, proxy removed, using stored data only (monitoring disabled)
- `INACTIVE`: User deactivated endpoint (proxy removed)
- `ARCHIVED`: Endpoint archived by user (proxy removed)

**Status Transitions:**
- Create → ACTIVE (proxy URL active, capturing calls, recording action sequence)
- ACTIVE → REVIEW (user pauses capture, optional step)
- ACTIVE/REVIEW → PROCESSING (user triggers documentation generation)
- PROCESSING → MONITORING (user chooses "Keep Monitoring", proxy stays active)
- PROCESSING → COMPLETE (user chooses "Finish", proxy removed)
- MONITORING → COMPLETE (user disables monitoring, proxy removed)
- Any → INACTIVE (user deactivates)
- Any → ARCHIVED (user archives)

## Network Interception Details

### Capturing All Request Types

**HTTP Methods:**
- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- All methods captured and documented

**Request Sources:**
- Initial page load requests
- AJAX/fetch requests
- Form submissions
- Image/asset requests (filtered - only API calls)
- WebSocket connections (captured as upgrade requests)

**Filtering:**
- Capture all requests (no filtering - capture everything)
- Include static assets (images, CSS, JS) - capture all HTTP traffic
- No domain filtering (capture all requests, not just target domain)
- Analysis pipeline identifies API calls vs static assets (programmatic detection)

### Handling Special Cases

**Authentication:**
- Capture auth headers (Bearer tokens, API keys)
- Option to redact sensitive tokens
- Track authentication flow (login endpoints, token refresh)
- Identify auth patterns automatically

**WebSockets:**
- Capture initial upgrade request (HTTP Upgrade to WebSocket)
- No message capture (only capture upgrade request, not ongoing messages)
- Document WebSocket endpoints separately (detect ws:// wss:// URLs)

**File Uploads:**
- Capture multipart/form-data requests
- Store file metadata (name, type, size) - store in requestBody as JSON
- No file content storage (only metadata, not actual file bytes)

**Large Payloads:**
- Stream large request/response bodies
- Truncate if exceeding size limit (configurable)
- Store metadata even if body truncated
- Support for streaming responses

### Real-Time Capture Feed

**WebSocket Updates:**
- Real-time updates to dashboard during recording
- Shows API calls as they happen
- Live statistics (call count, endpoints, errors)
- User can see progress without refreshing

**WebSocket Implementation:**
```typescript
// app/api/ws/recordings/[sessionId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Upgrade to WebSocket
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new NextResponse('Expected WebSocket', { status: 426 });
  }

  // Handle WebSocket connection
  // Broadcast captured API calls to connected clients
}
```

## Programmatic Analysis Pipeline

### Analysis Stages

**Stage 1: Endpoint Pattern Extraction**

**Goal:** Group similar URLs into endpoint patterns

**Algorithm:**
1. Extract all unique URLs from captured calls
2. Identify path parameters (numeric IDs, UUIDs, slugs)
3. Create patterns: `/api/users/123` → `/api/users/:id`
4. Handle query parameters separately
5. Group by pattern and HTTP method

**Example:**
```
Captured URLs:
- /api/users/123
- /api/users/456
- /api/users/789/posts
- /api/posts/abc

Patterns:
- /api/users/:id (GET, PUT, DELETE)
- /api/users/:id/posts (GET)
- /api/posts/:id (GET, PUT, DELETE)
```

**Stage 2: Schema Inference (Programmatic)**

**Goal:** Extract structured schemas from JSON payloads

**Algorithm:**
1. Parse JSON request/response bodies
2. Analyze structure:
   - Identify data types (string, number, boolean, null, array, object)
   - Detect nested structures
   - Identify arrays and their element types
   - Handle optional vs required fields (by presence across calls)
3. Merge schemas across multiple calls (same endpoint)
4. Create JSON Schema representation

**Example:**
```json
// Multiple captured responses for GET /api/users/:id
Response 1: { "id": 123, "name": "John", "email": "john@example.com" }
Response 2: { "id": 456, "name": "Jane", "email": "jane@example.com", "avatar": "https://..." }

Inferred Schema:
{
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "avatar": { "type": "string", "format": "uri" } // optional
  }
}
```

**Stage 3: Pattern Detection**

**Goal:** Identify common API patterns

**Authentication Patterns:**
- Bearer token in Authorization header
- API key in query parameter or header
- Cookie-based authentication
- OAuth flow detection

**Pagination Patterns:**
- Offset-based: `?offset=0&limit=10`
- Cursor-based: `?cursor=abc123`
- Page-based: `?page=1&per_page=10`
- Link headers: `Link: <next-url>`

**Error Response Patterns:**
- Consistent error format across endpoints
- Error codes and messages
- Validation errors structure

**Stage 4: Header Analysis**

**Goal:** Document request/response headers

**Common Headers:**
- Content-Type detection
- Authentication headers
- Custom headers (API-specific)
- Required vs optional headers

**Content-Type Handling:**
- JSON: Parse and analyze
- Form data: Extract fields
- Multipart: Document file uploads
- XML: Basic structure (if needed)

## AI-Powered Enhancement

### When AI is Used

**After Programmatic Analysis:**
- AI receives structured data from programmatic analysis
- Enhances with natural language and deeper insights
- Fills gaps that programmatic analysis can't handle

### AI Input Structure

```typescript
interface AIAnalysisInput {
  endpoint: {
    pattern: string;
    methods: string[];
    capturedCalls: number;
  };
  requestSchemas: JsonSchema[];
  responseSchemas: Map<number, JsonSchema>; // status code -> schema
  exampleRequests: any[];
  exampleResponses: Map<number, any[]>;
  headers: {
    request: Record<string, string[]>;
    response: Record<string, string[]>;
  };
  patterns: {
    authentication?: string;
    pagination?: string;
    errorFormat?: any;
  };
}
```

### AI Tasks

**1. Schema Enhancement**
- Infer field meanings from names and context
- Add descriptions to schema fields
- Identify relationships between fields
- Detect enums (limited value sets)
- Handle union types (same field, different types)

**2. Documentation Generation**
- Write endpoint descriptions
- Document parameters (query, path, body)
- Document response codes and meanings
- Generate request/response examples
- Write authentication documentation
- Document error scenarios

**3. Pattern Recognition**
- Identify RESTful conventions
- Detect GraphQL patterns (if applicable)
- Recognize API versioning
- Identify deprecation patterns
- Suggest best practices

### AI Prompt Structure

**Schema Enhancement Prompt:**
```
You are an API documentation expert. Given the following API endpoint data:

Endpoint: {pattern}
Methods: {methods}
Request Schema: {requestSchema}
Response Schema: {responseSchema}
Example Requests: {examples}
Example Responses: {examples}

Tasks:
1. Enhance the schema with field descriptions
2. Identify field types more precisely (enums, formats, etc.)
3. Detect relationships between fields
4. Infer optional vs required fields

Return enhanced JSON Schema with descriptions.
```

**Documentation Generation Prompt:**
```
You are an API documentation writer. Given the following API endpoint:

{endpoint data with enhanced schemas}

Generate comprehensive API documentation including:
1. Endpoint description (what it does)
2. Parameter documentation (path, query, body)
3. Request example
4. Response documentation (all status codes)
5. Error documentation
6. Authentication requirements
7. Usage examples

Format as Markdown.
```

## Documentation Generation

### OpenAPI 3.1 Specification

**Generation Process:**
1. Take all analyzed endpoints
2. Convert to OpenAPI paths structure
3. Include request/response schemas
4. Add descriptions from AI
5. Include examples
6. Generate full OpenAPI spec

**OpenAPI Structure:**
```yaml
openapi: 3.1.0
info:
  title: API Documentation
  version: 1.0.0
  description: Auto-generated from captured API calls

paths:
  /api/users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: User object
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
              example:
                id: 123
                name: "John Doe"
                email: "john@example.com"
```

### TypeScript Client Generation

**Client Structure:**
```typescript
// Generated TypeScript client
export class ApiClient {
  constructor(private baseUrl: string, private authToken?: string) {}

  async getUser(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });
    return response.json();
  }
  
  // ... other methods
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}
```

**Generation:**
- Generate TypeScript interfaces from schemas
- Generate client methods for each endpoint
- Include TypeScript types for parameters and responses
- Handle authentication automatically
- Include JSDoc comments from documentation

### Markdown Documentation

**Structure:**
- Table of contents
- Authentication section
- Endpoint documentation (grouped by resource)
- Schema reference
- Examples section
- Error reference

**Format:**
```markdown
# API Documentation

## Authentication

Bearer token authentication is used...

## Endpoints

### GET /api/users/{id}

Retrieves a user by ID.

**Parameters:**
- `id` (path, required): User ID

**Response:**
200 OK - User object

**Example Request:**
\`\`\`bash
curl -X GET https://api.example.com/api/users/123 \
  -H "Authorization: Bearer token"
\`\`\`

**Example Response:**
\`\`\`json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`
```

## Interactive Playground

### Playground Features

**Request Builder:**
- Select endpoint from documentation
- Fill in path parameters
- Add query parameters
- Build request body (with schema validation)
- Set headers (including auth)

**Execution:**
- Execute request through proxy (if needed)
- Or directly to target API (if CORS allows)
- Show request/response in real-time
- Display timing information

**Response Viewer:**
- Pretty-printed JSON
- Syntax highlighting
- Schema validation (highlight mismatches)
- Download response

**Test Scenarios:**
- Save request configurations
- Create test suites
- Run multiple requests in sequence
- Export as Postman collection

## Performance Considerations

### Proxy Performance

**Optimization Strategies:**
- Async capture (don't block request forwarding)
- Batch database writes (collect multiple calls, write in batches)
- Connection pooling (reuse database connections)
- Streaming for large payloads
- No caching of proxy responses (always forward requests to target, don't cache)

### Analysis Performance

**Optimization Strategies:**
- Background job processing (don't block user) - Use BullMQ with Redis
- Sequential processing (analyze discovered endpoints one at a time, not parallel)
- Batch analysis (analyze all captured calls when user triggers processing, not incremental)
- Cache discovered endpoint details in Redis (5 minute TTL)
- Rate limiting for AI API calls (100 requests per minute per endpoint to Groq API, 10x for testing, with exponential backoff retry)

### Scalability

**Horizontal Scaling:**
- Stateless proxy (can run multiple instances)
- Shared database (PostgreSQL)
- Queue system for analysis jobs (BullMQ, etc.)
- Load balancer for proxy instances

**Resource Management:**
- Limit payload sizes: 50MB max per request/response (5x increase for testing, truncate if larger, store metadata)
- Data retention: 90 days (auto-delete endpoints and API calls older than 90 days)
- No archiving (delete old data, don't archive to cold storage)
- No compression (store payloads as-is, PostgreSQL handles compression)

## Security Considerations

### Data Privacy

**Sensitive Data Handling:**
- No automatic redaction (users can choose what to capture, but we don't filter)
- No filtering of sensitive fields (store all captured data as-is)
- Encrypt database at rest (PostgreSQL encryption enabled)
- User controls what's captured (they choose what URL to proxy, we capture everything)

**Access Control:**
- User authentication required (JWT tokens)
- Endpoint ownership enforced (users can only access their own endpoints)
- All endpoints are private (no sharing, no team features)
- No team/sharing features (single-user accounts only)

### Proxy Security

**Input Validation:**
- Validate target URLs (prevent SSRF attacks - block private IPs, localhost, internal networks)
- No whitelist (allow any public HTTP/HTTPS URL)
- Rate limiting: 10000 requests/minute per endpoint for proxy (10x for testing), 1000 requests/minute per user for API (10x for testing)
- Request size limits: 50MB max per request/response (5x increase for testing environment)

**Error Handling:**
- Don't leak target server errors to proxy users
- Log errors securely
- Handle timeout gracefully
- Prevent proxy abuse

## Deployment Architecture

### Production Setup

**Components:**
- Next.js app (self-hosted on VM with PM2, not Vercel - PostgreSQL on same VM)
- PostgreSQL database (installed on same VM as Next.js app, not external service)
- Queue system for background jobs (BullMQ with Redis - Redis on same VM)
- Storage for payloads (PostgreSQL JSONB columns, no external storage needed)

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/api_discovery
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_APP_URL=https://api-discovery.dev
JWT_SECRET=...
STRIPE_SECRET_KEY=...
PAYPAL_CLIENT_SECRET=...
MAX_PAYLOAD_SIZE=10485760
```

### Scaling Strategy

**Production Architecture (Single VM):**
- Single Next.js instance (PM2 manages process)
- PostgreSQL on same VM (localhost connection)
- Redis on same VM (localhost connection, for BullMQ)
- Nginx reverse proxy (SSL termination, static files)
- No load balancing (single instance)
- No CDN (Nginx serves static assets)
- No microservices (monolithic Next.js app)
- No read replicas (single PostgreSQL instance)
- No object storage (PostgreSQL JSONB stores payloads)

## Monitoring & Observability

### Key Metrics

**Proxy Metrics:**
- Requests per second
- Average response time
- Error rate
- Active sessions

**Analysis Metrics:**
- Analysis job duration
- Endpoints discovered per session
- AI API usage (tokens, cost)
- Documentation generation time

**Business Metrics:**
- Active users
- Sessions created
- Documentation exports
- Conversion rate (free to paid)

### Logging

**Structured Logging:**
- JSON format
- Include request IDs for tracing
- Log levels (DEBUG, INFO, WARN, ERROR)
- Separate logs for proxy, analysis, API

**What to Log:**
- Proxy requests (method, URL, status, duration)
- Analysis errors
- AI API calls (tokens, cost)
- User actions (session created, documentation exported)

### Alerting

**Critical Alerts:**
- Proxy errors >1% error rate
- Database connection failures
- Analysis jobs failing
- High AI API costs

**Warning Alerts:**
- High response times (>5s)
- Queue backlog (>100 jobs)
- High database load
- Storage usage (>80%)

