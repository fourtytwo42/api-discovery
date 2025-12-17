# API Discovery Platform - Complete Design Decisions

**All architectural, technical, and implementation decisions made for this project. No ambiguity - every choice is explicit.**

## Architecture Decisions

### Authentication
**Decision:** JWT tokens with 3-day expiration, HTTP-only cookies

**Rationale:**
- Stateless (no server-side sessions)
- Scalable (works across multiple servers)
- Industry standard
- Your pattern from other projects (3-day expiration)
- Secure token storage (HTTP-only cookies)

**Storage Method:** HTTP-only cookies named `auth_token`

**Cookie Settings:**
- `httpOnly: true` (prevents XSS)
- `secure: true` (production only, HTTPS required)
- `sameSite: 'lax'` (CSRF protection)

**Token Structure:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string; // "USER", "ADMIN", "DEMO"
  iat: number;
  exp: number; // 3 days from issuance
}
```

**Library:** `jsonwebtoken` 9.x

**Password Hashing:** bcryptjs 2.x with 10 salt rounds

**Alternatives Considered:**
- Session-based auth (rejected - not scalable, requires session storage)
- OAuth2 tokens (rejected - JWT simpler for our use case)
- No auth (rejected - need user accounts for per-user endpoints)

**Trade-offs:**
- Users need to re-authenticate every 3 days, but tokens are more secure and simpler

---

## Technology Stack Decisions

### Frontend Framework
**Decision:** Next.js 16.x with App Router

**Rationale:**
- Latest stable version (your pattern: always use latest stable)
- App Router provides better performance and developer experience
- Built-in API routes for full-stack functionality
- Server Components for efficient rendering
- Unified framework (frontend + backend in one)

**Alternatives Considered:**
- Express.js (rejected - would need separate frontend)
- Remix (rejected - Next.js more mature, better ecosystem)
- SvelteKit (rejected - smaller community, prefer React)

**Trade-offs:**
- Some learning curve for App Router, but worth it for performance
- Next.js adds some overhead, but unified stack simplifies deployment

---

### UI Library
**Decision:** React 19.x

**Rationale:**
- Latest stable version
- Standard for Next.js
- Large ecosystem and community
- Server Components support

**Version:** 19.x (latest stable)

---

### Language
**Decision:** TypeScript 5.x

**Rationale:**
- Type safety for complex application
- Better IDE support
- Catches errors at compile time
- Matches all your other projects

**Version:** 5.x (latest stable)

**Configuration:** Strict mode enabled, no `any` types allowed

---

### Styling
**Decision:** Tailwind CSS 4.x

**Rationale:**
- Utility-first CSS framework
- Rapid UI development
- Consistent design system
- Small bundle size (purging unused styles)
- Excellent dark mode support

**Alternatives Considered:**
- Custom CSS (rejected - too verbose, slower development)
- CSS Modules (rejected - Tailwind faster for utility-first approach)
- Styled Components (rejected - runtime overhead)

**Trade-offs:**
- HTML can get verbose with utility classes, but productivity gains are significant

---

### State Management
**Decision:** Zustand 4.x for client state, React Context for auth state

**Rationale:**
- Zustand: Simple, lightweight, no boilerplate
- React Context: Good for auth (needs to be widely available)
- Avoids Redux complexity
- Your pattern from other projects

**Alternatives Considered:**
- Redux Toolkit (rejected - too much boilerplate for this app)
- Jotai (rejected - Zustand simpler)

---

### Forms
**Decision:** React Hook Form 7.x + Zod 3.x for validation

**Rationale:**
- React Hook Form: Best performance, minimal re-renders
- Zod: Type-safe validation, schema inference
- Works well together
- Your pattern from other projects

---

### Icons
**Decision:** Heroicons (`@heroicons/react`)

**Rationale:**
- Modern, clean icons
- Your pattern from other projects
- Good React support
- Consistent style

---

### Database
**Decision:** PostgreSQL 16.x

**Rationale:**
- Latest stable version
- Relational data (users, sessions, API calls, endpoints)
- ACID guarantees for data integrity
- JSONB support for flexible schemas (request/response bodies)
- Excellent Prisma support

**Alternatives Considered:**
- MongoDB (rejected - need relational integrity, complex queries)
- SQLite (rejected - need multi-user concurrent access)

**Trade-offs:**
- Requires more setup than NoSQL, but provides better data integrity and querying

---

### ORM
**Decision:** Prisma 7.x

**Rationale:**
- Latest stable version
- Excellent TypeScript support
- Built-in migrations
- Type-safe queries
- Your pattern from all recent projects

**Alternatives Considered:**
- TypeORM (rejected - Prisma has better DX)
- Drizzle (rejected - Prisma more mature, better ecosystem)

---

---

### Proxy Implementation
**Decision:** http-proxy-middleware 2.x with Next.js API Routes

**Rationale:**
- Mature, battle-tested library
- Works well with Next.js
- Supports all HTTP methods
- Good error handling
- Interception hooks available

**Alternatives Considered:**
- Custom proxy implementation (rejected - too complex, error-prone)
- Nginx reverse proxy (rejected - need programmatic control, want in-app)

**Trade-offs:**
- Adds dependency, but saves significant development time

---

### AI Provider (Required for Documentation Descriptions)
**Decision:** Groq GPT OSS 20B for generating natural language descriptions

**Rationale:**
- **API Details Gathering:** 100% programmatic (no AI needed - deterministic, faster, more accurate)
- **Documentation Descriptions:** AI required for quality (programmatic descriptions are too generic/technical)
- **Why Groq:** Fast, cost-effective, OpenAI-compatible API
- **Separation of Concerns:** Gathering is deterministic (programmatic perfect), descriptions need natural language (AI excels)

**Model Information:**
- **Model Name:** `openai/gpt-oss-20b` (exact identifier)
- **API Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Context Window:** 131,072 tokens
- **Max Output Tokens:** 65,536
- **Capabilities:** Tool calling, streaming, OpenAI-compatible

**Configuration:**
- Temperature: 0.3 (deterministic, focused output)
- Max tokens: 2000 (sufficient for descriptions)
- Tool calling: Supported (OpenAI-compatible format)

**What AI Generates:**
- Endpoint descriptions ("This endpoint retrieves user information by ID")
- Parameter descriptions ("The user ID in the URL path")
- Field descriptions ("The user's email address")

**What AI Does NOT Do:**
- Does NOT gather API details (all programmatic)
- Does NOT infer schemas (all programmatic from examples)
- Does NOT detect patterns (all programmatic)

**Fallback Behavior:**
- If AI unavailable: Uses programmatic descriptions (degraded quality but functional)
- Documentation structure remains complete
- All API details still available (gathered programmatically)

**Alternatives Considered:**
- OpenAI GPT-4 (rejected - too expensive, Groq sufficient for descriptions)
- Claude (rejected - Groq faster and cheaper)
- No AI (rejected - descriptions need natural language, too generic without AI)
- AI for gathering (rejected - programmatic is deterministic, faster, more accurate)

**Trade-offs:**
- Requires Groq API key, but descriptions are much better quality with AI
- Can fallback to programmatic-only if AI unavailable (degraded but functional)

---

### Queue System
**Decision:** BullMQ with Redis (preferred), fallback to in-memory queue

**Rationale:**
- BullMQ: Mature, feature-rich job queue
- Redis: Persistent, scalable, can be shared across instances
- In-memory fallback: Works without Redis for development/simple deployments

**Use Cases:**
- Background analysis jobs
- Documentation generation
- Data cleanup jobs

**Alternatives Considered:**
- Database-based queue (rejected - less efficient, harder to scale)
- Simple array/queue (rejected - no persistence, lost on restart)

**Trade-offs:**
- Requires Redis for production, but provides reliability and scalability

---

## Architecture Decisions

### Per-User Endpoints Model
**Decision:** Users create their own endpoints with destination URLs

**Rationale:**
- Each user manages their own endpoints
- Clear ownership and authorization
- Users control their own proxy endpoints
- Easy to track usage per user

**Endpoint Structure:**
- User creates endpoint with name and destination URL
- System generates endpoint ID and proxy URL: `/proxy/{endpoint-id}`
- User routes traffic through their proxy URL
- Results are private (only endpoint owner can view)

**Authorization:**
- Only endpoint owner can view results
- Authorization checks on all result endpoints
- Proxy URLs are public (anyone can use), but results are private

**Alternatives Considered:**
- Public sessions (rejected - need user accounts for private results)
- Shared endpoints (rejected - privacy/security concerns)

**Trade-offs:**
- Requires authentication (more complex)
- Better privacy and security (users control their data)

---

### UI Theme
**Decision:** Dark mode by default, light/dark mode toggle

**Rationale:**
- Dark mode preferred by many developers
- Reduces eye strain
- Modern, professional appearance
- User preference stored in localStorage

**Implementation:**
- Tailwind CSS dark mode (class-based)
- Theme toggle component (sun/moon icon)
- Default: dark mode
- Persist preference in localStorage

**Alternatives Considered:**
- Light mode default (rejected - dark mode preferred by developers)
- System preference (rejected - explicit dark default preferred)

**Trade-offs:**
- Need to design for both themes
- Better UX with user choice

---

### Demo Accounts
**Decision:** Pre-created demo accounts with seed script

**Rationale:**
- Easy exploration for new users
- No registration required to try platform
- Demo accounts have sample data

**Implementation:**
- Seed script creates 3 demo users
- Demo users have sample endpoints and data
- Login page shows demo users (click to auto-fill)
- Demo accounts marked with `isDemo: true` flag

**Demo Users:**
- demo1@example.com / demo123
- demo2@example.com / demo123
- demo3@example.com / demo123

**Alternatives Considered:**
- No demo accounts (rejected - harder for users to try platform)
- Guest mode (rejected - demo accounts provide better experience)

---

### Credit System & Pricing
**Decision:** Credit-based pricing model (100 credits for $20, 25 credits per URL)

**Rationale:**
- Simple, predictable pricing
- 25 credits per URL = 4 URLs per $20 purchase
- Clear value proposition
- Easy to understand for users

**Credit Costs:**
- Endpoint creation: 25 credits (fixed)
- Credits per purchase: 100 credits (fixed)
- Price per purchase: $20.00 (admin-configurable)

**Credit Transactions:**
- All credit changes tracked in CreditTransaction table
- Types: PURCHASE, ENDPOINT, ADMIN_ADJUST, REFUND
- Balance tracking (balanceAfter field)
- Audit logged

**Free Tier:**
- New users receive 100 free credits on signup (4 free endpoints)
- Demo accounts also receive 100 free credits
- Allows users to try platform before paying
- Standard freemium SaaS model

**Alternatives Considered:**
- Per-endpoint pricing (rejected - credits more flexible)
- No free tier (rejected - high friction, low conversion without free trial)
- Subscription-only (rejected - credits provide flexibility for occasional users)

---

### Payment System
**Decision:** Stripe and PayPal support, sandbox mode by default, admin-configurable

**Rationale:**
- Industry-standard payment providers
- Both popular, cover different user preferences
- Sandbox mode allows testing without real payments
- Admin can configure and enable/disable providers
- Can go live when admin has proper credentials

**Sandbox Mode:**
- Default: Enabled
- Any credit card works (no verification)
- Demo card displayed on purchase page
- Mock payment processing
- Safe for testing

**Live Mode:**
- Admin configures Stripe/PayPal credentials
- Admin toggles sandbox mode off
- Real payments processed
- Webhooks configured for payment confirmation

**Payment Flow:**
1. User initiates purchase (100 credits for $20)
2. Payment created in database (status: PENDING)
3. Payment intent/order created with provider
4. User completes payment on checkout page
5. Webhook confirms payment
6. Credits added to user account
7. Credit transaction created
8. Audit log entry created

**Subscription Model (NEW):**
- **Free Tier:** 4 endpoints free (100 credits on signup), public sharing enabled, community support
- **Pro Tier ($15/month):** Unlimited endpoints, continuous monitoring, change detection, private docs, priority support, advanced analytics
- **Team Tier ($50/month):** Everything in Pro + team collaboration, shared endpoints, admin controls, API access
- **Credit Packs:** $20 for 100 credits (one-time purchase, for occasional users, can be used alongside subscriptions)
- Subscriptions stored on User model (subscriptionTier, subscriptionId, subscriptionStatus fields)
- Subscription management via API endpoints

**Rationale:**
- Fits different usage patterns (occasional vs. power users)
- Predictable revenue (subscriptions)
- Higher LTV (subscription customers)
- Standard SaaS freemium model
- Credits still available for occasional users

**Alternatives Considered:**
- Stripe only (rejected - PayPal popular, want both)
- PayPal only (rejected - Stripe more developer-friendly, want both)
- Crypto payments (rejected - adds complexity, not needed for MVP)
- Credit-only model (rejected - subscriptions better for frequent users, adds flexibility)

---

### Admin Panel
**Decision:** Full admin functionality with user management, payment settings, audit log

**Rationale:**
- Need admin control over system
- User management required (support, troubleshooting)
- Payment configuration needs admin interface
- Audit log viewing needs admin interface

**Admin Features:**
- Dashboard with system stats
- User management (view, edit, suspend, adjust credits)
- Payment provider configuration (Stripe/PayPal, sandbox/live)
- Credit settings (credits per URL, price per purchase)
- Audit log viewing and export
- System settings

**Authorization:**
- Role-based: Only users with role="ADMIN" can access
- All admin actions logged in audit log
- Admin actions tracked with admin user ID

**Alternatives Considered:**
- No admin panel (rejected - need admin control)
- Minimal admin (rejected - need full functionality)

---

### Audit Logging
**Decision:** Full audit logging - track all user actions, admin actions, API operations

**Rationale:**
- Full auditability for security and compliance
- Track what users are doing
- Track admin actions
- Track all API operations
- Debugging and troubleshooting

**Actions Tracked:**
- User actions: login, logout, register, endpoint creation/deletion, credit purchase
- Admin actions: user updates, settings changes, credit adjustments
- System actions: payment processing, documentation generation
- All API operations automatically logged

**Audit Log Fields:**
- User ID and email (denormalized for deleted users)
- Action type
- Resource type and ID
- Details (JSON for flexibility)
- IP address
- User agent
- Timestamp

**Audit Log Access:**
- Admin-only access
- Filterable by user, action, resource, date range
- Exportable as CSV/JSON

**Alternatives Considered:**
- Minimal logging (rejected - need full auditability)
- No logging (rejected - security/compliance requirement)

---

### Endpoint Lifecycle
**Decision:** Create → Active (capture) → Review → Process (AI docs) → Monitoring OR Complete

**Rationale:**
- Clear lifecycle stages
- User can review captured data before processing
- User can choose to keep proxy active for monitoring (new)
- Enables continuous monitoring and change detection
- Action sequence automatically recorded during capture for replay

**Stages:**
1. **ACTIVE:** Endpoint created, proxy URL works, capturing API calls (action sequence being recorded)
2. **REVIEW:** User paused capture, reviewing captured data (action sequence recorded)
3. **PROCESSING:** User triggered documentation generation, AI processing in progress
4. **MONITORING:** Documentation generated, proxy active, monitoring enabled (replays action sequence periodically)
5. **COMPLETE:** Documentation generated, proxy removed, using stored data only (user chose not to enable monitoring)

**User Flow:**
1. User creates endpoint (25 credits deducted, or free if within free tier limit of 4 endpoints)
2. User receives proxy URL
3. User uses proxy URL, APIs captured (action sequence automatically recorded)
4. User views captured API calls in dashboard
5. User clicks "Review API Data" → Preview modal (optional step)
6. User confirms and clicks "Generate Documentation"
7. User chooses: "Keep Monitoring" or "Finish" (removes proxy)
8. Status changes to PROCESSING
9. Background job: AI generates documentation, action sequence saved
10. Status changes to MONITORING (if keepMonitoring=true) or COMPLETE (if keepMonitoring=false)
11. If MONITORING: System automatically replays action sequence periodically, detects changes
12. If COMPLETE: Proxy URL no longer works (404)
11. User views documentation from stored data

**Continuous Monitoring (NEW):**
- Action sequence automatically recorded during initial capture
- User can choose to keep proxy active after documentation generation (MONITORING state)
- Automated replay: System replays recorded action sequence periodically (daily/weekly/monthly, user configurable)
- Change detection: Compares replayed responses to baseline, detects schema changes, new endpoints, removed endpoints
- Notifications: Email/webhook alerts on API changes
- Change history: Timeline of API changes with diffs

**Recording Format:**
- Store action sequence as JSON array of API call templates
- Includes: request order, method, URL, headers, body, timing delays
- Store auth tokens/sessions (encrypted) for replay
- Store baseline responses for comparison

**Replay Process:**
- Check auth token expiration, refresh if needed (prompt user if refresh fails)
- Execute API calls in sequence with stored headers/body
- Apply delays between requests (if configured)
- Compare response schemas to baseline
- Detect changes: schema differences, new endpoints, removed endpoints
- Generate change report
- Send notifications if significant changes detected

**Rationale:**
- APIs change frequently - documentation needs updates
- Automated replay eliminates user effort (set it and forget it)
- Captures same usage patterns as initial discovery
- Proactive monitoring is valuable
- Continuous value proposition (improves retention)

**Limitations & Handling:**
- Auth token expiration: Store refresh tokens, auto-refresh, prompt user if needed
- Session expiration: Handle cookie-based sessions, refresh if needed
- Dynamic data: Compare schema structure, not values (timestamps, IDs don't affect comparison)
- Side effects: Only replay GET/read-only endpoints by default (user can configure)
- Rate limiting: Add delays between requests, respect rate limit headers

**Alternatives Considered:**
- Always keep proxy active (rejected - removes proxy after processing for clarity)
- No review step (rejected - users should review before processing)
- Manual replay only (rejected - automated replay provides better value, user can still trigger manually)
- No monitoring (rejected - missing key value proposition, poor retention)

---

### Contact Page
**Decision:** External contact page at https://studio42.dev/contact?source=api-discovery

**Rationale:**
- Centralized contact system for Studio42.dev products
- Source parameter identifies traffic source
- No need for separate contact page in this app
- Links from landing page and footer redirect to external page

**Implementation:**
- All "Contact" links/buttons redirect to external URL
- Source parameter added: `?source=api-discovery`
- No contact form in this application

**Alternatives Considered:**
- Internal contact page (rejected - centralized contact better)

---

### Export Functionality
**Decision:** CSV export, printable view, ZIP of MD files

**Rationale:**
- Multiple export formats meet different needs
- CSV for data analysis
- Printable for documentation
- ZIP of MD files for offline documentation

**Implementation:**
- CSV: All API calls as CSV file
- Printable: Server-rendered HTML optimized for printing
- ZIP: One Markdown file per discovered endpoint

**Alternatives Considered:**
- Single format (rejected - multiple formats more useful)
- JSON export (rejected - CSV and MD more practical)

---

### Proxy Architecture
**Decision:** Proxy-based approach (user routes traffic through their endpoint URL)

**Rationale:**
- Works with any web application
- No code changes required
- Transparent to user
- Captures all network traffic
- Scalable (can run multiple instances)

**Alternatives Considered:**
- Browser extension (rejected - requires installation, platform-specific)
- Playwright with user interaction (rejected - more complex, resource-intensive)
- Network proxy (rejected - requires system-level configuration)

**Trade-offs:**
- Users must use proxy URL (slight UX impact), but no installation required

---

### Capture Mechanism
**Decision:** Intercept at proxy level (before forwarding request, after receiving response)

**Rationale:**
- Captures everything (all HTTP methods, headers, bodies)
- No browser limitations
- Works with any client (browser, mobile, API clients)
- Reliable and consistent

**Storage:**
- Store immediately (async, non-blocking)
- Database transactions for consistency
- Stream large payloads (don't block proxy)

**Alternatives Considered:**
- Browser extension injection (rejected - requires extension, platform-specific)
- Network monitoring (rejected - requires elevated permissions)

---

### Analysis Pipeline
**Decision:** 100% programmatic extraction for API details, AI for documentation descriptions only

**Rationale:**
- **Gathering is Deterministic:** All API details (endpoints, schemas, patterns) can be extracted programmatically from HTTP traffic
- **Why Programmatic Works:** API calls have structured data (methods, URLs, JSON bodies, headers) that we can parse
- **AI for Descriptions Only:** Natural language descriptions require AI (programmatic descriptions too generic)
- **Best Practice:** Use the right tool for each job - programmatic for structure, AI for natural language

**Programmatic Extraction (100% of API Details):**
- Endpoint pattern extraction (URL normalization: `/api/users/123` → `/api/users/:id`)
- HTTP method detection (GET, POST, PUT, DELETE, etc.)
- Schema inference from JSON examples (types, arrays, objects, nested structures, unions, enums)
- Pattern detection (authentication, pagination, CORS)
- WebSocket detection (Upgrade headers, ws:// wss:// protocols)
- GraphQL detection (POST requests with GraphQL query body)
- Header analysis (required headers, CORS headers)
- Multiple API type support (REST, GraphQL, WebSocket, gRPC, SOAP)
- Request/response structure (all from captured HTTP traffic)

**AI for Documentation (Required for Quality):**
- Natural language endpoint descriptions
- Parameter descriptions
- Field descriptions

**What AI Does NOT Do:**
- Does NOT gather API details (all programmatic)
- Does NOT infer schemas (all programmatic from examples)
- Does NOT detect patterns (all programmatic)

**Alternatives Considered:**
- AI for gathering (rejected - programmatic is deterministic, faster, more accurate)
- No AI for documentation (rejected - descriptions need natural language, too generic without AI)

**Trade-offs:**
- Requires Groq API key for quality documentation
- Can fallback to programmatic-only descriptions if AI unavailable (degraded but functional)

---

### Documentation Generation
**Decision:** Generate multiple formats programmatically: Markdown (per endpoint), OpenAPI 3.1, GraphQL schema, TypeScript types

**Rationale:**
- **Markdown:** Primary format - one doc per endpoint, human-readable
- **OpenAPI:** Industry standard (if REST APIs detected)
- **GraphQL Schema:** If GraphQL detected
- **TypeScript Types:** Developer-friendly type definitions
- **Programmatic Generation:** Fast, reliable, no AI dependency

**Documentation Content (Programmatic):**
- Endpoint pattern and methods
- Request schema (JSON Schema inferred from examples)
- Response schemas by status code
- Required headers (detected from captured calls)
- CORS configuration (from response headers)
- Authentication requirements (detected from headers)
- Example requests/responses (from captured calls)
- WebSocket message formats (if WebSocket detected)
- GraphQL query/mutation schemas (if GraphQL detected)

**Generation Timing:**
- Automatic after analysis completes
- Immediate availability (no background job needed)
- Store in database for quick access
- Public URLs for sharing

**Format Structure:**
- One markdown document per endpoint
- Index markdown listing all endpoints
- OpenAPI spec (if REST detected)
- GraphQL schema (if GraphQL detected)
- TypeScript type definitions

**Alternatives Considered:**
- AI-generated documentation (rejected - programmatic sufficient, simpler)
- Single format (rejected - multiple formats increase usefulness)

---

### Data Storage Strategy
**Decision:** PostgreSQL with JSONB for flexible schemas

**Rationale:**
- Relational data: Users, sessions, endpoints (need relationships)
- JSONB: Request/response bodies vary widely, JSONB handles this
- Query performance: Can query JSONB fields efficiently
- ACID guarantees: Important for user data, sessions

**Storage Approach:**
- Structured fields: method, URL, status, timestamp (relational columns)
- Flexible data: request/response bodies, headers, schemas (JSONB)
- Balance: Structure where possible, flexibility where needed

**Alternatives Considered:**
- Pure JSON storage (rejected - can't query efficiently, no relationships)
- Separate JSON files (rejected - no queries, harder to manage)

---

### Session Management
**Decision:** User-controlled recording (start/stop), real-time feedback via WebSocket

**Rationale:**
- User controls: Better UX, user decides when to stop
- Real-time feedback: Shows progress, keeps user engaged
- WebSocket: Efficient real-time updates

**Session States:**
- `ACTIVE`: Currently recording
- `STOPPED`: User stopped, ready for analysis
- `ANALYZING`: Analysis in progress
- `COMPLETE`: Documentation ready
- `ERROR`: Error occurred

**State Transitions:**
- ACTIVE → STOPPED (user action)
- STOPPED → ANALYZING (automatic, background job)
- ANALYZING → COMPLETE (analysis done)
- Any → ERROR (if error occurs)

**Alternatives Considered:**
- Auto-stop after timeout (rejected - user might need more time)
- Synchronous analysis (rejected - too slow, blocks user)

---

## Security Decisions

### SSRF Prevention
**Decision:** Validate target URLs before proxying (block localhost, private IPs, etc.)

**Rationale:**
- Critical security concern (SSRF attacks)
- Must prevent access to internal networks
- Whitelist/blacklist approach

**Validation Rules:**
- Must be valid HTTP/HTTPS URL
- Domain must not be localhost or 127.0.0.1
- Domain must not be private IP ranges (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
- No whitelist (allow any public HTTP/HTTPS URL)
- Fixed blacklist: localhost, 127.0.0.1, 0.0.0.0, and all private IP ranges (not configurable)

**Implementation:**
- URL parsing and validation
- IP address resolution and checking
- Blocked list checking

**Alternatives Considered:**
- Allow all URLs (rejected - security risk)
- Require domain verification (rejected - too restrictive for users)

---

### Sensitive Data Handling
**Decision:** No automatic filtering of sensitive data (capture and store everything as-is)

**Rationale:**
- Users choose what URL to proxy (they control what's captured)
- Users need to see auth flows and headers to document them properly
- Simplifies implementation (no filtering logic needed)
- Users can choose not to capture sensitive endpoints if needed

**Implementation:**
- No filtering settings
- Capture all request/response data as-is
- Store in database without modification

**Alternatives Considered:**
- Optional filtering (rejected - adds complexity, users control via URL selection)
- Always filter (rejected - breaks auth flow documentation)

---

### Rate Limiting
**Decision:** Different limits for different endpoint types

**Rationale:**
- Prevent abuse
- Protect resources
- Fair usage

**Limits:**
- Auth endpoints: 100 requests/minute per IP (10x for testing environment)
- Authenticated endpoints: 1000 requests/minute per user (10x for testing environment)
- Admin endpoints: 2000 requests/minute per user (10x for testing environment)
- Proxy endpoint: 10000 requests/minute per session (10x for testing environment)

**Implementation:**
- Redis-based rate limiting (use Redis for all deployments, single instance or multi-instance)
- Fallback to in-memory only for local development (if Redis unavailable)
- Production: Always use Redis for rate limiting

**Alternatives Considered:**
- Same limit for all (rejected - too restrictive or too permissive)
- No rate limiting (rejected - security risk)

---

## API Design Decisions

### API Versioning
**Decision:** `/api/v1/` prefix for all endpoints

**Rationale:**
- Industry standard approach
- Allows future versioning (v2, v3, etc.)
- Clear versioning in URLs

**Alternatives Considered:**
- No versioning (rejected - harder to change API later)
- Header-based versioning (rejected - less clear, harder to debug)

---

### Error Response Format
**Decision:** Consistent error format with error code, message, and optional details

**Rationale:**
- Consistent format across all endpoints
- Error codes for programmatic handling
- Details for debugging

**Format:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": { /* optional additional details */ }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid input
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

### Pagination
**Decision:** Offset-based pagination with limit and offset

**Rationale:**
- Simple and intuitive
- Works well for most use cases
- Easy to implement

**Default Values:**
- Limit: 20 (default), 100 (max)
- Offset: 0 (default)

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

**Alternatives Considered:**
- Cursor-based (rejected - more complex, not needed for our use case)
- Page-based (rejected - offset-based more flexible)

---

## Data Model Decisions

### Session ID Generation
**Decision:** Use Prisma `cuid()` for all IDs

**Rationale:**
- URL-safe (can be used in URLs)
- Sortable (chronological ordering)
- Collision-resistant
- Prisma default (consistent)

**Alternatives Considered:**
- UUID (rejected - not sortable, longer)
- Auto-increment integers (rejected - exposes user count, not URL-safe)

---

### Request/Response Body Storage
**Decision:** Store as string (raw) and JSONB (parsed) separately

**Rationale:**
- Raw: Original format (for exact replay)
- JSONB: Queryable, searchable (for analysis)
- Best of both worlds

**Storage Limits:**
- Max size: 10MB (configurable)
- Truncate if larger (store metadata even if truncated)
- Store both raw and parsed versions

**Alternatives Considered:**
- Only raw (rejected - can't query efficiently)
- Only parsed (rejected - loses original format)

---

### Endpoint Pattern Normalization
**Decision:** Convert `/api/users/123` to `/api/users/:id` pattern

**Rationale:**
- Groups similar endpoints together
- Standard REST pattern
- Easier to document

**Normalization Rules:**
- Numbers → `:id` or `:number`
- UUIDs → `:id`
- Alphanumeric → `:slug` or `:id`
- Path segments: Normalize to parameters

**Examples:**
- `/api/users/123` → `/api/users/:id`
- `/api/users/abc-def-123` (UUID) → `/api/users/:id`
- `/api/posts/hello-world` → `/api/posts/:slug`

**Alternatives Considered:**
- No normalization (rejected - too many similar endpoints)
- Full URL storage (rejected - doesn't group similar endpoints)

---

## Analysis Decisions

### Schema Inference Strategy
**Decision:** Multi-pass inference: Basic types → Structure → AI enhancement

**Rationale:**
- Programmatic: Fast, reliable (basic types, arrays, objects)
- AI: Handles complex cases (unions, enums, relationships)
- Incremental: Build up understanding

**Pass 1 (Programmatic):**
- Detect JSON types (string, number, boolean, null)
- Detect arrays and element types
- Detect nested objects
- Identify optional vs required (by presence across calls)

**Pass 2 (AI Enhancement):**
- Infer field meanings from names/context
- Detect enums (limited value sets)
- Handle union types (same field, different types)
- Identify relationships between fields
- Add descriptions

**Alternatives Considered:**
- AI-only (rejected - too expensive, slower)
- Programmatic-only (rejected - misses complex cases)

---

### Authentication Pattern Detection
**Decision:** Detect automatically by analyzing headers and patterns

**Rationale:**
- Important for documentation
- Can detect automatically
- User doesn't need to specify

**Detection Methods:**
- Check for `Authorization: Bearer` header
- Check for `X-API-Key` header
- Check for `Cookie` header with auth tokens
- Analyze which endpoints require auth (consistent pattern)

**Documentation:**
- Mark endpoints as `authRequired: true/false`
- Specify `authType: "Bearer" | "API-Key" | "Cookie"`

---

### Pagination Detection
**Decision:** Detect pagination patterns automatically

**Rationale:**
- Common pattern, should be documented
- Can detect from query parameters and responses

**Detection Methods:**
- Offset-based: `?offset=0&limit=10`
- Cursor-based: `?cursor=abc123`
- Page-based: `?page=1&per_page=10`
- Link headers: `Link: <next-url>`

**Documentation:**
- Mark `paginationType: "offset" | "cursor" | "page" | null`

---

## UI/UX Decisions

### Design System
**Decision:** Tailwind CSS with custom design tokens

**Rationale:**
- Tailwind provides base utilities
- Custom tokens for brand consistency
- Dark mode support (default dark, light mode toggle)

**Color Palette:**
- Primary: Indigo (#6366F1) - Not solid purple or blue, modern indigo
- Primary Dark: Indigo-600 (#4F46E5)
- Primary Light: Indigo-400 (#818CF8)
- Success: Emerald-500 (#10B981)
- Warning: Amber-500 (#F59E0B)
- Error: Red-500 (#EF4444)
- Info: Cyan-500 (#06B6D4)
- Background (Dark): Slate-900 (#0F172A)
- Background (Light): White (#FFFFFF)
- Surface (Dark): Slate-800 (#1E293B)
- Surface (Light): Slate-50 (#F8FAFC)

**Typography:**
- Font family: Inter (system font stack fallback)
- Headings: Bold, larger sizes
- Body: Regular weight, readable size

---

### Recording Interface
**Decision:** Show real-time statistics during recording

**Rationale:**
- User engagement
- Shows progress
- Demonstrates value

**Statistics Shown:**
- API calls captured count
- Endpoints discovered count
- Unique HTTP methods
- Errors count

**Display:**
- Floating panel or sidebar
- Updates in real-time via WebSocket
- Color-coded (green for success, red for errors)

---

### Documentation Viewer
**Decision:** View-only documentation browser (no interactive playground)

**Rationale:**
- Focus on documentation viewing and export
- Playground adds complexity (not in MVP scope)
- Markdown documentation is primary deliverable
- Users can test endpoints themselves using documentation

**Features:**
- Endpoint list with search/filter
- Endpoint detail pages (read-only)
- Schema viewers (JSON Schema visualization)
- Request/response examples (display only)
- Export options (CSV, printable, ZIP of MD files)
- No interactive playground (not in MVP)

---

## Deployment Decisions

### Hosting
**Decision:** Self-hosted on single VM (Ubuntu 22.04 LTS)

**Rationale:**
- PostgreSQL on same VM (simpler deployment)
- Full control over infrastructure
- Cost-effective (single server)
- No external dependencies

**Architecture:**
- Single Ubuntu 22.04 LTS VM
- Next.js app (PM2 process management)
- PostgreSQL 16 on same VM (localhost connection)
- Redis on same VM (localhost connection, for BullMQ)
- Nginx reverse proxy (SSL termination, static files, WebSocket support)

**Not Using:**
- Vercel (rejected - need PostgreSQL on same VM, Vercel requires external database)
- Separate database server (rejected - single VM simpler for MVP)
- Cloud managed databases (rejected - want PostgreSQL on VM)

---

### Process Management
**Decision:** PM2 for production self-hosted deployments

**Rationale:**
- Process monitoring and restart
- Log management
- Cluster mode support
- Your pattern from other projects

**Alternatives Considered:**
- systemd (rejected - PM2 easier for Node.js)
- Docker (rejected - adds complexity, PM2 sufficient)

---

### Reverse Proxy
**Decision:** Nginx for production self-hosted deployments

**Rationale:**
- SSL/TLS termination
- Rate limiting
- Static file serving
- WebSocket support
- Your pattern from other projects

**Alternatives Considered:**
- Caddy (rejected - Nginx more mature, better documentation)
- Traefik (rejected - overkill for single app)

---

## Access Model Decisions

### User Accounts & Authorization
**Decision:** User accounts with JWT authentication, owner-only result access

**Rationale:**
- Users need accounts to create endpoints
- Authorization ensures privacy (only owner sees results)
- Enables per-user features (dashboard, endpoint management)
- Better security (controlled access)

**Access Model:**
- Users create endpoints (with name and destination URL)
- Each endpoint has unique proxy URL
- Proxy URLs are public (anyone can use)
- Results are private (only endpoint owner can view/export)

**Authorization:**
- All result endpoints check ownership
- Only endpoint owner can:
  - View API calls
  - View discovered endpoints
  - View documentation
  - Export data (CSV, printable, ZIP)

**Alternatives Considered:**
- Public resource (rejected - need private results)
- Shared access (rejected - privacy concerns)

**Trade-offs:**
- Requires authentication (more complex)
- Better privacy and user experience

---

## Performance Decisions

### Payload Size Limits
**Decision:** 50MB max payload size (configurable, 5x increase for testing large API responses)

**Rationale:**
- Testing environments may have larger payloads (file uploads, bulk data)
- Prevents storage bloat while allowing realistic testing
- Most API calls are smaller, but testing should handle edge cases

**Handling:**
- Truncate if larger than 50MB
- Store metadata even if truncated
- Log truncation events for monitoring

**Alternatives Considered:**
- No limit (rejected - storage costs, performance issues)
- 1MB limit (rejected - too restrictive)

---

### Caching Strategy
**Decision:** Cache generated documentation, no caching for API calls

**Rationale:**
- Documentation doesn't change often (cache improves performance)
- API calls are time-sensitive (no caching needed)
- Balance between freshness and performance

**Cache TTL:**
- Documentation: No expiration (store in database, no cache)
- Discovered endpoint details: 5 minutes (Redis cache)
- User credit balance: 5 minutes (Redis cache)
- Endpoint statistics: 1 minute (Redis cache)
- Real-time API call counts: No cache (always real-time)

---

## All Decisions Made

**Summary:**
- **Authentication:** JWT with 3-day expiration, HTTP-only cookies
- **Access Model:** Per-user endpoints with owner-only result access
- **Credit System:** 100 credits for $20, 25 credits per URL endpoint creation
- **Payment:** Stripe and PayPal support, sandbox mode by default, admin-configurable
- **Technology Stack:** Next.js 16, React 19, TypeScript 5, PostgreSQL 16, Prisma 7
- **Database:** PostgreSQL on VM (not external)
- **Proxy:** http-proxy-middleware with Next.js API Routes
- **UI Theme:** Dark mode by default, light/dark toggle, Indigo color palette
- **UI/UX:** Complete SaaS landing page, responsive design, advanced CSS animations
- **Demo Accounts:** Pre-created demo users with seed script (100 demo credits each)
- **Admin Panel:** Full admin functionality, user management, payment settings, audit log
- **Audit Logging:** Full auditability - all actions tracked (user actions, admin actions, API operations)
- **Endpoint Lifecycle:** Create (credits deducted) → Active (proxy captures APIs) → Review → Process (AI generates docs, proxy removed) → Complete (stored data only)
- **API Details Gathering:** 100% programmatic (no AI needed)
- **Documentation Generation:** Programmatic structure + Groq GPT OSS 20B for descriptions (required)
- **AI Provider:** Groq `openai/gpt-oss-20b` (required for documentation descriptions)
- **Documentation:** Multiple formats (Markdown per endpoint, OpenAPI, GraphQL schema, TypeScript types)
- **Export:** CSV, printable view, ZIP of MD files
- **API Types Supported:** REST, WebSocket, GraphQL, gRPC, SOAP
- **Security:** SSRF prevention, authorization checks (owner-only access), audit logging
- **Contact:** External contact page at https://studio42.dev/contact?source=api-discovery
- **Deployment:** Self-hosted on single VM (PostgreSQL and Redis on same VM)
- **Rate Limits (10x for testing):** Auth 100/min, API 1000/min, Admin 2000/min, Proxy 10000/min per endpoint
- **Payload Limits (5x for testing):** 50MB max payload size (up from 10MB)
- **Timeouts (2x for testing):** 60 second proxy timeout (up from 30 seconds)
- **Processing:** Concurrent endpoint processing (up to 5 parallel workers) for faster documentation generation
- **Local Testing:** Localhost/private IP support in development mode (NODE_ENV=development, ALLOW_LOCALHOST_IN_DEV=true)
- **Database Pool:** Connection pool size 20 (2x for testing), timeout 30s (increased for testing)

**No ambiguity remains - all choices are explicit and documented.**

---

## Business Model Decisions

### Free Tier
**Decision:** 100 free credits on signup (4 free endpoints) - freemium model

**Rationale:**
- Remove friction for first-time users
- Allow users to prove value before paying
- Standard SaaS freemium practice
- Higher conversion rates (users try before buying)

**Implementation:**
- New users default to 100 credits
- Demo accounts also get 100 credits
- Free tier limit: 4 endpoints (100 credits)
- Can purchase more credits or subscribe to Pro/Team for unlimited

**Alternatives Considered:**
- No free tier (rejected - high friction, low conversion)
- Unlimited free (rejected - no monetization path)
- Trial period (rejected - credits simpler, clearer value)

---

### Subscription Tiers
**Decision:** Three-tier subscription model (Free, Pro $15/mo, Team $50/mo) + credit packs

**Pricing Structure:**
- **Free:** 4 endpoints free, public sharing, community support
- **Pro ($15/month):** Unlimited endpoints, monitoring, change detection, private docs, priority support
- **Team ($50/month):** Everything in Pro + team collaboration, shared endpoints, admin controls
- **Credit Packs:** $20 for 100 credits (one-time, for occasional users)

**Rationale:**
- Fits different usage patterns (occasional vs. power users)
- Predictable revenue (subscriptions)
- Higher LTV (subscription customers)
- Standard SaaS model
- Credits still available for flexibility

**Alternatives Considered:**
- Credit-only (rejected - doesn't fit frequent users, poor retention)
- Subscription-only (rejected - credits provide flexibility for occasional users)

---

### Public Documentation Sharing
**Decision:** Optional public documentation sharing (opt-in, private by default)

**Rationale:**
- Network effects (more users = more documentation = more value)
- SEO value (organic discovery through search)
- Community building (developers share API docs)
- Marketing channel (free exposure)

**Implementation:**
- Users toggle public/private per endpoint
- Public URLs: `/docs/public/{endpoint-id}` or `/docs/{username}/{endpoint-slug}`
- SEO-optimized for discoverability
- Can revoke public access anytime
- Private by default (opt-in to share)

**Privacy Controls:**
- Users opt-in to make documentation public
- Can revoke public access anytime
- Private by default

**Alternatives Considered:**
- Always public (rejected - privacy concerns)
- Always private (rejected - missing network effects and SEO value)

---

### Continuous Monitoring & Change Detection
**Decision:** Automated replay of recorded action sequences to detect API changes

**Rationale:**
- APIs change frequently - documentation needs updates
- Automated replay eliminates user effort (set it and forget it)
- Captures same usage patterns as initial discovery
- Proactive monitoring is valuable
- Continuous value proposition (improves retention)

**Implementation:**
- Action sequence automatically recorded during initial capture
- Store as replayable JSON array (order, method, URL, headers, body, timing)
- User can enable monitoring after documentation generation
- System replays action sequence periodically (daily/weekly/monthly, user configurable)
- Compare responses to baseline, detect changes
- Send notifications on significant changes

**Change Detection:**
- New endpoints discovered
- Schema changes (request/response structures modified)
- Removed endpoints (previously working now return errors)
- Changed responses (different data structure)
- Auth requirements modified

**Limitations & Handling:**
- Auth token expiration: Store refresh tokens, auto-refresh, prompt user if needed
- Session expiration: Handle cookie-based sessions
- Dynamic data: Compare schema structure, not values
- Side effects: Only replay GET/read-only endpoints by default (user configurable)
- Rate limiting: Add delays between requests, respect rate limit headers

**Alternatives Considered:**
- Manual replay only (rejected - automated provides better value, user can still trigger manually)
- No monitoring (rejected - missing key value proposition, poor retention)

