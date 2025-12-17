# API Discovery Platform - API Specifications

**Complete API documentation for all endpoints, request/response formats, authentication, and error handling.**

## Base URL

**Development:** `http://localhost:3000/api/v1`  
**Production:** `https://api-discovery.dev/api/v1` (or your domain)

**Note:** All endpoints use `/api/v1/` prefix for versioning.

## Authentication

**Method:** JWT tokens

**Header Format:** `Authorization: Bearer <token>`

**Token Generation:** Issued after successful login/registration

**Token Expiration:** 3 days (259,200 seconds)

**Token Structure:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string; // "USER" or "ADMIN" or "DEMO"
  iat: number; // Issued at
  exp: number; // Expiration (3 days from issuance)
}
```

**Token Storage:** HTTP-only cookie named `auth_token` (same-site, secure in production)

**Demo Accounts:**
- Pre-created demo accounts available
- Login page shows demo users (click to auto-fill credentials)
- Demo accounts have sample data for exploration

## Error Responses

All endpoints may return these standard error responses:

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "field": "Error message for field"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found"
}
```

**429 Too Many Requests:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "retryAfter": 60
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

**Public Endpoints (auth, 10x for testing):**
- 100 requests per minute per IP address (10x increase for testing environment)

**Authenticated Endpoints (10x for testing):**
- 1000 requests per minute per user (10x increase for testing environment)

**Proxy Endpoints (10x for testing):**
- 10000 requests per minute per endpoint (10x increase for testing environment)

**Admin Endpoints (10x for testing):**
- 2000 requests per minute per admin user (10x increase for testing environment)

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### Authentication

#### `POST /api/v1/auth/register`

**Purpose:** Register a new user account

**Authentication:** None (public endpoint)

**Rate Limit:** 100 requests per minute per IP (10x for testing)

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "USER"
  }
}
```

**Error Responses:**
- `400` - Validation error (email format, password requirements, username format)
- `409` - Email or username already exists
- `500` - Internal server error

---

#### `POST /api/v1/auth/login`

**Purpose:** Login with email/username and password

**Authentication:** None (public endpoint)

**Rate Limit:** 100 requests per minute per IP (10x for testing)

**Request:**
```json
{
  "email": "user@example.com", // or "username": "johndoe"
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "USER",
    "isDemo": false
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials
- `403` - Account disabled
- `429` - Too many login attempts
- `500` - Internal server error

---

#### `GET /api/v1/auth/demo-users`

**Purpose:** Get list of demo users (for login page)

**Authentication:** None (public endpoint)

**Rate Limit:** 100 requests per minute per IP (10x for testing)

**Response (200):**
```json
{
  "demoUsers": [
    {
      "id": "demo-1",
      "email": "demo1@example.com",
      "username": "demo1",
      "description": "Demo account with sample API data"
    },
    {
      "id": "demo-2",
      "email": "demo2@example.com",
      "username": "demo2",
      "description": "Demo account with sample API data"
    }
  ]
}
```

---

#### `POST /api/v1/auth/logout`

**Purpose:** Logout user (invalidate token)

**Authentication:** Required

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### `GET /api/v1/auth/me`

**Purpose:** Get current user information

**Authentication:** Required

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "USER",
    "isDemo": false,
    "enabled": true,
    "createdAt": "2025-12-16T10:00:00Z",
    "lastLogin": "2025-12-16T12:00:00Z"
  }
}
```

---

### Endpoints (User Proxy Endpoints)

#### `POST /api/v1/endpoints`

**Purpose:** Create a new proxy endpoint (costs 25 credits)

**Authentication:** Required

**Rate Limit:** 100 requests per minute per user (10x for testing)

**Request:**
```json
{
  "name": "My API Test" // Optional user-provided name, defaults to destination URL hostname if not provided
  "destinationUrl": "https://myapp.com"
}
```

**Response (201):**
```json
{
  "endpoint": {
    "id": "endpoint-123",
    "name": "My API Test",
    "destinationUrl": "https://myapp.com",
    "proxyUrl": "/proxy/endpoint-123",
    "status": "ACTIVE",
    "creditsUsed": 25,
    "createdAt": "2025-12-16T12:00:00Z"
  },
  "creditsRemaining": 75
}
```

**Error Responses:**
- `400` - Invalid URL format
- `400` - URL validation failed (SSRF prevention)
- `402` - Insufficient credits (Payment Required)
- `401` - Not authenticated
- `500` - Internal server error

**Validation:**
- URL must be valid HTTP/HTTPS URL
- Domain must not be in blocked list (localhost, private IPs, etc.)
- SSRF prevention: blocks private IP ranges
- Credits checked: User must have at least 25 credits

**Behavior:**
- Creates endpoint
- Deducts 25 credits from user balance
- Creates credit transaction record
- Logs audit entry

---

#### `GET /api/v1/endpoints`

**Purpose:** List user's endpoints

**Authentication:** Required

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Query Parameters:**
- `status` (optional) - Filter by status: `ACTIVE`, `INACTIVE`, `ARCHIVED`
- `limit` (optional) - Number of results (default: 20, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "endpoints": [
    {
      "id": "endpoint-123",
      "name": "My API Test",
      "destinationUrl": "https://myapp.com",
      "proxyUrl": "/proxy/endpoint-123",
      "status": "ACTIVE",
      "createdAt": "2025-12-16T12:00:00Z",
      "lastUsedAt": "2025-12-16T12:15:00Z",
      "stats": {
        "apiCallsCaptured": 47,
        "discoveredEndpoints": 12
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### `GET /api/v1/endpoints/:id`

**Purpose:** Get endpoint details

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "endpoint": {
    "id": "endpoint-123",
    "name": "My API Test",
    "destinationUrl": "https://myapp.com",
    "proxyUrl": "/proxy/endpoint-123",
    "status": "ACTIVE",
    "createdAt": "2025-12-16T12:00:00Z",
    "lastUsedAt": "2025-12-16T12:15:00Z",
    "stats": {
      "apiCallsCaptured": 47,
      "discoveredEndpoints": 12,
      "uniqueMethods": ["GET", "POST", "PUT", "DELETE"],
      "apiTypes": ["REST", "WebSocket"]
    }
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `500` - Internal server error

---

#### `GET /api/v1/endpoints/:id/api-calls`

**Purpose:** Get captured API calls for an endpoint

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

---

---

#### `GET /api/v1/endpoints/:id/discovered-endpoints`

**Purpose:** Get discovered endpoints for an endpoint

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50, max: 200)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "discoveredEndpoints": [
    {
      "id": "discovered-123",
      "pattern": "/api/users/:id",
      "methods": ["GET", "PUT", "DELETE"],
      "protocol": "https",
      "apiType": "REST",
      "description": "This endpoint retrieves user information by ID",
      "authRequired": true,
      "authType": "Bearer",
      "corsConfig": {
        "allowedOrigins": ["*"],
        "allowedMethods": ["GET", "PUT", "DELETE"],
        "allowedHeaders": ["Authorization", "Content-Type"]
      },
      "createdAt": "2025-12-16T12:16:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `500` - Internal server error

---

#### `POST /api/v1/endpoints/:id/review`

**Purpose:** Get API data preview (before processing)

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "summary": {
    "totalApiCalls": 47,
    "uniqueEndpoints": 12,
    "dateRange": {
      "start": "2025-12-16T10:00:00Z",
      "end": "2025-12-16T12:00:00Z"
    }
  },
  "endpoints": [
    {
      "pattern": "/api/users/:id",
      "methods": ["GET", "PUT", "DELETE"],
      "callCount": 15
    }
  ],
  "sampleCalls": [
    {
      "method": "GET",
      "url": "/api/users/123",
      "status": 200,
      "timestamp": "2025-12-16T10:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `409` - Endpoint already processed
- `500` - Internal server error

---

#### `POST /api/v1/endpoints/:id/process`

**Purpose:** Trigger AI documentation generation (removes proxy, uses stored data only)

**Authentication:** Required (must own endpoint)

**Rate Limit:** 50 requests per minute per user (10x for testing)

**Request:**
```json
{
  "confirm": true // Must be true to proceed
}
```

**Response (202):**
```json
{
  "message": "Documentation generation started",
  "endpointId": "endpoint-123",
  "status": "PROCESSING"
}
```

**Error Responses:**
- `400` - Confirmation required
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `409` - Endpoint already processed or no API calls captured
- `500` - Internal server error

**Behavior:**
- Validates endpoint has captured API calls
- Sets endpoint status to PROCESSING
- Removes proxy capability (proxy URL no longer works)
- Starts background job to:
  1. Analyze captured API calls (programmatic extraction)
  2. Generate AI descriptions (Groq GPT OSS 20B)
  3. Create discovered endpoints
  4. Generate documentation (Markdown per endpoint)
  5. Set endpoint status to COMPLETE
- Logs audit entry

---

#### `GET /api/v1/endpoints/:id/discovered-endpoints/:discoveredId`

**Purpose:** Get detailed information about a specific discovered endpoint

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "discoveredEndpoint": {
    "id": "discovered-123",
    "pattern": "/api/users/:id",
    "methods": ["GET", "PUT", "DELETE"],
    "protocol": "https",
    "apiType": "REST",
    "description": "This endpoint retrieves user information by ID",
    "requestSchema": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "The user ID in the URL path" }
      }
    },
    "responseSchemas": {
      "200": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string", "description": "The user's full name" },
          "email": { "type": "string", "description": "The user's email address" }
        }
      },
      "404": {
        "type": "object",
        "properties": {
          "error": { "type": "string" }
        }
      }
    },
    "requestHeaders": {
      "Authorization": { "required": true, "description": "Bearer token for authentication" }
    },
    "examples": {
      "request": {
        "url": "/api/users/123",
        "method": "GET",
        "headers": { "Authorization": "Bearer token123" }
      },
      "response": {
        "status": 200,
        "body": { "id": "123", "name": "John Doe", "email": "john@example.com" }
      }
    },
    "authRequired": true,
    "authType": "Bearer",
    "corsConfig": {
      "allowedOrigins": ["*"],
      "allowedMethods": ["GET", "PUT", "DELETE"],
      "allowedHeaders": ["Authorization", "Content-Type"]
    },
    "createdAt": "2025-12-16T12:16:00Z"
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Discovered endpoint not found
- `500` - Internal server error

---

#### `DELETE /api/v1/endpoints/:id`

**Purpose:** Delete endpoint and all associated data

**Authentication:** Required (must own endpoint)

**Rate Limit:** 100 requests per minute per user (10x for testing)

**Response (200):**
```json
{
  "message": "Endpoint deleted successfully"
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `500` - Internal server error

**Behavior:**
- Deletes endpoint and all related data (API calls, discovered endpoints, documentation)
- Cascade deletes handled by database
- Permanent deletion (cannot be undone)

---

### API Calls (Captured)


**Query Parameters:**
- `method` (optional) - Filter by HTTP method: `GET`, `POST`, etc.
- `endpoint` (optional) - Filter by endpoint pattern
- `status` (optional) - Filter by response status code
- `limit` (optional) - Number of results (default: 50, max: 200)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "apiCalls": [
    {
      "id": "call-123",
      "method": "GET",
      "url": "https://myapp.com/api/users/123",
      "endpointPattern": "/api/users/:id",
      "requestHeaders": {
        "authorization": "Bearer token123",
        "content-type": "application/json"
      },
      "requestBody": null,
      "responseStatus": 200,
      "responseHeaders": {
        "content-type": "application/json"
      },
      "responseBody": "{\"id\":123,\"name\":\"John\"}",
      "timestamp": "2025-12-16T12:00:30Z",
      "duration": 45
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized
- `404` - Session not found
- `500` - Internal server error

---

### Endpoints (Discovered)


**Query Parameters:**
- `method` (optional) - Filter by HTTP method
- `limit` (optional) - Number of results (default: 50, max: 200)
- `offset` (optional) - Pagination offset

**Response (200):**
```json
{
  "endpoints": [
    {
      "id": "endpoint-123",
      "pattern": "/api/users/:id",
      "methods": ["GET", "PUT", "DELETE"],
      "description": "User resource endpoint - retrieve, update, or delete a user by ID",
      "requestSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" }
        }
      },
      "responseSchemas": {
        "200": {
          "type": "object",
          "properties": {
            "id": { "type": "integer" },
            "name": { "type": "string" },
            "email": { "type": "string" }
          }
        },
        "404": {
          "type": "object",
          "properties": {
            "error": { "type": "string" }
          }
        }
      },
      "authRequired": true,
      "authType": "Bearer",
      "examples": {
        "request": {
          "method": "GET",
          "url": "/api/users/123",
          "headers": {
            "authorization": "Bearer token"
          }
        },
        "response": {
          "status": 200,
          "body": {
            "id": 123,
            "name": "John",
            "email": "john@example.com"
          }
        }
      },
      "createdAt": "2025-12-16T12:15:00Z",
      "updatedAt": "2025-12-16T12:15:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `404` - Session not found
- `409` - Analysis not complete yet (status not COMPLETE)
- `500` - Internal server error

**Note:** Endpoints are only available after analysis is complete (`status: COMPLETE`).

---


**Response (200):**
```json
{
  "endpoint": {
    "id": "endpoint-123",
    "pattern": "/api/users/:id",
    "methods": ["GET", "PUT", "DELETE"],
    "description": "User resource endpoint...",
    "requestSchema": { /* ... */ },
    "responseSchemas": { /* ... */ },
    "authRequired": true,
    "authType": "Bearer",
    "paginationType": null,
    "examples": { /* ... */ },
    "createdAt": "2025-12-16T12:15:00Z",
    "updatedAt": "2025-12-16T12:15:00Z"
  }
}
```

**Error Responses:**
- `404` - Endpoint not found
- `500` - Internal server error

---

### Documentation

#### `GET /api/v1/endpoints/:id/documentation`

**Purpose:** Get generated documentation for an endpoint (ZIP of MD files)

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="endpoint-123-docs.zip"`
- Body: ZIP file containing Markdown files (one per discovered endpoint)

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `409` - Documentation not yet generated
- `500` - Internal server error

---

#### `GET /api/v1/endpoints/:id/export/csv`

**Purpose:** Export endpoint results as CSV

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="endpoint-123-export.csv"`
- Body: CSV file with all API calls

**CSV Format:**
```csv
timestamp,method,url,endpoint_pattern,status_code,duration_ms
2025-12-16T12:00:00Z,GET,https://myapp.com/api/users/123,/api/users/:id,200,45
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `500` - Internal server error

---

#### `GET /api/v1/endpoints/:id/export/printable`

**Purpose:** Get printable view of endpoint results

**Authentication:** Required (must own endpoint)

**Rate Limit:** 1000 requests per minute per user (10x for testing)

**Response (200):**
- HTML page optimized for printing
- Shows all discovered endpoints with documentation
- Print-friendly CSS

**Error Responses:**
- `401` - Not authenticated
- `403` - Not authorized (not endpoint owner)
- `404` - Endpoint not found
- `500` - Internal server error

**Query Parameters:**
- `format` (optional) - Format: `openapi`, `markdown`, `typescript`, `postman` (default: returns all formats)

**Response (200):**
```json
{
  "documentation": {
    "id": "doc-123",
    "sessionId": "session-123",
    "openApiSpec": "openapi: 3.1.0\ninfo:\n  title: API Documentation\n...",
    "markdown": "# API Documentation\n\n## Endpoints\n...",
    "typescriptClient": "export class ApiClient {\n  async getUser(id: number): Promise<User> {\n...",
    "postmanCollection": "{\"info\":{\"name\":\"API Collection\"},...}",
    "generatedAt": "2025-12-16T12:20:00Z",
    "version": "1.0.0"
  }
}
```

**Error Responses:**
- `404` - Session or documentation not found
- `409` - Documentation not yet generated (analysis incomplete)
- `500` - Internal server error

**Note:** Documentation is only available after analysis is complete. Access via public URL: `/d/{session-id}`

---


**Query Parameters:**
- `format` (required) - Format: `openapi`, `markdown`, `typescript`, `postman`

**Response (200):**
- Content-Type depends on format:
  - `openapi`: `application/yaml` or `application/json`
  - `markdown`: `text/markdown`
  - `typescript`: `text/typescript`
  - `postman`: `application/json`
- Content-Disposition header with filename

**Example Response Headers:**
```
Content-Type: application/yaml
Content-Disposition: attachment; filename="api-documentation.yaml"
```

**Error Responses:**
- `400` - Invalid format
- `404` - Session or documentation not found
- `409` - Documentation not yet generated
- `500` - Internal server error

---

### WebSocket (Real-Time Updates)

#### `GET /api/v1/ws/endpoints/:id`

**Purpose:** WebSocket connection for real-time endpoint updates (enabled by default)

**Authentication:** Required (must own endpoint)

**Connection:**
```
wss://api-discovery.dev/api/v1/ws/endpoints/:id?token=<jwt-token>
```

**Message Types (Server → Client):**

**`api_call_captured`:**
```json
{
  "type": "api_call_captured",
  "data": {
    "id": "call-123",
    "method": "GET",
    "url": "https://myapp.com/api/users/123",
    "responseStatus": 200,
    "timestamp": "2025-12-16T12:00:30Z"
  }
}
```

**`session_stats_updated`:**
```json
{
  "type": "session_stats_updated",
  "data": {
    "apiCallsCaptured": 47,
    "endpointsDiscovered": 12,
    "uniqueMethods": ["GET", "POST"]
  }
}
```

**`session_status_changed`:**
```json
{
  "type": "session_status_changed",
  "data": {
    "status": "ANALYZING",
    "message": "Analysis in progress..."
  }
}
```

**`analysis_complete`:**
```json
{
  "type": "analysis_complete",
  "data": {
    "sessionId": "session-123",
    "endpointsCount": 12,
    "documentationGenerated": true
  }
}
```

**Client → Server Messages:**

**`ping`:**
```json
{
  "type": "ping"
}
```

**Server Response:**
```json
{
  "type": "pong",
  "timestamp": "2025-12-16T12:00:00Z"
}
```

---

### Proxy Endpoint

#### `GET /proxy/:endpointId/[...path]`

**Purpose:** Proxy endpoint that captures API calls (routes to destination URL)

**Authentication:** None (public, but only endpoint owner can view results)

**URL Structure:**
- `/proxy/{endpoint-id}` - Routes to destination URL root
- `/proxy/{endpoint-id}/api/users` - Routes to `/api/users` on destination
- All paths under `/proxy/{endpoint-id}/` are proxied to destination

**Behavior:**
- Looks up endpoint ID to get destination URL
- Proxies request to destination URL
- Captures request/response data
- Stores captured calls in database (linked to endpoint)
- Returns response to client (transparent proxy)
- Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Supports WebSocket upgrades (ws://, wss://)
- Updates endpoint `lastUsedAt` timestamp

**Note:** 
- This endpoint doesn't return JSON - it returns the proxied response from destination
- Anyone can use the proxy URL, but only endpoint owner can view results
- Authorization is enforced when viewing results, not when using proxy

---


---

## Request/Response Format

**Content-Type:**
- Request: `application/json`
- Response: `application/json` (unless download endpoint)

**Encoding:**
- UTF-8

**Date Format:**
- ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2025-12-16T12:00:00Z`

## Pagination

**Standard Pagination:**
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)

**Response Format:**
```json
{
  "items": [/* ... */],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Validation

**Request Validation:**
- All request bodies validated with Zod schemas
- Invalid requests return `400` with validation errors

**URL Validation:**
- Target URLs validated for format and security (SSRF prevention)
- Invalid URLs return `400` with error message
- Blocks private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Blocks localhost/127.0.0.1

**Endpoint Ownership:**
- Users can only access their own endpoints
- Authorization checks verify endpoint ownership
- Only endpoint owner can view results and export data
- Proxy URLs are public (anyone can use), but results are private

## CORS

**API Endpoints:**
- CORS enabled for configured origins
- Credentials: `true` (for cookies)

**Proxy Endpoint:**
- CORS headers forwarded from destination application
- Additional CORS headers added to ensure proxy works

