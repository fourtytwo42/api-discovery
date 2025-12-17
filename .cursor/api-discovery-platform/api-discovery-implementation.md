# API Discovery Platform - Implementation Guide

**Complete setup instructions, development workflow, coding patterns, and deployment guide.**

**Note:** Platform requires authentication - users create accounts or use demo accounts. Credit system enabled - users purchase credits to create endpoints (25 credits per URL, 100 credits for $20).

## Prerequisites

**Required Software:**
- Node.js 20.x LTS (https://nodejs.org/)
- PostgreSQL 16.x (https://www.postgresql.org/)
- Git (https://git-scm.com/)

**Optional:**
- pnpm 9.x (faster than npm, but npm works too)
- Docker (for local PostgreSQL if preferred)
- Groq API key (required for documentation descriptions - see below)

## Project Setup

### Initial Setup

**1. Clone Repository:**
```bash
git clone https://github.com/fourtytwo42/api-discovery-platform.git
cd api-discovery-platform
```

**2. Install Dependencies:**
```bash
npm install
# or
pnpm install
```

**3. Environment Configuration:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**4. Database Setup:**
```bash
# Create database
createdb api_discovery

# Run migrations
npx prisma migrate dev

# Seed demo accounts
npm run seed
# or
npx prisma db seed
```

**5. Start Development Server:**
```bash
npm run dev
```

Application will be available at `http://localhost:3000`

## Environment Variables

**Required Variables:**
```env
# Database (PostgreSQL on VM)
DATABASE_URL="postgresql://user:password@localhost:5432/api_discovery?schema=public"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# JWT Authentication
JWT_SECRET="generate-with-openssl-rand-hex-32"
JWT_EXPIRES_IN="3d"

# Payment Providers (configurable by admin)
STRIPE_PUBLIC_KEY="pk_test_xxx" # Admin configurable
STRIPE_SECRET_KEY="sk_test_xxx" # Admin configurable (stored encrypted)
STRIPE_WEBHOOK_SECRET="whsec_xxx" # Stripe webhook secret
PAYPAL_CLIENT_ID="xxx" # Admin configurable
PAYPAL_CLIENT_SECRET="xxx" # Admin configurable (stored encrypted)
PAYPAL_WEBHOOK_ID="xxx" # PayPal webhook ID
PAYMENT_SANDBOX_MODE="true" # Admin configurable (default: true)

# Background Jobs (BullMQ with Redis)
REDIS_URL="redis://localhost:6379" # Redis connection URL for job queue

# Monitoring & Health Checks
HEALTH_CHECK_ENABLED="true" # Enable health check endpoint
LOG_LEVEL="info" # Log level: error, warn, info, debug

# Credit System
FREE_CREDITS_ON_SIGNUP=100  # Free credits for new users (4 free endpoints)
CREDITS_PER_URL=25  # Credits deducted per endpoint creation (free if within free tier limit)
CREDITS_PER_PURCHASE=100  # Credits per one-time purchase
PRICE_PER_PURCHASE=20.00  # Price per 100-credit pack

# Groq API (required for documentation descriptions)
GROQ_API_KEY="gsk_..." # Required for generating natural language descriptions
```

**Optional Variables:**
```env
# Rate Limiting (enabled by default, 10x limits for testing environment)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PROXY_REQUESTS_PER_MINUTE=10000
RATE_LIMIT_API_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE=100
RATE_LIMIT_ADMIN_REQUESTS_PER_MINUTE=2000

# Proxy Configuration (increased for testing environment)
PROXY_MAX_PAYLOAD_SIZE=52428800 # 50MB in bytes (5x increase for testing large responses)
PROXY_TIMEOUT=60000 # 60 seconds in milliseconds (2x increase for slower APIs during testing)

# Groq AI Configuration (required for documentation descriptions)
GROQ_MODEL="openai/gpt-oss-20b" # Exact model identifier
GROQ_MAX_TOKENS=2000
GROQ_TEMPERATURE=0.3
GROQ_RATE_LIMIT_PER_MINUTE=100 # Rate limit for AI API calls (10x for testing, with exponential backoff retry)

# Data Retention (days, fixed at 90 days)
DATA_RETENTION_DAYS=90 # Fixed retention period, auto-delete older data

# Security
ALLOWED_PROXY_DOMAINS="" # Not used - all public HTTP/HTTPS URLs allowed
BLOCKED_PROXY_DOMAINS="localhost,127.0.0.1,0.0.0.0,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16" # SSRF prevention - block private IPs
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

**Generate Groq API Key:**
1. Sign up at https://console.groq.com/
2. Create API key
3. Store in `GROQ_API_KEY` environment variable (required for documentation descriptions)

**Note:** API details gathering is 100% programmatic. AI is only used for generating natural language descriptions in documentation.

## Project Structure

```
api-discovery-platform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login page with demo user selector
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # Dashboard pages (protected)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # User dashboard
│   │   │   ├── endpoints/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Endpoint details and results
│   │   │   │   │   └── export/
│   │   │   │   │       └── page.tsx  # Export page (CSV, printable, ZIP)
│   │   │   │   └── page.tsx          # Endpoints list
│   │   │   └── layout.tsx            # Dashboard layout with theme toggle
│   │   ├── proxy/                    # Proxy endpoint (public)
│   │   │   └── [endpointId]/
│   │   │       └── [...path]/
│   │   │           └── route.ts      # Proxy route handler
│   │   └── api/                      # API routes
│   │       ├── v1/
│   │       │   ├── auth/
│   │       │   │   ├── register/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── login/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── logout/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── me/
│   │       │   │   │   └── route.ts
│   │       │   │   └── demo-users/
│   │       │   │       └── route.ts
│   │       │   ├── endpoints/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts
│   │       │   │       ├── api-calls/
│   │       │   │       │   └── route.ts
│   │       │   │       ├── review/
│   │       │   │       │   └── route.ts
│   │       │   │       ├── process/
│   │       │   │       │   └── route.ts
│   │       │   │       ├── discovered-endpoints/
│   │       │   │       │   ├── route.ts
│   │       │   │       │   └── [discoveredId]/
│   │       │   │       │       └── route.ts
│   │       │   │       ├── documentation/
│   │       │   │       │   └── route.ts
│   │       │   │       └── export/
│   │       │   │           ├── csv/
│   │       │   │           │   └── route.ts
│   │       │   │           ├── printable/
│   │       │   │           │   └── route.ts
│   │       │   │           └── zip/
│   │       │   │               └── route.ts
│   │       │   └── ws/
│   │       │       └── endpoints/
│   │       │           └── [id]/
│   │       │               └── route.ts  # WebSocket endpoint for real-time updates
│   │   ├── api/                      # API routes
│   │   │   ├── v1/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── register/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── logout/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── stop/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       ├── api-calls/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       ├── endpoints/
│   │   │   │   │       │   └── route.ts
│   │   │   │   │       └── documentation/
│   │   │   │   │           └── route.ts
│   │   │   │   └── proxy/
│   │   │   │       └── [...path]/
│   │   │   │           └── route.ts
│   │   │   └── ws/
│   │   │       └── sessions/
│   │   │           └── [id]/
│   │   │               └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                   # React components
│   │   ├── ui/                       # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── theme-toggle.tsx      # Dark/light mode toggle
│   │   │   └── ...
│   │   ├── auth/                     # Auth components
│   │   │   ├── LoginForm.tsx         # Login form with demo user selector
│   │   │   ├── RegisterForm.tsx
│   │   │   └── DemoUserSelector.tsx  # Demo user click-to-fill component
│   │   ├── endpoints/                # Endpoint components
│   │   │   ├── EndpointList.tsx
│   │   │   ├── EndpointCard.tsx
│   │   │   ├── EndpointDetails.tsx
│   │   │   ├── ResultsViewer.tsx
│   │   │   └── ExportButton.tsx      # Export dropdown (CSV, printable, ZIP)
│   │   ├── admin/                    # Admin components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── PaymentSettings.tsx
│   │   │   └── AuditLogViewer.tsx
│   │   ├── credits/                  # Credits components
│   │   │   ├── CreditBalance.tsx
│   │   │   ├── CreditPurchase.tsx
│   │   │   └── TransactionHistory.tsx
│   │   ├── documentation/            # Documentation components
│   │   │   ├── DocumentationViewer.tsx
│   │   │   ├── OpenApiViewer.tsx
│   │   │   └── Playground.tsx
│   │   └── shared/                   # Shared components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── ErrorBoundary.tsx
│   ├── lib/                          # Business logic
│   │   ├── auth/                     # Authentication
│   │   │   ├── jwt.ts                # JWT generation/validation
│   │   │   ├── password.ts           # Password hashing
│   │   │   └── middleware.ts         # Auth middleware
│   │   ├── theme/                    # Theme management
│   │   │   ├── provider.tsx          # Theme provider (dark by default)
│   │   │   └── toggle.tsx            # Theme toggle component
│   │   ├── credits/                  # Credit system
│   │   │   ├── transactions.ts       # Credit transaction logic
│   │   │   └── validation.ts         # Credit validation
│   │   ├── payments/                 # Payment processing
│   │   │   ├── stripe.ts             # Stripe integration
│   │   │   ├── paypal.ts             # PayPal integration
│   │   │   └── webhooks.ts           # Payment webhooks
│   │   ├── admin/                    # Admin functionality
│   │   │   ├── users.ts              # User management
│   │   │   ├── settings.ts           # Settings management
│   │   │   └── audit.ts              # Audit logging
│   │   └── audit/                    # Audit logging middleware
│   │       └── middleware.ts         # Auto-logging middleware
│   │   ├── proxy/                    # Proxy functionality
│   │   │   ├── proxy-server.ts       # Proxy server setup
│   │   │   ├── capture.ts            # API call capture
│   │   │   └── validation.ts         # URL validation (SSRF prevention)
│   │   ├── analysis/                 # Analysis pipeline
│   │   │   ├── endpoint-extraction.ts # Endpoint pattern extraction
│   │   │   ├── schema-inference.ts   # Schema inference
│   │   │   ├── pattern-detection.ts  # Pattern detection
│   │   │   └── analyzer.ts           # Main analysis orchestrator
│   │   ├── ai/                       # Optional AI integration (Groq)
│   │   │   ├── groq-client.ts        # Groq API client
│   │   │   ├── prompts.ts            # Prompt templates
│   │   │   └── enhancement.ts        # AI enhancement (optional)
│   │   ├── database/                 # Database utilities
│   │   │   └── prisma.ts             # Prisma client instance
│   │   └── utils/                    # Utility functions
│   │       ├── validation.ts
│   │       ├── formatting.ts
│   │       └── errors.ts
│   ├── hooks/                        # React hooks
│   │   ├── useAuth.ts                # Authentication hook
│   │   ├── useTheme.ts               # Theme hook (dark/light mode)
│   │   ├── useEndpoint.ts            # Endpoint management hook
│   │   ├── useWebSocket.ts           # WebSocket hook
│   │   └── useApiCalls.ts            # API calls hook
│   ├── types/                        # TypeScript types
│   │   ├── api.ts                    # API types
│   │   ├── session.ts                # Session types
│   │   ├── endpoint.ts               # Endpoint types
│   │   └── database.ts               # Database types (from Prisma)
│   ├── styles/                       # Global styles
│   │   └── globals.css
│   └── prisma/                       # Prisma configuration
│       ├── schema.prisma
│       └── migrations/
├── public/                           # Static assets
├── scripts/                          # Utility scripts
│   ├── seed.ts                       # Database seeding
│   └── cleanup.ts                    # Data retention cleanup
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflow

### Starting Development

**1. Start Database:**
```bash
# If using local PostgreSQL
pg_ctl start

# Or if using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
```

**2. Start Development Server:**
```bash
npm run dev
```

**3. Open Browser:**
Navigate to `http://localhost:3000`

### Database Migrations

**Create Migration:**
```bash
npx prisma migrate dev --name migration_name
```

**Apply Migrations (Production):**
```bash
npx prisma migrate deploy
```

**Reset Database (Development Only):**
```bash
npx prisma migrate reset
```

**View Database:**
```bash
npx prisma studio
```

### Code Generation

**Generate Prisma Client:**
```bash
npx prisma generate
```

**Generate TypeScript Types:**
TypeScript types are automatically generated from Prisma schema.

## Coding Patterns & Conventions

### TypeScript

**Strict Mode:**
- `strict: true` in `tsconfig.json`
- No `any` types allowed
- All types must be explicit

**Type Definitions:**
- Use interfaces for object shapes
- Use types for unions, intersections, etc.
- Export types from `src/types/`

### File Naming

**Components:**
- PascalCase: `SessionRecorder.tsx`
- One component per file
- Component name matches file name

**Utilities:**
- camelCase: `formatDate.ts`
- Descriptive function names

**Constants:**
- UPPER_SNAKE_CASE: `API_ENDPOINTS.ts`
- Group related constants

**API Routes:**
- kebab-case: `api-calls/route.ts`
- Matches URL path structure

### Import Organization

**Import Order:**
1. External dependencies (React, Next.js, etc.)
2. Internal modules (components, lib, hooks)
3. Types
4. Relative imports

**Example:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/database/prisma';
import { validateJWT } from '@/lib/auth/jwt';

import type { ApiCall } from '@/types/api';
```

### Error Handling

**API Routes:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // ... logic
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

**Client Components:**
```typescript
'use client';

import { useState } from 'react';

export function Component() {
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async () => {
    try {
      setError(null);
      // ... logic
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ... */}
    </div>
  );
}
```

### Database Access

**Use Prisma Client:**
```typescript
import { prisma } from '@/lib/database/prisma';

// Get endpoint
const endpoint = await prisma.endpoint.findUnique({
  where: { id: endpointId },
  include: {
    apiCalls: true,
    discoveredEndpoints: true,
    documentation: true,
  },
});

// Verify ownership
const isOwner = endpoint?.userId === userId;
if (!isOwner) throw new Error('Unauthorized');

// Create endpoint
const endpoint = await prisma.endpoint.create({
  data: {
    userId,
    name,
    destinationUrl,
    status: 'ACTIVE',
  },
});

// Update endpoint
const endpoint = await prisma.endpoint.update({
  where: { id: endpointId },
  data: { lastUsedAt: new Date() },
});
```

**Transactions (for credit operations):**
```typescript
await prisma.$transaction(async (tx) => {
  // Lock user row, update credits, create transaction, log audit
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  
  const endpoint = await tx.endpoint.create({ /* ... */ });
  await tx.user.update({
    where: { id: userId },
    data: { credits: { decrement: 25 } },
  });
  await tx.creditTransaction.create({ /* ... */ });
  
  return endpoint;
});
```

### Authentication

**JWT Generation:**
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '3d' }
);
```

**JWT Validation:**
```typescript
import jwt from 'jsonwebtoken';

const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
```

**Password Hashing:**
```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Auth Middleware:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const payload = validateJWT(token);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Endpoint Management

**Create Endpoint:**
```typescript
import { prisma } from '@/lib/database/prisma';
import { cuid } from '@paralleldrive/cuid2';

export async function createEndpoint(userId: string, name: string, destinationUrl: string) {
  const endpoint = await prisma.endpoint.create({
    data: {
      id: cuid(),
      userId,
      name,
      destinationUrl,
      status: 'ACTIVE',
    },
  });
  
  return {
    id: endpoint.id,
    proxyUrl: `/proxy/${endpoint.id}`,
  };
}
```

**Check Ownership:**
```typescript
export async function checkEndpointOwnership(endpointId: string, userId: string): Promise<boolean> {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { userId: true },
  });
  
  return endpoint?.userId === userId;
}
```

### Proxy Implementation

**Proxy Route:**
```typescript
// app/proxy/[endpointId]/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { captureApiCall } from '@/lib/proxy/capture';
import { prisma } from '@/lib/database/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { endpointId: string; path: string[] } }
) {
  const { endpointId, path } = params;
  
  // Look up endpoint to get destination URL
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { destinationUrl: true, status: true },
  });
  
  if (!endpoint || endpoint.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Endpoint not found or inactive' },
      { status: 404 }
    );
  }
  
  // Build target URL with path
  const targetPath = path.length > 0 ? `/${path.join('/')}` : '/';
  const targetUrl = new URL(targetPath, endpoint.destinationUrl).toString();
  
  // Validate URL (SSRF prevention)
  if (!isValidProxyUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Invalid destination URL' },
      { status: 400 }
    );
  }
  
  // Update lastUsedAt
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: { lastUsedAt: new Date() },
  });
  
  // Create proxy and capture
  // Proxy request to destination, capture request/response, store in database
  // (see architecture doc for full implementation)
}
```

### Validation

**Use Zod:**
```typescript
import { z } from 'zod';

const createEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  destinationUrl: z.string().url().refine(
    (url) => isValidProxyUrl(url),
    'Invalid destination URL'
  ),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = createEndpointSchema.parse(body);
  // ...
}
```

## Testing

**CRITICAL:** Testing is mandatory at all levels. Tests must be written as code is implemented, not after.

### Testing Strategy

**Test Pyramid:**
1. **Unit Tests (Foundation):** Test individual functions, components, utilities in isolation
2. **Integration Tests (Middle Layer):** Test API routes, database operations, component interactions
3. **E2E Tests (Top Layer):** Test complete user flows with Playwright
4. **Browser Tests (User-Centered):** Test real user scenarios through browser automation

**Coverage Requirements:**
- **Unit Tests:** 90%+ coverage for all business logic (`lib/` directory)
- **Integration Tests:** All API endpoints, database operations, component integrations
- **E2E Tests:** All critical user flows (authentication, endpoint creation, documentation generation, export)
- **Browser Tests:** Comprehensive user-centered test cases covering all major features

### Unit Tests

**Framework:** Vitest 1.x

**Location:** `src/**/*.test.ts` (co-located with source files) or `__tests__/unit/` (separate test directory)

**Coverage Target:** 90%+ coverage for all business logic (`lib/` directory)

**Test Categories:**
- Analysis functions (endpoint extraction, schema inference, pattern detection)
- Authentication utilities (JWT, password hashing)
- Credit system functions
- Payment processing utilities
- Validation functions
- Formatting utilities
- Error handling

**Example - Endpoint Pattern Extraction:**
```typescript
import { describe, it, expect } from 'vitest';
import { extractEndpointPattern } from '@/lib/analysis/endpoint-extraction';

describe('extractEndpointPattern', () => {
  it('should extract pattern from URL with numeric ID', () => {
    const pattern = extractEndpointPattern('/api/users/123');
    expect(pattern).toBe('/api/users/:id');
  });

  it('should extract pattern from URL with UUID', () => {
    const pattern = extractEndpointPattern('/api/users/550e8400-e29b-41d4-a716-446655440000');
    expect(pattern).toBe('/api/users/:id');
  });

  it('should extract pattern from URL with multiple parameters', () => {
    const pattern = extractEndpointPattern('/api/users/123/posts/456');
    expect(pattern).toBe('/api/users/:id/posts/:postId');
  });

  it('should handle query parameters', () => {
    const pattern = extractEndpointPattern('/api/users?page=1&limit=10');
    expect(pattern).toBe('/api/users');
  });

  it('should handle nested paths', () => {
    const pattern = extractEndpointPattern('/api/v1/users/123');
    expect(pattern).toBe('/api/v1/users/:id');
  });
});
```

**Example - Schema Inference:**
```typescript
import { describe, it, expect } from 'vitest';
import { inferSchema } from '@/lib/analysis/schema-inference';

describe('inferSchema', () => {
  it('should infer schema from simple JSON object', () => {
    const data = { id: 1, name: 'John', active: true };
    const schema = inferSchema(data);
    expect(schema).toEqual({
      id: 'number',
      name: 'string',
      active: 'boolean',
    });
  });

  it('should infer schema from nested objects', () => {
    const data = { user: { id: 1, profile: { name: 'John' } } };
    const schema = inferSchema(data);
    expect(schema).toEqual({
      user: {
        id: 'number',
        profile: {
          name: 'string',
        },
      },
    });
  });

  it('should infer schema from arrays', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const schema = inferSchema(data);
    expect(schema).toEqual({
      type: 'array',
      items: { id: 'number' },
    });
  });

  it('should handle null and undefined values', () => {
    const data = { id: 1, name: null, email: undefined };
    const schema = inferSchema(data);
    expect(schema).toEqual({
      id: 'number',
      name: 'null',
      email: 'undefined',
    });
  });
});
```

**Example - Credit System:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkCredits, deductCredits, addCredits } from '@/lib/credits/transactions';
import { prisma } from '@/lib/database/prisma';

describe('Credit System', () => {
  beforeEach(async () => {
    // Clean test database
    await prisma.creditTransaction.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('checkCredits', () => {
    it('should return true when user has sufficient credits', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          credits: 100,
        },
      });

      const hasCredits = await checkCredits(user.id, 50);
      expect(hasCredits).toBe(true);
    });

    it('should return false when user has insufficient credits', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          credits: 20,
        },
      });

      const hasCredits = await checkCredits(user.id, 50);
      expect(hasCredits).toBe(false);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits and create transaction', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          credits: 100,
        },
      });

      await deductCredits(user.id, 25, 'endpoint-id', 'Endpoint creation');

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.credits).toBe(75);

      const transaction = await prisma.creditTransaction.findFirst({
        where: { userId: user.id },
      });
      expect(transaction?.amount).toBe(-25);
      expect(transaction?.type).toBe('ENDPOINT');
    });

    it('should throw error when insufficient credits', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          credits: 20,
        },
      });

      await expect(
        deductCredits(user.id, 50, 'endpoint-id', 'Endpoint creation')
      ).rejects.toThrow('Insufficient credits');
    });
  });

  describe('addCredits', () => {
    it('should add credits and create transaction', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          credits: 50,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: 20,
          credits: 100,
          status: 'COMPLETED',
          provider: 'STRIPE',
        },
      });

      await addCredits(user.id, 100, payment.id, 'Credit purchase');

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.credits).toBe(150);

      const transaction = await prisma.creditTransaction.findFirst({
        where: { userId: user.id, type: 'PURCHASE' },
      });
      expect(transaction?.amount).toBe(100);
    });
  });
});
```

**Example - Authentication:**
```typescript
import { describe, it, expect } from 'vitest';
import { generateJWT, validateJWT } from '@/lib/auth/jwt';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Authentication', () => {
  describe('JWT', () => {
    it('should generate and validate JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = generateJWT(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = validateJWT(token);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should reject expired tokens', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = generateJWT(payload, { expiresIn: '-1h' }); // Expired

      expect(() => validateJWT(token)).toThrow();
    });

    it('should reject invalid tokens', () => {
      expect(() => validateJWT('invalid-token')).toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash and verify password', async () => {
      const password = 'securePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'securePassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
});
```

**Run Unit Tests:**
```bash
npm test
# or
npm run test:unit
```

### Integration Tests

**Framework:** Vitest 1.x (same as unit tests)

**Test Database:** Use separate test database (`DATABASE_URL_TEST` environment variable)

**Test Categories:**
- API route handlers (authentication, endpoints, credits, payments, admin)
- Database operations (Prisma queries, transactions)
- Component interactions (React components with API calls)
- WebSocket connections
- Background job processing

**Example - Authentication API Routes:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/auth/register/route';
import { POST as loginPOST } from '@/app/api/v1/auth/login/route';
import { GET } from '@/app/api/v1/auth/me/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';

describe('Authentication API Routes', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new user', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.token).toBeDefined();

      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          username: 'existing',
          passwordHash: 'hash',
        },
      });

      const request = new NextRequest('http://localhost/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: await hashPassword('password123'),
        },
      });
    });

    it('should login with correct credentials', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await loginPOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.email).toBe('test@example.com');
      expect(data.token).toBeDefined();

      // Verify cookie was set
      const cookies = response.headers.getSetCookie();
      expect(cookies.some(c => c.includes('auth_token'))).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await loginPOST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hash',
        },
      });

      const token = generateJWT({ userId: user.id, email: user.email });

      const request = new NextRequest('http://localhost/api/v1/auth/me', {
        headers: {
          Cookie: `auth_token=${token}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.id).toBe(user.id);
      expect(data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/me');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
```

**Example - Endpoint API Routes:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/endpoints/route';
import { GET } from '@/app/api/v1/endpoints/[id]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';

describe('Endpoint API Routes', () => {
  let user: any;
  let authToken: string;

  beforeEach(async () => {
    await prisma.endpoint.deleteMany();
    await prisma.user.deleteMany();

    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        credits: 100,
      },
    });

    authToken = generateJWT({ userId: user.id, email: user.email });
  });

  describe('POST /api/v1/endpoints', () => {
    it('should create endpoint and deduct credits', async () => {
      const request = new NextRequest('http://localhost/api/v1/endpoints', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test API',
          destinationUrl: 'https://jsonplaceholder.typicode.com',
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth_token=${authToken}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.endpoint.name).toBe('Test API');
      expect(data.endpoint.proxyUrl).toContain('/proxy/');

      // Verify credits were deducted
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.credits).toBe(75); // 100 - 25

      // Verify transaction was created
      const transaction = await prisma.creditTransaction.findFirst({
        where: { userId: user.id },
      });
      expect(transaction?.amount).toBe(-25);
    });

    it('should reject when insufficient credits', async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: 20 },
      });

      const request = new NextRequest('http://localhost/api/v1/endpoints', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test API',
          destinationUrl: 'https://jsonplaceholder.typicode.com',
        }),
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth_token=${authToken}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Insufficient credits');
    });
  });

  describe('GET /api/v1/endpoints/:id', () => {
    it('should return endpoint for owner', async () => {
      const endpoint = await prisma.endpoint.create({
        data: {
          userId: user.id,
          name: 'Test API',
          destinationUrl: 'https://jsonplaceholder.typicode.com',
          status: 'ACTIVE',
        },
      });

      const request = new NextRequest(`http://localhost/api/v1/endpoints/${endpoint.id}`, {
        headers: {
          Cookie: `auth_token=${authToken}`,
        },
      });

      const response = await GET(request, { params: { id: endpoint.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.endpoint.id).toBe(endpoint.id);
    });

    it('should reject access for non-owner', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          passwordHash: 'hash',
        },
      });

      const endpoint = await prisma.endpoint.create({
        data: {
          userId: otherUser.id,
          name: 'Other API',
          destinationUrl: 'https://example.com',
          status: 'ACTIVE',
        },
      });

      const request = new NextRequest(`http://localhost/api/v1/endpoints/${endpoint.id}`, {
        headers: {
          Cookie: `auth_token=${authToken}`,
        },
      });

      const response = await GET(request, { params: { id: endpoint.id } });
      expect(response.status).toBe(403);
    });
  });
});
```

**Run Integration Tests:**
```bash
npm run test:integration
```

### E2E Tests (Playwright)

**Framework:** Playwright 1.x

**Location:** `__tests__/e2e/` or `e2e/` directory

**Coverage:** All critical user flows

**Browser:** Chromium (primary), Firefox and WebKit (optional for CI)

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Example - Authentication Flow:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register new account', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, newuser')).toBeVisible();
  });

  test('user can login with demo account', async ({ page }) => {
    await page.goto('/login');
    
    // Click demo user button
    await page.click('text=demo1');
    
    // Verify form was auto-filled
    await expect(page.locator('input[name="email"]')).toHaveValue('demo1@example.com');
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, demo1')).toBeVisible();
  });

  test('user can logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.click('text=demo1');
    await page.click('button[type="submit"]');
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    await expect(page).toHaveURL('/login');
  });
});
```

**Example - Endpoint Creation Flow:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Endpoint Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.click('text=demo1');
    await page.click('button[type="submit"]');
  });

  test('user can create endpoint', async ({ page }) => {
    await page.goto('/dashboard/endpoints');
    
    await page.click('text=Create Endpoint');
    await page.fill('input[name="name"]', 'Test API');
    await page.fill('input[name="destinationUrl"]', 'https://jsonplaceholder.typicode.com');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Test API')).toBeVisible();
    await expect(page.locator('text=/proxy/')).toBeVisible();
  });

  test('user can view endpoint details', async ({ page }) => {
    // Create endpoint first (via API or UI)
    await page.goto('/dashboard/endpoints');
    await page.click('text=Create Endpoint');
    await page.fill('input[name="name"]', 'Test API');
    await page.fill('input[name="destinationUrl"]', 'https://jsonplaceholder.typicode.com');
    await page.click('button:has-text("Create")');

    // Click on endpoint
    await page.click('text=Test API');

    await expect(page).toHaveURL(/\/dashboard\/endpoints\/[a-z0-9]+/);
    await expect(page.locator('text=Test API')).toBeVisible();
    await expect(page.locator('text=Status: ACTIVE')).toBeVisible();
  });

  test('user can see credit balance after endpoint creation', async ({ page }) => {
    await page.goto('/dashboard/endpoints');
    
    // Check initial balance
    const initialBalance = await page.locator('[data-testid="credit-balance"]').textContent();
    
    await page.click('text=Create Endpoint');
    await page.fill('input[name="name"]', 'Test API');
    await page.fill('input[name="destinationUrl"]', 'https://jsonplaceholder.typicode.com');
    await page.click('button:has-text("Create")');

    // Verify balance decreased
    await page.waitForTimeout(1000); // Wait for credit update
    const newBalance = await page.locator('[data-testid="credit-balance"]').textContent();
    expect(parseInt(newBalance || '0')).toBe(parseInt(initialBalance || '0') - 25);
  });
});
```

**Example - Documentation Generation Flow:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Documentation Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('text=demo1');
    await page.click('button[type="submit"]');
  });

  test('user can review API data before generating documentation', async ({ page }) => {
    // Create endpoint and capture some API calls
    await page.goto('/dashboard/endpoints');
    await page.click('text=Create Endpoint');
    await page.fill('input[name="name"]', 'Test API');
    await page.fill('input[name="destinationUrl"]', 'https://jsonplaceholder.typicode.com');
    await page.click('button:has-text("Create")');

    // Get proxy URL and use it to generate API calls
    const proxyUrl = await page.locator('[data-testid="proxy-url"]').textContent();
    // Navigate to proxy URL in new tab to generate API calls
    // ... (simulate API usage)

    // Go back to endpoint details
    await page.click('text=Test API');
    
    // Click Review API Data
    await page.click('button:has-text("Review API Data")');

    // Verify preview modal shows API calls
    await expect(page.locator('[data-testid="api-data-preview"]')).toBeVisible();
    await expect(page.locator('text=API Calls Captured')).toBeVisible();
  });

  test('user can generate documentation', async ({ page }) => {
    // Setup: Create endpoint with captured API calls
    // ... (setup code)

    await page.goto('/dashboard/endpoints');
    await page.click('text=Test API');
    await page.click('button:has-text("Generate Documentation")');

    // Verify processing status
    await expect(page.locator('text=Processing')).toBeVisible();

    // Wait for completion (with timeout)
    await page.waitForSelector('text=Documentation Generated', { timeout: 60000 });

    // Verify documentation is available
    await expect(page.locator('text=View Documentation')).toBeVisible();
  });

  test('user can choose to keep monitoring after documentation generation', async ({ page }) => {
    // Setup: Generate documentation
    // ... (setup code)

    await page.click('button:has-text("Generate Documentation")');
    await page.waitForSelector('text=Documentation Generated', { timeout: 60000 });

    // Choose to keep monitoring
    await page.click('button:has-text("Keep Monitoring")');

    // Verify monitoring is enabled
    await expect(page.locator('text=Monitoring Active')).toBeVisible();
    await expect(page.locator('text=Status: MONITORING')).toBeVisible();
  });
});
```

**Example - Export Flow:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('text=demo1');
    await page.click('button[type="submit"]');
  });

  test('user can export as CSV', async ({ page, context }) => {
    // Setup: Create endpoint with documentation
    // ... (setup code)

    await page.goto('/dashboard/endpoints');
    await page.click('text=Test API');
    
    // Click export dropdown
    await page.click('button:has-text("Export")');
    await page.click('text=Export as CSV');

    // Wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export as CSV'),
    ]);

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('user can export as ZIP of MD files', async ({ page }) => {
    // Setup: Create endpoint with documentation
    // ... (setup code)

    await page.goto('/dashboard/endpoints');
    await page.click('text=Test API');
    
    await page.click('button:has-text("Export")');
    await page.click('text=Export as ZIP');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export as ZIP'),
    ]);

    expect(download.suggestedFilename()).toContain('.zip');
  });

  test('user can view printable version', async ({ page }) => {
    // Setup: Create endpoint with documentation
    // ... (setup code)

    await page.goto('/dashboard/endpoints');
    await page.click('text=Test API');
    
    await page.click('button:has-text("Export")');
    await page.click('text=Printable View');

    // Verify printable page opens
    await expect(page).toHaveURL(/\/dashboard\/endpoints\/[a-z0-9]+\/export\/printable/);
    await expect(page.locator('text=API Documentation')).toBeVisible();
  });
});
```

**Run E2E Tests:**
```bash
npm run test:e2e
```

### Browser Testing (User-Centered Test Cases)

**Purpose:** Test real user scenarios through browser automation to ensure features work as users would experience them.

**Framework:** Playwright with browser automation tools (Cursor browser tools, Puppeteer MCP)

**Location:** `__tests__/browser/` or `browser-tests/` directory

**Approach:** Comprehensive user-centered test cases covering all major features, user flows, and edge cases.

#### Authentication & Account Management Test Cases

**TC-AUTH-001: User Registration**
- Navigate to registration page
- Fill in email, username, password, confirm password
- Submit form
- Verify user is redirected to dashboard
- Verify welcome message displays username
- Verify user receives 100 free credits
- Verify credit balance is displayed correctly

**TC-AUTH-002: User Login with Email/Password**
- Navigate to login page
- Enter valid email and password
- Submit form
- Verify user is redirected to dashboard
- Verify session persists on page refresh
- Verify logout button is visible

**TC-AUTH-003: User Login with Demo Account**
- Navigate to login page
- Verify demo users are displayed
- Click on demo user button
- Verify form fields are auto-filled
- Submit form
- Verify user is logged in successfully
- Verify user has demo account indicator

**TC-AUTH-004: Login with Invalid Credentials**
- Navigate to login page
- Enter invalid email or password
- Submit form
- Verify error message is displayed
- Verify user remains on login page
- Verify form fields are not cleared

**TC-AUTH-005: User Logout**
- Login as user
- Click logout button
- Verify user is redirected to login page
- Verify session is cleared (cannot access protected routes)
- Verify user must login again to access dashboard

**TC-AUTH-006: Session Persistence**
- Login as user
- Close browser tab
- Open new tab and navigate to dashboard URL
- Verify user is still logged in
- Verify session persists across browser restarts (if cookies are set)

**TC-AUTH-007: Password Validation**
- Navigate to registration page
- Enter weak password (less than 8 characters)
- Verify validation error is displayed
- Enter password without special characters
- Verify validation error is displayed
- Enter valid password
- Verify validation passes

#### Endpoint Management Test Cases

**TC-ENDPOINT-001: Create Endpoint (Free Tier)**
- Login as free tier user
- Navigate to endpoints page
- Click "Create Endpoint" button
- Enter endpoint name and destination URL
- Submit form
- Verify endpoint is created successfully
- Verify proxy URL is displayed
- Verify credits are NOT deducted (free tier, first 4 endpoints)
- Verify endpoint appears in list

**TC-ENDPOINT-002: Create Endpoint (Paid Credits)**
- Login as user with credits (but not free tier)
- Navigate to endpoints page
- Click "Create Endpoint" button
- Enter endpoint name and destination URL
- Submit form
- Verify endpoint is created successfully
- Verify 25 credits are deducted
- Verify credit balance is updated
- Verify transaction is recorded

**TC-ENDPOINT-003: Create Endpoint with Insufficient Credits**
- Login as user with less than 25 credits
- Navigate to endpoints page
- Click "Create Endpoint" button
- Enter endpoint name and destination URL
- Submit form
- Verify error message about insufficient credits
- Verify "Purchase Credits" button is displayed
- Verify endpoint is NOT created
- Verify credits are NOT deducted

**TC-ENDPOINT-004: View Endpoint Details**
- Create an endpoint
- Click on endpoint in list
- Verify endpoint details page loads
- Verify endpoint name, destination URL, proxy URL are displayed
- Verify status is "ACTIVE"
- Verify API calls count (if any)
- Verify created date is displayed

**TC-ENDPOINT-005: Use Proxy URL**
- Create an endpoint
- Copy proxy URL
- Open proxy URL in new tab
- Verify destination site loads through proxy
- Perform actions on destination site (navigate, click, submit forms)
- Verify API calls are being captured
- Return to endpoint details page
- Verify API calls appear in list

**TC-ENDPOINT-006: Review API Data**
- Create endpoint and capture API calls
- Navigate to endpoint details page
- Click "Review API Data" button
- Verify preview modal opens
- Verify API calls are listed with method, URL, status
- Verify user can scroll through API calls
- Verify user can close modal
- Verify user can proceed to generate documentation

**TC-ENDPOINT-007: Generate Documentation**
- Create endpoint with captured API calls
- Navigate to endpoint details page
- Click "Review API Data" and verify data
- Click "Generate Documentation" button
- Verify processing status is displayed
- Verify progress indicator shows (if available)
- Wait for documentation generation to complete
- Verify documentation is displayed
- Verify endpoint status changes to "COMPLETE" or "MONITORING"

**TC-ENDPOINT-008: Keep Monitoring After Documentation**
- Generate documentation for endpoint
- When prompted, click "Keep Monitoring" button
- Verify endpoint status changes to "MONITORING"
- Verify proxy URL remains active
- Verify monitoring indicator is displayed
- Verify action sequence is saved for replay

**TC-ENDPOINT-009: Finish Without Monitoring**
- Generate documentation for endpoint
- When prompted, click "Finish" button
- Verify endpoint status changes to "COMPLETE"
- Verify proxy URL no longer works (404)
- Verify monitoring is disabled
- Verify documentation is still accessible

**TC-ENDPOINT-010: View Documentation**
- Generate documentation for endpoint
- Navigate to documentation view
- Verify all discovered endpoints are listed
- Verify endpoint details (method, URL, description) are displayed
- Verify request/response schemas are shown
- Verify examples are displayed
- Verify user can navigate between endpoints

**TC-ENDPOINT-011: Export as CSV**
- Generate documentation for endpoint
- Navigate to endpoint details page
- Click "Export" dropdown
- Click "Export as CSV"
- Verify CSV file is downloaded
- Verify file contains API call data
- Verify file can be opened in spreadsheet application

**TC-ENDPOINT-012: Export as ZIP**
- Generate documentation for endpoint
- Navigate to endpoint details page
- Click "Export" dropdown
- Click "Export as ZIP"
- Verify ZIP file is downloaded
- Verify ZIP contains Markdown files (one per endpoint)
- Verify Markdown files contain documentation

**TC-ENDPOINT-013: View Printable Version**
- Generate documentation for endpoint
- Navigate to endpoint details page
- Click "Export" dropdown
- Click "Printable View"
- Verify printable page opens
- Verify page is optimized for printing
- Verify all documentation is visible
- Verify page can be printed successfully

**TC-ENDPOINT-014: Make Documentation Public**
- Generate documentation for endpoint
- Navigate to endpoint details page
- Toggle "Make Public" switch
- Verify public URL is generated
- Verify slug is created (if custom slug provided)
- Verify documentation is accessible via public URL (without authentication)
- Verify public documentation page displays correctly

**TC-ENDPOINT-015: Access Other User's Endpoint (Unauthorized)**
- Login as User A
- Create endpoint
- Logout
- Login as User B
- Attempt to access User A's endpoint via URL
- Verify 403 Forbidden error
- Verify endpoint does not appear in User B's list

#### Credit System Test Cases

**TC-CREDITS-001: View Credit Balance**
- Login as user
- Navigate to dashboard
- Verify credit balance is displayed
- Navigate to credits page
- Verify credit balance is displayed prominently
- Verify transaction history is visible

**TC-CREDITS-002: Purchase Credits (Stripe)**
- Login as user
- Navigate to credits page
- Click "Purchase Credits" button
- Verify payment form is displayed
- Enter test credit card (sandbox mode)
- Submit payment
- Verify payment processing indicator
- Verify credits are added to account
- Verify transaction appears in history
- Verify credit balance is updated

**TC-CREDITS-003: Purchase Credits (PayPal)**
- Login as user
- Navigate to credits page
- Click "Purchase Credits" button
- Select PayPal as payment method
- Complete PayPal checkout (sandbox)
- Verify credits are added to account
- Verify transaction appears in history

**TC-CREDITS-004: View Transaction History**
- Login as user with transactions
- Navigate to credits page
- Verify transaction history is displayed
- Verify transactions show: date, type, amount, balance after
- Verify transactions are sorted by date (newest first)
- Verify user can scroll through history

**TC-CREDITS-005: Free Credits on Signup**
- Register new account
- Navigate to credits page
- Verify 100 free credits are displayed
- Verify transaction history shows "SIGNUP_BONUS"
- Verify user can create 4 endpoints for free

**TC-CREDITS-006: Credit Deduction for Endpoint Creation**
- Login as user with credits
- Create endpoint (not free tier)
- Verify 25 credits are deducted
- Verify transaction history shows deduction
- Verify credit balance is updated immediately

#### Subscription Management Test Cases

**TC-SUBSCRIPTION-001: View Subscription Status**
- Login as user
- Navigate to subscription page
- Verify current tier is displayed (FREE, PRO, or TEAM)
- Verify subscription status is shown
- Verify features available for current tier are listed

**TC-SUBSCRIPTION-002: Upgrade to Pro Tier**
- Login as free tier user
- Navigate to subscription page
- Click "Upgrade to Pro" button
- Complete payment (Stripe/PayPal)
- Verify subscription is activated
- Verify tier changes to PRO
- Verify Pro features are unlocked
- Verify unlimited endpoints are available

**TC-SUBSCRIPTION-003: Upgrade to Team Tier**
- Login as user (any tier)
- Navigate to subscription page
- Click "Upgrade to Team" button
- Complete payment
- Verify subscription is activated
- Verify tier changes to TEAM
- Verify Team features are unlocked

**TC-SUBSCRIPTION-004: Cancel Subscription**
- Login as subscribed user
- Navigate to subscription page
- Click "Cancel Subscription" button
- Confirm cancellation
- Verify subscription is canceled (at period end)
- Verify user retains access until period end
- Verify cancellation date is displayed

#### Admin Panel Test Cases

**TC-ADMIN-001: Admin Login**
- Login as admin user
- Verify admin panel link is visible
- Navigate to admin panel
- Verify admin dashboard loads

**TC-ADMIN-002: View All Users**
- Login as admin
- Navigate to admin panel
- Click "Users" section
- Verify all users are listed
- Verify user details (email, username, tier, credits) are displayed
- Verify user can search/filter users

**TC-ADMIN-003: Edit User**
- Login as admin
- Navigate to admin users page
- Click on a user
- Edit user details (credits, tier, status)
- Save changes
- Verify changes are saved
- Verify audit log entry is created

**TC-ADMIN-004: View Audit Log**
- Login as admin
- Navigate to admin panel
- Click "Audit Log" section
- Verify audit log entries are displayed
- Verify entries show: user, action, resource, timestamp
- Verify user can filter by user, action, date range
- Verify user can export audit log

**TC-ADMIN-005: Configure Payment Settings**
- Login as admin
- Navigate to admin panel
- Click "Payment Settings"
- Configure Stripe keys (sandbox/live)
- Configure PayPal credentials
- Toggle sandbox mode
- Save settings
- Verify settings are saved
- Verify payment processing uses new settings

#### Monitoring & Change Detection Test Cases

**TC-MONITORING-001: Enable Monitoring**
- Create endpoint and generate documentation
- Choose "Keep Monitoring" option
- Verify monitoring is enabled
- Verify endpoint status is "MONITORING"
- Verify monitoring indicator is displayed

**TC-MONITORING-002: View API Changes**
- Enable monitoring for endpoint
- Wait for replay to detect changes (or simulate)
- Navigate to endpoint details page
- Click "Changes" tab
- Verify API changes are listed
- Verify change details (type, description, before/after) are displayed
- Verify change timeline is shown

**TC-MONITORING-003: Receive Change Notification**
- Enable monitoring for endpoint
- Configure notification preferences
- Simulate API change detection
- Verify notification is sent (email/webhook)
- Verify notification contains change details

#### Public Documentation Test Cases

**TC-PUBLIC-001: Browse Public Documentation**
- Navigate to public documentation browse page
- Verify public endpoints are listed
- Verify endpoint details (name, owner, description) are displayed
- Click on an endpoint
- Verify public documentation page loads
- Verify documentation is fully accessible without authentication

**TC-PUBLIC-002: Search Public Documentation**
- Navigate to public documentation browse page
- Enter search query
- Verify search results are filtered
- Verify search highlights matching terms
- Click on search result
- Verify correct documentation page loads

**TC-PUBLIC-003: Share Public Documentation**
- Create endpoint and generate documentation
- Make documentation public
- Copy public URL
- Open URL in incognito/private window
- Verify documentation is accessible
- Verify documentation displays correctly

#### UI/UX Test Cases

**TC-UI-001: Dark Mode Toggle**
- Navigate to any page
- Verify dark mode is enabled by default
- Click theme toggle button
- Verify light mode is activated
- Verify theme persists on page refresh
- Verify theme applies to all pages

**TC-UI-002: Responsive Design (Mobile)**
- Open application on mobile device (or resize browser)
- Verify layout adapts to mobile screen
- Verify navigation menu is accessible
- Verify forms are usable on mobile
- Verify buttons are appropriately sized
- Verify text is readable

**TC-UI-003: Responsive Design (Tablet)**
- Open application on tablet device (or resize browser)
- Verify layout adapts to tablet screen
- Verify navigation is accessible
- Verify content is properly spaced

**TC-UI-004: Loading States**
- Perform action that triggers loading (create endpoint, generate docs)
- Verify loading indicator is displayed
- Verify user cannot perform conflicting actions during loading
- Verify loading completes successfully

**TC-UI-005: Error Handling**
- Trigger error condition (invalid URL, network error)
- Verify error message is displayed
- Verify error message is user-friendly
- Verify user can recover from error
- Verify error does not break application

**TC-UI-006: Form Validation**
- Navigate to form (registration, endpoint creation)
- Submit form with invalid data
- Verify validation errors are displayed
- Verify errors are specific and helpful
- Fix errors and resubmit
- Verify form submits successfully

#### Performance Test Cases

**TC-PERF-001: Page Load Performance**
- Navigate to each major page
- Verify page loads within 2 seconds
- Verify no layout shift during load
- Verify images/assets load efficiently

**TC-PERF-002: API Response Performance**
- Perform actions that trigger API calls
- Verify API responses are received within reasonable time
- Verify UI updates promptly after API response
- Verify no unnecessary API calls are made

**TC-PERF-003: Large Dataset Handling**
- Create endpoint with many API calls (100+)
- Navigate to endpoint details
- Verify page loads efficiently
- Verify API calls list is paginated or virtualized
- Verify user can scroll through list smoothly

#### Accessibility Test Cases

**TC-A11Y-001: Keyboard Navigation**
- Navigate through application using only keyboard
- Verify all interactive elements are accessible
- Verify focus indicators are visible
- Verify tab order is logical

**TC-A11Y-002: Screen Reader Compatibility**
- Use screen reader to navigate application
- Verify all content is announced
- Verify form labels are associated correctly
- Verify error messages are announced

**TC-A11Y-003: Color Contrast**
- Verify text has sufficient contrast against background
- Verify interactive elements are distinguishable
- Verify error states are clearly visible

**Run Browser Tests:**
```bash
npm run test:browser
# or use Cursor browser tools for manual testing
```

### Test Coverage

**Target:** 90%+ coverage for all code

**Coverage Breakdown:**
- **Unit Tests:** 90%+ coverage for `lib/` directory (business logic)
- **Integration Tests:** 100% coverage for API routes
- **E2E Tests:** 100% coverage for critical user flows
- **Browser Tests:** Comprehensive coverage of all user scenarios

**Run Coverage:**
```bash
npm run test:coverage
```

**Coverage Reports:**
- HTML report: `coverage/index.html`
- Terminal output: Summary of coverage by file
- CI integration: Coverage uploaded to CI/CD platform

### Test Execution Strategy

**Development:**
- Run unit tests on file save (watch mode)
- Run integration tests before commit
- Run E2E tests before pushing to remote

**CI/CD:**
- Run all unit tests on every commit
- Run integration tests on every commit
- Run E2E tests on pull requests
- Run browser tests on nightly builds

**Pre-Deployment:**
- Run full test suite (unit + integration + E2E + browser)
- Verify 90%+ coverage maintained
- Verify all critical flows pass
- Verify no regressions introduced

## Analysis Pipeline

**Automatic Analysis:** Sessions are analyzed automatically after capture

**Analysis Process:**
```typescript
// lib/analysis/analyzer.ts
export async function analyzeSession(sessionId: string) {
  // 1. Get all captured API calls
  const apiCalls = await prisma.apiCall.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
  });
  
  // 2. Programmatic extraction
  const endpoints = extractEndpoints(apiCalls);
  const schemas = inferSchemas(apiCalls);
  const patterns = detectPatterns(apiCalls);
  
  // 3. Store analyzed endpoints
  for (const endpoint of endpoints) {
    await prisma.endpoint.create({
      data: {
        sessionId,
        pattern: endpoint.pattern,
        methods: endpoint.methods,
        protocol: endpoint.protocol,
        apiType: endpoint.apiType,
        requestSchema: schemas[endpoint.pattern]?.request,
        responseSchemas: schemas[endpoint.pattern]?.response,
        // ... other fields
      },
    });
  }
  
  // 4. Generate documentation with AI descriptions
  // AI is used to generate natural language descriptions for endpoints, parameters, and fields
  if (process.env.GROQ_API_KEY) {
    await generateDocumentationWithAI(sessionId, endpoints);
  } else {
    // Fallback: Generate documentation with programmatic-only descriptions (degraded quality)
    await generateDocumentationProgrammatic(sessionId, endpoints);
  }
  
  // 6. Update session status
  await prisma.recordingSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETE', analyzedAt: new Date() },
  });
}
```

**Analysis Triggers:**
- Automatic: After 5 minutes of inactivity (no new API calls for an endpoint)
- Manual only: User triggers via "Generate Documentation" button (no automatic processing)

### Credit System

**Check Credits:**
```typescript
export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  
  return (user?.credits || 0) >= required;
}
```

**Deduct Credits:**
```typescript
export async function deductCredits(
  userId: string,
  amount: number,
  endpointId: string,
  description: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Lock user row
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    
    if (!user || user.credits < amount) {
      throw new Error('Insufficient credits');
    }
    
    const newBalance = user.credits - amount;
    
    // Update user credits
    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });
    
    // Create transaction record
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        balanceAfter: newBalance,
        type: 'ENDPOINT',
        description,
        endpointId,
      },
    });
    
    // Log audit entry
    await tx.auditLog.create({
      data: {
        userId,
        userEmail: user.email,
        action: 'CREDIT_DEDUCTED',
        resourceType: 'ENDPOINT',
        resourceId: endpointId,
        details: { amount, balanceAfter: newBalance },
      },
    });
  });
}
```

**Add Credits:**
```typescript
export async function addCredits(
  userId: string,
  amount: number,
  paymentId: string,
  description: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true, email: true },
    });
    
    if (!user) throw new Error('User not found');
    
    const newBalance = user.credits + amount;
    
    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });
    
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newBalance,
        type: 'PURCHASE',
        description,
        paymentId,
      },
    });
    
    await tx.auditLog.create({
      data: {
        userId,
        userEmail: user.email,
        action: 'CREDIT_PURCHASED',
        resourceType: 'PAYMENT',
        resourceId: paymentId,
        details: { amount, balanceAfter: newBalance },
      },
    });
  });
}
```

### Payment Integration

**Stripe Setup:**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function createStripePaymentIntent(
  userId: string,
  credits: number,
  amount: number
): Promise<string> {
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount,
      credits,
      provider: 'STRIPE',
      status: 'PENDING',
      sandbox: process.env.PAYMENT_SANDBOX_MODE === 'true',
    },
  });
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      userId,
      paymentId: payment.id,
      credits: credits.toString(),
    },
  });
  
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: paymentIntent.id },
  });
  
  return paymentIntent.client_secret!;
}
```

**PayPal Setup:**
```typescript
import paypal from '@paypal/checkout-server-sdk';

export async function createPayPalOrder(
  userId: string,
  credits: number,
  amount: number
): Promise<string> {
  // Similar pattern for PayPal
  // Create payment record, create PayPal order, return order ID
}
```

**Payment Webhooks:**
```typescript
// app/api/v1/payments/webhook/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { userId, paymentId, credits } = paymentIntent.metadata;
    
    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        providerData: paymentIntent,
      },
    });
    
    // Add credits to user
    await addCredits(userId, parseInt(credits), paymentId, 'Credit purchase');
  }
  
  return NextResponse.json({ received: true });
}
```

### Audit Logging

**Automatic Audit Logging Middleware:**
```typescript
// lib/audit/middleware.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function auditLog(
  userId: string | null,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: any,
  request: NextRequest
) {
  const userEmail = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }).then(u => u?.email || null)
    : null;
  
  await prisma.auditLog.create({
    data: {
      userId: userId || undefined,
      userEmail,
      action,
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      details,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    },
  });
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  
  // ... create endpoint logic ...
  
  await auditLog(
    user.id,
    'ENDPOINT_CREATED',
    'ENDPOINT',
    endpoint.id,
    { destinationUrl, creditsUsed: 25 },
    request
  );
}
```

### Subscription Management

**Get Subscription Status:**
```typescript
export async function getSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionId: true,
      subscriptionStatus: true,
    },
  });
  
  return {
    tier: user?.subscriptionTier || 'FREE',
    status: user?.subscriptionStatus || null,
    subscriptionId: user?.subscriptionId || null,
  };
}
```

**Subscribe to Pro/Team:**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function subscribeToTier(
  userId: string,
  tier: 'PRO' | 'TEAM',
  paymentMethodId: string
) {
  const priceMap = {
    PRO: 'price_pro_15_monthly',  // Stripe price ID for Pro
    TEAM: 'price_team_50_monthly', // Stripe price ID for Team
  };
  
  // Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: await getOrCreateStripeCustomer(userId),
    items: [{ price: priceMap[tier] }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
  
  // Update user subscription
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      subscriptionId: subscription.id,
      subscriptionStatus: 'active',
    },
  });
  
  return subscription;
}
```

**Cancel Subscription:**
```typescript
export async function cancelSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionId: true },
  });
  
  if (!user?.subscriptionId) throw new Error('No active subscription');
  
  // Cancel at period end (Stripe)
  await stripe.subscriptions.update(user.subscriptionId, {
    cancel_at_period_end: true,
  });
  
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: 'canceled' },
  });
}
```

**Check Free Tier Limit:**
```typescript
export async function canCreateEndpointForFree(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  
  // Subscription users get unlimited
  if (user?.subscriptionTier === 'PRO' || user?.subscriptionTier === 'TEAM') {
    return false; // Not free tier, but unlimited
  }
  
  // Free tier: Check endpoint count
  const endpointCount = await prisma.endpoint.count({
    where: { userId },
  });
  
  return endpointCount < 4; // Free tier limit: 4 endpoints
}
```

---

### Action Sequence Recording

**Record Action Sequence During Capture:**
```typescript
export async function recordActionSequence(
  endpointId: string,
  apiCalls: ApiCall[]
) {
  // Build replayable sequence from captured API calls
  const sequence = apiCalls
    .filter(call => call.method === 'GET') // Only record read-only by default
    .map((call, index) => ({
      order: index + 1,
      method: call.method,
      url: call.url,
      headers: call.requestHeaders,
      body: call.requestBodyJson,
      delayAfter: index > 0 ? calculateDelay(apiCalls[index - 1], call) : 0,
    }));
  
  // Extract auth tokens (if Bearer token detected)
  const authTokens = extractAuthTokens(apiCalls);
  
  // Store baseline snapshots (current responses for comparison)
  const baselineSnapshots = await buildBaselineSnapshots(apiCalls);
  
  await prisma.actionSequence.upsert({
    where: { endpointId },
    create: {
      endpointId,
      sequence: sequence as any, // JSON field
      authTokens: authTokens as any,
      baselineSnapshots: baselineSnapshots as any,
    },
    update: {
      sequence: sequence as any,
      authTokens: authTokens as any,
      baselineSnapshots: baselineSnapshots as any,
    },
  });
}

function calculateDelay(call1: ApiCall, call2: ApiCall): number {
  // Calculate delay based on actual timing between calls
  const delay = call2.timestamp.getTime() - call1.timestamp.getTime();
  return Math.max(0, Math.min(delay, 5000)); // Cap at 5 seconds
}

function extractAuthTokens(apiCalls: ApiCall[]): any {
  // Extract Bearer tokens from Authorization headers
  const authHeaders = apiCalls
    .map(call => call.requestHeaders?.['authorization'] || call.requestHeaders?.['Authorization'])
    .filter(Boolean);
  
  const bearerToken = authHeaders.find(h => h?.startsWith('Bearer '));
  if (!bearerToken) return null;
  
  return {
    type: 'Bearer',
    token: bearerToken.replace('Bearer ', ''),
    // Store encrypted or reference to refresh token if available
  };
}
```

---

### Automated Replay Engine

**Replay Action Sequence:**
```typescript
export async function replayActionSequence(endpointId: string) {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    include: { actionSequence: true },
  });
  
  if (!endpoint?.actionSequence) {
    throw new Error('Action sequence not found');
  }
  
  const { sequence, authTokens } = endpoint.actionSequence;
  const results = [];
  
  // Refresh auth token if expired
  let currentToken = await refreshAuthTokenIfNeeded(authTokens);
  
  // Replay each action in sequence
  for (const action of sequence as any[]) {
    await new Promise(resolve => setTimeout(resolve, action.delayAfter || 0));
    
    const response = await fetch(action.url, {
      method: action.method,
      headers: {
        ...action.headers,
        Authorization: `Bearer ${currentToken}`,
      },
      body: action.body ? JSON.stringify(action.body) : undefined,
    });
    
    const responseData = await response.json();
    
    results.push({
      order: action.order,
      url: action.url,
      method: action.method,
      status: response.status,
      response: responseData,
      timestamp: new Date(),
    });
  }
  
  // Detect changes
  await detectChanges(endpointId, results);
  
  // Update last replay time
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: { lastReplayAt: new Date() },
  });
  
  return results;
}

async function detectChanges(endpointId: string, newResults: any[]) {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    include: { actionSequence: { select: { baselineSnapshots: true } } },
  });
  
  const baseline = endpoint?.actionSequence?.baselineSnapshots as any;
  if (!baseline) return;
  
  for (const result of newResults) {
    const baselineResponse = baseline[result.url];
    if (!baselineResponse) {
      // New endpoint discovered
      await prisma.apiChange.create({
        data: {
          endpointId,
          changeType: 'NEW_ENDPOINT',
          changeDescription: `New endpoint discovered: ${result.method} ${result.url}`,
          afterSnapshot: result.response,
        },
      });
      continue;
    }
    
    // Compare schemas
    const schemaDiff = compareSchemas(baselineResponse, result.response);
    if (schemaDiff.hasChanges) {
      await prisma.apiChange.create({
        data: {
          endpointId,
          changeType: 'SCHEMA_CHANGED',
          changeDescription: schemaDiff.description,
          beforeSnapshot: { schema: inferSchema(baselineResponse) },
          afterSnapshot: { schema: inferSchema(result.response) },
          diff: schemaDiff.diff,
        },
      });
    }
  }
}
```

**Scheduled Replay (Cron Job):**
```typescript
// lib/jobs/replay-monitoring.ts
import { Queue } from 'bullmq';

const replayQueue = new Queue('replay-monitoring', {
  connection: { host: process.env.REDIS_URL },
});

// Cron job: Run daily for all endpoints with monitoring enabled
export async function scheduleReplayJobs() {
  const endpoints = await prisma.endpoint.findMany({
    where: {
      status: 'MONITORING',
      monitoringEnabled: true,
    },
  });
  
  for (const endpoint of endpoints) {
    const frequency = endpoint.monitoringFrequency || 'daily';
    const shouldRun = shouldRunReplay(endpoint, frequency);
    
    if (shouldRun) {
      await replayQueue.add('replay-sequence', {
        endpointId: endpoint.id,
      });
    }
  }
}

function shouldRunReplay(endpoint: Endpoint, frequency: string): boolean {
  if (!endpoint.lastReplayAt) return true;
  
  const now = new Date();
  const lastReplay = endpoint.lastReplayAt;
  const hoursSinceLastReplay = (now.getTime() - lastReplay.getTime()) / (1000 * 60 * 60);
  
  switch (frequency) {
    case 'daily':
      return hoursSinceLastReplay >= 24;
    case 'weekly':
      return hoursSinceLastReplay >= 168; // 7 days
    case 'monthly':
      return hoursSinceLastReplay >= 720; // 30 days
    default:
      return false;
  }
}
```

---

### Public Documentation Sharing

**Toggle Public/Private:**
```typescript
export async function togglePublicDocumentation(
  endpointId: string,
  userId: string,
  isPublic: boolean,
  slug?: string
) {
  // Verify ownership
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { userId: true },
  });
  
  if (endpoint?.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Generate slug if not provided
  let finalSlug = slug;
  if (isPublic && !slug) {
    finalSlug = generateSlug(endpointId);
  }
  
  // Check slug uniqueness if custom slug provided
  if (slug && isPublic) {
    const existing = await prisma.endpoint.findFirst({
      where: {
        slug,
        id: { not: endpointId },
        isPublic: true,
      },
    });
    if (existing) {
      throw new Error('Slug already in use');
    }
  }
  
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: {
      isPublic,
      slug: isPublic ? finalSlug : null,
    },
  });
  
  return {
    publicUrl: `/docs/public/${endpointId}`,
    slugUrl: finalSlug ? `/docs/${userId}/${finalSlug}` : null,
  };
}

function generateSlug(endpointId: string): string {
  // Generate URL-friendly slug from endpoint ID
  return endpointId.slice(0, 8);
}
```

**View Public Documentation:**
```typescript
export async function getPublicDocumentation(endpointId: string) {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId, isPublic: true },
    include: {
      discoveredEndpoints: {
        include: {
          endpointDocs: true,
        },
      },
      user: {
        select: {
          username: true,
        },
      },
    },
  });
  
  if (!endpoint) {
    throw new Error('Documentation not found or not public');
  }
  
  return {
    endpoint: {
      id: endpoint.id,
      name: endpoint.name,
      createdAt: endpoint.createdAt,
      owner: {
        username: endpoint.user.username,
      },
    },
    discoveredEndpoints: endpoint.discoveredEndpoints.map(de => ({
      pattern: de.pattern,
      methods: de.methods,
      documentation: de.endpointDocs.map(doc => ({
        markdown: doc.markdown,
        openApiSpec: doc.openApiSpec,
        typescriptTypes: doc.typescriptTypes,
      })),
    })),
  };
}
```

---

### Endpoint Processing (Documentation Generation)

**Process Endpoint:**
```typescript
export async function processEndpoint(endpointId: string) {
  // 1. Validate endpoint has API calls
  const apiCallCount = await prisma.apiCall.count({
    where: { endpointId },
  });
  
  if (apiCallCount === 0) {
    throw new Error('No API calls captured');
  }
  
  // 2. Update status to PROCESSING
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: { status: 'PROCESSING', processedAt: new Date() },
  });
  
  // 3. Analyze API calls (programmatic extraction)
  const apiCalls = await prisma.apiCall.findMany({
    where: { endpointId },
    orderBy: { timestamp: 'asc' },
  });
  
  const discoveredEndpoints = await analyzeApiCalls(apiCalls);
  
  // 4. Generate AI descriptions for each discovered endpoint
  for (const discovered of discoveredEndpoints) {
    const description = await generateAIDescription(discovered);
    
    const discoveredEndpoint = await prisma.discoveredEndpoint.create({
      data: {
        endpointId,
        ...discovered,
        description,
      },
    });
    
    // 5. Generate documentation
    const markdown = await generateMarkdownDocumentation(discoveredEndpoint);
    
    await prisma.endpointDocumentation.create({
      data: {
        endpointId,
        discoveredEndpointId: discoveredEndpoint.id,
        markdown,
      },
    });
  }
  
  // 6. Update status to COMPLETE
  await prisma.endpoint.update({
    where: { id: endpointId },
    data: { status: 'COMPLETE' },
  });
  
  // Note: Proxy URL no longer works after status is PROCESSING/COMPLETE
}
```

### Export Functionality

**CSV Export:**
```typescript
export async function exportToCSV(endpointId: string, userId: string): Promise<string> {
  // Verify ownership
  const isOwner = await checkEndpointOwnership(endpointId, userId);
  if (!isOwner) throw new Error('Unauthorized');
  
  // Get API calls
  const apiCalls = await prisma.apiCall.findMany({
    where: { endpointId },
    orderBy: { timestamp: 'asc' },
  });
  
  // Generate CSV
  const csv = [
    'timestamp,method,url,endpoint_pattern,status_code,duration_ms',
    ...apiCalls.map(call => 
      `${call.timestamp},${call.method},${call.url},${call.endpointPattern || ''},${call.responseStatus || ''},${call.duration || ''}`
    ),
  ].join('\n');
  
  return csv;
}
```

**ZIP of MD Files:**
```typescript
import JSZip from 'jszip';

export async function exportToZip(endpointId: string, userId: string): Promise<Buffer> {
  // Verify ownership
  const isOwner = await checkEndpointOwnership(endpointId, userId);
  if (!isOwner) throw new Error('Unauthorized');
  
  // Get documentation
  const docs = await prisma.endpointDocumentation.findMany({
    where: { endpointId },
    include: { endpoint: true },
  });
  
  // Create ZIP
  const zip = new JSZip();
  docs.forEach(doc => {
    zip.file(`${doc.discoveredEndpointId}.md`, doc.markdown);
  });
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}
```

**Printable View:**
```typescript
// Server-side rendered page optimized for printing
// app/(dashboard)/endpoints/[id]/export/printable/page.tsx
export default async function PrintablePage({ params }: { params: { id: string } }) {
  // Get endpoint and verify ownership
  // Render print-optimized HTML with all documentation
}
```

### Dark/Light Mode

**Theme Provider:**
```typescript
// lib/theme/provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark'); // Default: dark
  
  useEffect(() => {
    // Load from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme || 'dark';
    setThemeState(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Theme Toggle Component:**
```typescript
// components/ui/theme-toggle.tsx
'use client';

import { useTheme } from '@/hooks/useTheme';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}
```

**Login Page Demo User Selector:**
```typescript
// components/auth/DemoUserSelector.tsx
'use client';

export function DemoUserSelector({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  const demoUsers = [
    { email: 'demo1@example.com', username: 'demo1', password: 'demo123' },
    { email: 'demo2@example.com', username: 'demo2', password: 'demo123' },
    { email: 'demo3@example.com', username: 'demo3', password: 'demo123' },
  ];
  
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">Or use a demo account:</p>
      {demoUsers.map(user => (
        <button
          key={user.email}
          onClick={() => onSelect(user.email, user.password)}
          className="w-full text-left p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div className="font-medium">{user.username}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </button>
      ))}
    </div>
  );
}
```

## Deployment

### Production Build

**Build Application:**
```bash
npm run build
```

**Start Production Server:**
```bash
npm start
```

### Environment Setup

**Production Environment Variables:**
- Set all required variables
- Use secure JWT secret
- Configure production database URL
- Set production domain for `NEXT_PUBLIC_APP_URL`

### Database Migration

**Run Migrations:**
```bash
npx prisma migrate deploy
```

### Process Management

**Using PM2:**
```bash
pm2 start npm --name "api-discovery" -- start
pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api-discovery.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/TLS

**Using Let's Encrypt:**
```bash
certbot --nginx -d api-discovery.dev
```

## Monitoring & Logging

### Logging

**Structured Logging:**
```typescript
import logger from '@/lib/utils/logger';

logger.info('Session created', { sessionId, userId });
logger.error('Analysis failed', { sessionId, error });
```

### Monitoring

**Health Check Endpoint:**
```typescript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: await checkDatabase(),
  });
}
```

## Troubleshooting

### Common Issues

**Database Connection:**
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is running
- Check firewall/network settings

**JWT Errors:**
- Verify `JWT_SECRET` is set
- Check token expiration
- Verify token format

**Proxy Issues:**
- Check target URL is accessible
- Verify URL validation isn't blocking
- Check proxy timeout settings

**Analysis Failures:**
- Verify session has captured calls
- Check if analysis is in progress (status: ANALYZING)
- Verify programmatic extraction is working (all API details gathered programmatically)

**Documentation Generation:**
- Check `GROQ_API_KEY` is set (required for quality descriptions)
- If AI unavailable, documentation will use programmatic-only descriptions (degraded but functional)
- All API details are still available (gathered programmatically)

## Additional Resources

**Next.js Documentation:**
- https://nextjs.org/docs

**Prisma Documentation:**
- https://www.prisma.io/docs

**TypeScript Documentation:**
- https://www.typescriptlang.org/docs

