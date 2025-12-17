# API Discovery Platform - Database Schema

**Complete database schema with Prisma models, relationships, indexes, and validation rules.**

## Database Setup

**Database:** PostgreSQL 16.x

**ORM:** Prisma 7.x

**Connection:** Connection string in `DATABASE_URL` environment variable

**Migrations:** Prisma migrations (`npx prisma migrate dev`)

**Extensions:**
- pgvector (for future semantic search if needed)

## Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Users & Authentication
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String?   @unique
  passwordHash  String
  role          String    @default("USER") // "USER", "ADMIN", "DEMO"
  isDemo        Boolean   @default(false) // True for demo accounts
  credits       Int       @default(100) // Current credit balance (100 free credits on signup)
  subscriptionTier String? @default("FREE") // "FREE", "PRO", "TEAM", null for credit-only users
  subscriptionId String? // External subscription ID (Stripe/PayPal subscription ID)
  subscriptionStatus String? // "active", "canceled", "past_due", etc.
  enabled       Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLogin     DateTime?

  // Relations
  endpoints     Endpoint[]
  creditTransactions CreditTransaction[]
  payments      Payment[]
  auditLogs     AuditLog[]
  
  @@index([email])
  @@index([username])
  @@index([isDemo])
  @@index([credits])
  @@index([subscriptionTier])
  @@index([subscriptionId])
  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================
// User Endpoints (Proxy Endpoints)
// ============================================

model Endpoint {
  id            String   @id @default(cuid())
  userId        String
  name          String?  // Optional user-provided name
  slug          String?  // URL-friendly slug for public documentation
  destinationUrl String  // Destination URL to proxy to
  proxyUrl      String   // Generated proxy URL: /proxy/{endpoint-id}
  status        EndpointStatus @default(ACTIVE)
  creditsUsed   Int      @default(25) // Credits used to create this endpoint (default: 25, free if within free tier)
  isPublic      Boolean  @default(false) // Whether documentation is publicly shareable
  monitoringEnabled Boolean @default(false) // Whether automated monitoring/replay is enabled
  monitoringFrequency String? // "daily", "weekly", "monthly" - frequency of automated replay
  lastReplayAt  DateTime? // Last time action sequence was replayed
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastUsedAt    DateTime?
  processedAt   DateTime? // When documentation was generated

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiCalls      ApiCall[]
  discoveredEndpoints DiscoveredEndpoint[]
  endpointDocs  EndpointDocumentation[]
  creditTransactions CreditTransaction[] @relation("EndpointCreditTransaction")
  actionSequence ActionSequence? // Recorded action sequence for replay
  apiChanges    ApiChange[] // Change history from monitoring

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@index([proxyUrl])
  @@index([isPublic])
  @@index([slug])
  @@map("endpoints")
}

enum EndpointStatus {
  ACTIVE      // Endpoint is active and can proxy traffic (capturing API calls)
  REVIEW      // User paused capture, reviewing captured data
  PROCESSING  // User triggered documentation generation (processing)
  MONITORING  // Documentation generated, proxy active, monitoring for changes (automated replay)
  COMPLETE    // Documentation generated, proxy removed, using stored data only
  INACTIVE    // User deactivated endpoint
  ARCHIVED    // Endpoint archived by user
}


// ============================================
// API Call Capture
// ============================================

model ApiCall {
  id              String   @id @default(cuid())
  endpointId      String
  method          String   // GET, POST, PUT, DELETE, PATCH, OPTIONS, etc.
  url             String   // Full URL
  protocol        String   @default("http") // http, https, ws, wss, graphql
  endpointPattern String?  // Normalized pattern like /api/users/:id (set during analysis)
  requestHeaders  Json     // Request headers as JSON object
  requestBody     String?  // Raw request body (truncated if large)
  requestBodyJson Json?    // Parsed JSON if applicable
  queryParams     Json?    // Extracted query parameters as JSON object
  responseStatus  Int?     // Null for WebSockets
  responseHeaders Json     // Response headers as JSON object (includes CORS headers)
  responseBody    String?  // Raw response body (truncated if large)
  responseBodyJson Json?   // Parsed JSON if applicable
  corsHeaders     Json?    // Extracted CORS headers (Access-Control-*)
  timestamp       DateTime @default(now())
  duration        Int?     // Response time in milliseconds

  // Relations
  endpoint        Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, timestamp])
  @@index([endpointPattern, method])
  @@index([method])
  @@index([protocol])
  @@map("api_calls")
}

// ============================================
// Discovered API Endpoints (Analysis Results)
// ============================================

model DiscoveredEndpoint {
  id              String   @id @default(cuid())
  endpointId      String   // User's endpoint (proxy endpoint)
  pattern         String   // Normalized pattern like /api/users/:id
  methods         String[] // ["GET", "POST"] - array of HTTP methods
  protocol        String   @default("http") // http, https, ws, wss, graphql
  description     String?  // AI-generated description
  requestSchema   Json?    // Inferred JSON Schema for request body
  responseSchemas Json?    // Map of status code -> JSON Schema (e.g., { "200": {...}, "404": {...} })
  requestHeaders  Json?    // Common request headers schema
  responseHeaders Json?    // Common response headers schema
  corsConfig      Json?    // CORS configuration (Access-Control-* headers detected)
  examples        Json?    // Request/response examples from captured calls
  authRequired    Boolean  @default(false)
  authType        String?  // "Bearer", "API-Key", "Cookie", etc.
  paginationType  String?  // "offset", "cursor", "page", null
  apiType         String?  // "REST", "GraphQL", "WebSocket", "gRPC", etc.
  graphqlSchema   String?  // GraphQL schema if GraphQL endpoint detected
  websocketMessages Json?  // WebSocket message formats if WebSocket detected
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  endpoint        Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@unique([endpointId, pattern, protocol])
  @@index([endpointId])
  @@index([apiType])
  @@map("discovered_endpoints")
}

// ============================================
// Documentation
// ============================================

model EndpointDocumentation {
  id              String   @id @default(cuid())
  endpointId      String
  discoveredEndpointId String // Which discovered endpoint this doc is for
  openApiSpec     String?  // OpenAPI 3.1 YAML/JSON (if REST APIs detected)
  graphqlSchema   String?  // GraphQL schema (if GraphQL detected)
  markdown        String   // Markdown documentation with AI descriptions
  typescriptTypes String?  // Generated TypeScript type definitions
  generatedAt     DateTime @default(now())
  version         String   @default("1.0.0")

  // Relations
  endpoint        Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@unique([endpointId, discoveredEndpointId])
  @@index([endpointId])
  @@map("endpoint_documentation")
}

// ============================================
// Credits & Payments
// ============================================

model CreditTransaction {
  id            String   @id @default(cuid())
  userId        String
  amount        Int      // Positive for credit additions, negative for deductions
  balanceAfter  Int      // User's credit balance after this transaction
  type          CreditTransactionType
  description   String?  // Human-readable description
  endpointId    String?  // If transaction is for endpoint creation
  paymentId     String?  // If transaction is from payment
  createdAt     DateTime @default(now())

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  payment       Payment? @relation("PaymentCreditTransaction", fields: [paymentId], references: [id])
  endpoint      Endpoint? @relation("EndpointCreditTransaction", fields: [endpointId], references: [id])

  @@index([userId, createdAt])
  @@index([type])
  @@index([paymentId])
  @@index([endpointId])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  PURCHASE      // Credits purchased via payment
  ENDPOINT      // Credits deducted for endpoint creation
  ADMIN_ADJUST  // Admin manually adjusted credits
  REFUND        // Credits refunded
}

model Payment {
  id              String   @id @default(cuid())
  userId          String
  amount          Decimal  @db.Decimal(10, 2) // Payment amount in dollars
  credits         Int      // Credits purchased
  currency        String   @default("USD")
  status          PaymentStatus @default(PENDING)
  provider        PaymentProvider
  providerPaymentId String? // External payment provider ID (Stripe payment intent ID, PayPal order ID)
  providerData    Json?    // Additional provider-specific data
  sandbox         Boolean  @default(true) // Whether payment was made in sandbox mode
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  failedAt        DateTime?

  // Relations
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditTransaction CreditTransaction? @relation("PaymentCreditTransaction")

  @@index([userId, createdAt])
  @@index([status])
  @@index([providerPaymentId])
  @@index([provider])
  @@map("payments")
}

enum PaymentStatus {
  PENDING     // Payment initiated, waiting for completion
  COMPLETED   // Payment completed successfully
  FAILED      // Payment failed
  REFUNDED    // Payment was refunded
}

enum PaymentProvider {
  STRIPE      // Stripe payment
  PAYPAL      // PayPal payment
}

// ============================================
// Action Sequence Recording (for Automated Replay)
// ============================================

model ActionSequence {
  id              String   @id @default(cuid())
  endpointId      String   @unique // One action sequence per endpoint
  sequence        Json     // Array of API call templates with order, method, URL, headers, body, delays
  authTokens      Json?    // Stored auth tokens/sessions (encrypted) for replay
  baselineSnapshots Json?  // Baseline responses from initial capture for comparison
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  endpoint        Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId])
  @@map("action_sequences")
}

// ============================================
// API Change Tracking (from Monitoring)
// ============================================

model ApiChange {
  id                  String   @id @default(cuid())
  endpointId          String
  discoveredEndpointId String? // If change is to a specific discovered endpoint
  changeType          ApiChangeType
  changeDescription   String   // Human-readable description of the change
  beforeSnapshot      Json?    // Schema/response before change
  afterSnapshot       Json?    // Schema/response after change
  diff                Json?    // Structured diff of the change
  detectedAt          DateTime @default(now())
  notifiedAt          DateTime? // When user was notified

  // Relations
  endpoint            Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, detectedAt])
  @@index([changeType, detectedAt])
  @@index([detectedAt])
  @@map("api_changes")
}

enum ApiChangeType {
  NEW_ENDPOINT        // New endpoint discovered
  REMOVED_ENDPOINT    // Previously working endpoint now returns error
  SCHEMA_CHANGED      // Request/response schema modified
  RESPONSE_CHANGED    // Same endpoint returns different data structure
  AUTH_CHANGED        // Authentication requirements modified
  METHOD_ADDED        // New HTTP method added to endpoint
  METHOD_REMOVED      // HTTP method removed from endpoint
}

// ============================================
// Audit Logging
// ============================================

model AuditLog {
  id            String   @id @default(cuid())
  userId        String?  // Null for system actions
  userEmail     String?  // Denormalized for easier querying (even if user deleted)
  action        String   // Action type: "USER_LOGIN", "ENDPOINT_CREATED", "CREDIT_PURCHASED", etc.
  resourceType  String?  // Resource type: "USER", "ENDPOINT", "PAYMENT", etc.
  resourceId    String?  // Resource ID if applicable
  details       Json?    // Additional action-specific details
  ipAddress     String?  // IP address of request
  userAgent     String?  // User agent string
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}

```

## Schema Relationships

### User → Endpoint
- One-to-many: User can have multiple endpoints
- Cascade delete: Deleting user deletes all their endpoints

### User → CreditTransaction
- One-to-many: User can have multiple credit transactions
- Cascade delete: Deleting user deletes all their credit transactions

### User → Payment
- One-to-many: User can have multiple payments
- Cascade delete: Deleting user deletes all their payments

### User → AuditLog
- One-to-many: User can have multiple audit log entries
- Optional: Nullable userId for system actions

### Payment → CreditTransaction
- One-to-one: Each payment can create one credit transaction
- Optional: Payment may not have credit transaction if failed

### Endpoint → CreditTransaction
- One-to-many: Endpoint can have credit transactions (for creation)
- Optional: Nullable endpointId in CreditTransaction

### Endpoint → ApiCall
- One-to-many: Each endpoint has multiple captured API calls
- Cascade delete: Deleting endpoint deletes all its API calls

### Endpoint → DiscoveredEndpoint
- One-to-many: Each endpoint can discover multiple API endpoints
- Cascade delete: Deleting endpoint deletes all discovered endpoints

### Endpoint → EndpointDocumentation
- One-to-many: Each endpoint has documentation for each discovered endpoint
- Cascade delete: Deleting endpoint deletes all its documentation

### Endpoint → ActionSequence
- One-to-one: Each endpoint can have one action sequence for replay
- Cascade delete: Deleting endpoint deletes its action sequence

### Endpoint → ApiChange
- One-to-many: Each endpoint can have multiple API change records
- Cascade delete: Deleting endpoint deletes all its change history
- Cascade delete: Deleting endpoint deletes all its documentation

### RecordingSession → ApiCall
- One-to-many: Session contains many captured API calls
- Cascade delete: Deleting session deletes all captured calls

### RecordingSession → Endpoint
- One-to-many: Session has multiple discovered endpoints
- Cascade delete: Deleting session deletes all endpoints

### RecordingSession → Documentation
- One-to-one: Each session has one documentation (generated after analysis)
- Cascade delete: Deleting session deletes documentation


## Indexes

**Performance Indexes:**
- `users.email` - Fast user lookup
- `users.username` - Fast user lookup
- `users.isDemo` - Fast demo user queries
- `users.credits` - Fast queries by credit balance
- `endpoints.userId` - Fast endpoint queries by user
- `endpoints.status` - Fast queries by endpoint status
- `endpoints.proxyUrl` - Fast lookup by proxy URL
- `api_calls.endpointId, timestamp` - Fast querying of calls by endpoint, ordered by time
- `api_calls.endpointPattern, method` - Fast endpoint pattern queries
- `api_calls.protocol` - Fast queries by protocol type (REST, WebSocket, GraphQL)
- `discovered_endpoints.endpointId` - Fast discovered endpoint queries
- `discovered_endpoints.apiType` - Fast queries by API type
- `credit_transactions.userId, createdAt` - Fast transaction queries by user, ordered by time
- `credit_transactions.type` - Fast queries by transaction type
- `credit_transactions.paymentId` - Fast lookup of transactions by payment
- `payments.userId, createdAt` - Fast payment queries by user, ordered by time
- `payments.status` - Fast queries by payment status
- `payments.providerPaymentId` - Fast lookup by provider payment ID
- `payments.provider` - Fast queries by payment provider
- `audit_logs.userId, createdAt` - Fast audit log queries by user, ordered by time
- `audit_logs.action, createdAt` - Fast audit log queries by action
- `audit_logs.resourceType, resourceId` - Fast audit log queries by resource
- `audit_logs.createdAt` - Fast time-based audit log queries
- `endpoints.isPublic` - Fast queries for public documentation
- `endpoints.slug` - Fast lookup by public documentation slug
- `endpoint_documentation.isPublic` - Fast queries for public documentation
- `action_sequences.endpointId` - Fast lookup of action sequences
- `api_changes.endpointId, detectedAt` - Fast queries of API changes by endpoint, ordered by time
- `api_changes.changeType, detectedAt` - Fast queries by change type
- `users.subscriptionTier` - Fast queries by subscription tier
- `users.subscriptionId` - Fast lookup by subscription ID

**Constraint Indexes:**
- Unique constraints automatically create indexes
- `users.email` unique
- `users.username` unique
- `endpoints.id` unique (primary key, used as URL identifier)
- `discovered_endpoints.endpointId, pattern, protocol` unique
- `payments.providerPaymentId` unique (within provider context)
- `action_sequences.endpointId` unique (one sequence per endpoint)
- `endpoint_documentation.endpointId, discoveredEndpointId` unique

## Data Types

**String IDs:**
- Use `cuid()` for all IDs (Prisma default)
- CUIDs are URL-safe, sortable, collision-resistant

**JSON Fields:**
- `Json` type for flexible schema (request/response bodies, headers)
- Use JSONB in PostgreSQL (default with Prisma)
- Query JSONB fields efficiently with Prisma

**Arrays:**
- `String[]` for methods array (PostgreSQL array type)
- Efficient storage and querying

**Timestamps:**
- `DateTime` for all timestamps
- `@default(now())` for creation timestamps
- `@updatedAt` for automatic update tracking

## Validation Rules

**Application-Level (Prisma doesn't enforce these, do in application code):**

1. **Email Format:**
   - Valid email format (use Zod validation)
   - Unique constraint enforced by database

2. **Username:**
   - 3-30 characters
   - Alphanumeric + underscore/hyphen
   - Unique constraint enforced by database

3. **Password:**
   - Minimum 8 characters
   - Hashed with bcrypt before storage

4. **URL Validation:**
   - Valid URL format for `targetUrl`
   - Must start with http:// or https://
   - Domain validation (prevent SSRF attacks)

5. **Endpoint Status:**
   - Only valid enum values
   - Status transitions validated

4. **HTTP Methods:**
   - Only valid HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, CONNECT, TRACE)

5. **Status Codes:**
   - Valid HTTP status codes (100-599) or null for WebSockets

6. **Protocol Types:**
   - Valid protocols: http, https, ws, wss, graphql, grpc

7. **API Types:**
   - Valid types: REST, GraphQL, WebSocket, gRPC, SOAP

## Migrations

**Initial Migration:**
```bash
npx prisma migrate dev --name init
```

**Create Migration:**
```bash
npx prisma migrate dev --name migration_name
```

**Apply Migrations:**
```bash
npx prisma migrate deploy
```

**Reset Database (Development Only):**
```bash
npx prisma migrate reset
```

## Seed Data

**Seed Script Location:** `prisma/seed.ts`

**Seed Data:**

Demo accounts created via seed script with sample data.

**Seed Script:** `prisma/seed.ts`

**Complete Seed Script:**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo users
  const demoUsers = [
    {
      email: 'demo1@example.com',
      username: 'demo1',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
    {
      email: 'demo2@example.com',
      username: 'demo2',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
    {
      email: 'demo3@example.com',
      username: 'demo3',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
  ];

  for (const userData of demoUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        role: userData.role,
        isDemo: userData.isDemo,
        credits: 100, // Free credits on signup (same as regular users)
      },
    });

    // Create sample endpoint for demo user
    const endpoint = await prisma.endpoint.create({
      data: {
        userId: user.id,
        name: `Sample API Test - ${userData.username}`,
        destinationUrl: 'https://jsonplaceholder.typicode.com',
        status: 'ACTIVE',
      },
    });

    // Create sample API calls
    await prisma.apiCall.createMany({
      data: [
        {
          endpointId: endpoint.id,
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          protocol: 'https',
          requestHeaders: { 'content-type': 'application/json' },
          responseStatus: 200,
          responseHeaders: { 'content-type': 'application/json' },
          responseBody: JSON.stringify({ id: 1, title: 'Sample Post' }),
          responseBodyJson: { id: 1, title: 'Sample Post' },
          duration: 45,
        },
      ],
    });
  }

  console.log('Demo accounts seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Seed Command:**
```bash
npm run seed
# or
npx prisma db seed
# or
npx tsx prisma/seed.ts
```

**Note:** Ensure `package.json` has seed script configured:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run Seed:**
```bash
npm run seed
# or
npx tsx prisma/seed.ts
```

## Environment Variables

**Required:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/api_discovery?schema=public"
```

**Optional:**
```env
# For database connection pooling
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
```

## Database Connection

**Connection Pooling:**
- Prisma Client automatically handles connection pooling
- Default pool size: Number of CPU cores × 2 + 1
- Can configure via connection string or environment variables

**Production Considerations:**
- Use connection pooling in production
- Monitor connection usage
- Set appropriate pool limits based on load

## Data Retention

**Cleanup Strategy:**
- Optional: Configurable retention period (default: 90 days)
- Endpoints older than retention period automatically deleted
- Configurable via environment variable: `DATA_RETENTION_DAYS=90`

**Cleanup Job:**
- Run daily via cron job or background worker
- Delete old endpoints and related data (cascade deletes handle relationships)
- Optional: Archive old data before deletion
- Demo accounts and their data are excluded from cleanup

## Backup Strategy

**Recommendations:**
- Daily backups for production
- Retain backups for 30 days
- Test restore procedures regularly (monthly)

## Data Retention Policy

**Fixed Policy:**
- **Retention Period:** 90 days
- **Auto-Delete:** Endpoints and all related data (API calls, discovered endpoints, documentation) older than 90 days are automatically deleted
- **Cleanup Job:** Daily cron job runs at 2 AM UTC to delete old data
- **User Credits:** Never expire (no retention on credits)
- **Audit Logs:** Retain for 1 year (separate from endpoint retention)
- **Payments:** Retain indefinitely (financial records)

**Implementation:**
```sql
-- Daily cleanup job (runs at 2 AM UTC)
DELETE FROM endpoints 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Cascade deletes handle: api_calls, discovered_endpoints, endpoint_documentation
```

**No Archiving:**
- Old data is deleted, not archived to cold storage
- Users can export data before retention period expires
- Store backups in separate location

**Backup Command (PostgreSQL):**
```bash
pg_dump -U user -d api_discovery -F c -f backup.dump
```

**Restore Command:**
```bash
pg_restore -U user -d api_discovery backup.dump
```

