# API Discovery Platform - Operations & Troubleshooting Guide

**Comprehensive operational guide: monitoring, troubleshooting, performance tuning, and production best practices.**

## Monitoring & Observability

### Key Metrics to Track

**User Metrics:**
- Total active users
- New user registrations per day/week
- Demo account usage vs. real accounts
- User retention rate
- Average endpoints per user

**System Metrics:**
- API call capture rate (calls per minute)
- Proxy request latency (p50, p95, p99)
- Documentation generation time (average, max)
- AI API call success rate
- Background job queue depth
- Database query performance

**Business Metrics:**
- Credit purchases per day
- Average credits per purchase
- Revenue per user
- Endpoint creation rate
- Documentation generation success rate

**Error Rates:**
- Proxy failures
- API capture failures
- AI generation failures
- Payment failures
- Authentication failures

### Logging Strategy

**Log Levels:**
- **ERROR:** Critical failures (payment failures, AI API failures, proxy errors)
- **WARN:** Warnings (rate limits, validation failures, retries)
- **INFO:** Important events (user registration, endpoint creation, payment completion)
- **DEBUG:** Detailed debugging (API call details, analysis steps)

**Log Format:**
```json
{
  "timestamp": "2025-12-16T12:00:00Z",
  "level": "INFO",
  "message": "Endpoint created",
  "userId": "user-123",
  "endpointId": "endpoint-456",
  "creditsUsed": 25,
  "creditsRemaining": 75,
  "requestId": "req-789",
  "ipAddress": "192.168.1.1"
}
```

**Structured Logging:**
```typescript
import { logger } from '@/lib/logger';

logger.info('Endpoint created', {
  userId: user.id,
  endpointId: endpoint.id,
  creditsUsed: 25,
  creditsRemaining: user.credits,
});
```

### Health Checks

**Health Check Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-16T12:00:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 5
    },
    "redis": {
      "status": "healthy",
      "latency": 2
    },
    "groq": {
      "status": "healthy",
      "latency": 120
    }
  }
}
```

**Implementation:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    groq: await checkGroq(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allHealthy ? 200 : 503 });
}
```

### Alerting Thresholds

**Critical Alerts:**
- Database connection failures (immediate)
- Payment processing failures (immediate)
- AI API failures > 10% error rate (5 minutes)
- Proxy failure rate > 5% (5 minutes)

**Warning Alerts:**
- Background job queue depth > 1000 (15 minutes)
- Average proxy latency > 2 seconds (15 minutes)
- Documentation generation failure rate > 5% (15 minutes)
- Credit purchase failure rate > 3% (15 minutes)

## Background Job Processing

### BullMQ Setup

**Queue Configuration:**
```typescript
// lib/queue/processor.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const analysisQueue = new Queue('analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { endpointId } = job.data;
    await processEndpoint(endpointId);
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 endpoints concurrently
  }
);
```

**Job Creation:**
```typescript
// When user triggers documentation generation
await analysisQueue.add('process-endpoint', {
  endpointId,
  userId,
}, {
  jobId: `endpoint-${endpointId}`, // Prevent duplicates
});
```

**Job Monitoring:**
```typescript
// Monitor job progress
const job = await analysisQueue.getJob(`endpoint-${endpointId}`);
const progress = await job?.getState();

// Track: waiting, active, completed, failed, delayed
```

### Error Handling in Background Jobs

**Retry Strategy:**
- **Attempts:** 3 retries
- **Backoff:** Exponential (2s, 4s, 8s)
- **Failures:** Log error, notify user via email/notification

**Failed Job Handling:**
```typescript
analysisWorker.on('failed', async (job, error) => {
  // Log error
  logger.error('Background job failed', {
    jobId: job.id,
    endpointId: job.data.endpointId,
    error: error.message,
  });
  
  // Update endpoint status to ERROR
  await prisma.endpoint.update({
    where: { id: job.data.endpointId },
    data: { status: 'ERROR' },
  });
  
  // Notify user
  await notifyUser(job.data.userId, {
    type: 'DOCUMENTATION_FAILED',
    endpointId: job.data.endpointId,
    error: error.message,
  });
});
```

## Performance Optimization

### Database Query Optimization

**Indexes:**
- All foreign keys indexed
- Timestamp fields indexed for time-based queries
- Composite indexes for common query patterns

**Query Patterns:**
```typescript
// Use select to limit fields
const endpoints = await prisma.endpoint.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    status: true,
    createdAt: true,
    // Don't select large fields unless needed
  },
  take: 20, // Always limit results
  orderBy: { createdAt: 'desc' },
});

// Use cursor pagination for large datasets
const endpoints = await prisma.endpoint.findMany({
  where: { userId },
  cursor: { id: lastId },
  take: 20,
  orderBy: { createdAt: 'desc' },
});
```

**Connection Pooling:**
```typescript
// Prisma connection pool configuration
// In schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  connection_limit = 10
  pool_timeout = 20
}
```

### Caching Strategy

**Redis Caching:**
```typescript
// Cache user credit balance (5 minute TTL)
const cacheKey = `user:${userId}:credits`;
let credits = await redis.get(cacheKey);

if (!credits) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  credits = user?.credits || 0;
  await redis.setex(cacheKey, 300, credits); // 5 minute cache
}

// Cache endpoint stats (1 minute TTL)
const statsKey = `endpoint:${endpointId}:stats`;
let stats = await redis.get(statsKey);
if (!stats) {
  stats = await calculateEndpointStats(endpointId);
  await redis.setex(statsKey, 60, JSON.stringify(stats));
}
```

**What to Cache:**
- User credit balances (5 minutes)
- Endpoint statistics (1 minute)
- Discovered endpoint details (until endpoint updated)
- Documentation markdown (until endpoint reprocessed)

**What NOT to Cache:**
- Real-time API call counts
- Payment status
- User authentication state

### Proxy Performance

**Optimization Strategies:**
- Stream large responses (don't buffer entire response)
- Limit request/response size (10MB max)
- Timeout configuration (30 seconds)
- Connection pooling to target servers

**Implementation:**
```typescript
// Stream response for large payloads
const proxyOptions = {
  target: destinationUrl,
  changeOrigin: true,
  ws: true, // WebSocket support
  timeout: 60000,  // 60 seconds (2x for testing)
  proxyTimeout: 60000,  // 60 seconds (2x for testing)
  limit: '50mb', // Request size limit (5x for testing)
  // Stream responses
  selfHandleResponse: false,
};
```

## Troubleshooting Guide

### Common Issues

#### Issue: Proxy Not Working

**Symptoms:**
- 404 errors when accessing proxy URL
- Connection timeouts
- "Endpoint not found" errors

**Debugging Steps:**
1. Check endpoint exists: `SELECT * FROM endpoints WHERE id = 'endpoint-id'`
2. Verify endpoint status is ACTIVE
3. Check destination URL is accessible: `curl https://destination-url.com`
4. Check proxy logs for errors
5. Verify URL validation isn't blocking

**Solutions:**
- If endpoint status is PROCESSING/COMPLETE: Proxy is disabled (by design)
- If destination URL unreachable: Check URL is correct and accessible
- If URL validation blocking: Check SSRF prevention rules

---

#### Issue: API Calls Not Being Captured

**Symptoms:**
- Proxy works but no API calls in database
- Dashboard shows 0 API calls captured

**Debugging Steps:**
1. Check proxy middleware is running
2. Verify database connection
3. Check API call insertion logs
4. Verify endpoint ID matches in proxy route

**Solutions:**
- Check proxy middleware is registered: `middleware.ts` includes proxy route
- Check database connection: `DATABASE_URL` is correct
- Check error logs for insertion failures
- Verify endpoint ID in proxy URL matches database

---

#### Issue: Documentation Generation Failing

**Symptoms:**
- Endpoint stuck in PROCESSING status
- Background job failures
- AI API errors

**Debugging Steps:**
1. Check background job queue status
2. Check Groq API key is set: `GROQ_API_KEY`
3. Check Groq API rate limits
4. Check job error logs
5. Verify API calls exist: `SELECT COUNT(*) FROM api_calls WHERE endpoint_id = '...'`

**Solutions:**
- If Groq API key missing: Set `GROQ_API_KEY` environment variable
- If rate limited: Implement retry with exponential backoff
- If no API calls: User needs to use proxy first
- Check job queue depth: If > 1000 jobs, increase worker concurrency or add more worker instances

---

#### Issue: Payment Processing Failing

**Symptoms:**
- Payment stuck in PENDING status
- Stripe/PayPal webhook not received
- Credits not added to account

**Debugging Steps:**
1. Check payment status in database
2. Check Stripe/PayPal webhook logs
3. Verify webhook secret is correct
4. Check payment provider status

**Solutions:**
- If webhook not received: Check webhook URL is accessible, verify webhook secret
- If payment completed but credits not added: Manually trigger credit addition
- If sandbox mode: Verify using test keys and test cards
- Check payment provider dashboard for errors

---

#### Issue: High Database Load

**Symptoms:**
- Slow queries
- Connection pool exhaustion
- Database CPU high

**Debugging Steps:**
1. Check slow query log
2. Analyze query patterns
3. Check for missing indexes
4. Monitor connection pool usage

**Solutions:**
- Add missing indexes (check EXPLAIN ANALYZE)
- Optimize queries (use select, limit results)
- Increase connection pool size
- No read replicas (single PostgreSQL instance on same VM)

---

#### Issue: AI API Rate Limits

**Symptoms:**
- Documentation generation slow
- AI API errors
- Rate limit errors in logs

**Debugging Steps:**
1. Check Groq API rate limits
2. Monitor AI API call frequency
3. Check error logs for rate limit messages

**Solutions:**
- Implement request queuing for AI calls
- Add exponential backoff retry
- Batch AI requests when possible
- Upgrade Groq API tier if rate limits exceeded (current: 100 requests/minute per endpoint with retry, 10x for testing)

---

#### Issue: Credit Balance Incorrect

**Symptoms:**
- User credit balance doesn't match transactions
- Credits deducted but not used

**Debugging Steps:**
1. Check credit transactions: `SELECT * FROM credit_transactions WHERE user_id = '...' ORDER BY created_at`
2. Check user balance: `SELECT credits FROM users WHERE id = '...'`
3. Verify transaction consistency

**Solutions:**
- Recalculate balance from transactions: Run SQL query to sum all transactions, update user.credits field
- Check for race conditions in credit deduction
- Verify transactions are atomic (use database transactions)

---

### Debugging Commands

**Database Queries:**
```sql
-- Check endpoint status
SELECT id, status, destination_url, created_at 
FROM endpoints 
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Check API calls captured
SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
FROM api_calls
WHERE endpoint_id = 'endpoint-id';

-- Check credit transactions
SELECT * FROM credit_transactions
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 20;

-- Check payment status
SELECT id, status, amount, credits, provider, created_at
FROM payments
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Check background jobs (if using BullMQ dashboard)
-- Access BullMQ dashboard at /admin/queue
```

**Redis Commands:**
```bash
# Check Redis connection
redis-cli ping

# Check queue length
redis-cli LLEN bull:analysis:waiting

# Check cached values
redis-cli GET "user:user-id:credits"
```

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Demo accounts seeded
- [ ] Payment providers configured (Stripe/PayPal)
- [ ] Groq API key configured
- [ ] Redis configured for background jobs
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Monitoring/alerting set up
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting configured
- [ ] CORS configured correctly

### Post-Deployment

- [ ] Health check passes
- [ ] Can create user account
- [ ] Can login
- [ ] Can create endpoint (credits deducted)
- [ ] Proxy works and captures API calls
- [ ] Documentation generation works
- [ ] Payment processing works (test in sandbox)
- [ ] Exports work (CSV, printable, ZIP)
- [ ] Admin panel accessible
- [ ] Audit logging working

### Regular Maintenance

**Daily:**
- [ ] Monitor error rates
- [ ] Check background job queue depth
- [ ] Monitor payment processing
- [ ] Check system health

**Weekly:**
- [ ] Review slow queries
- [ ] Check database size growth
- [ ] Review audit logs for anomalies
- [ ] Monitor credit purchase patterns

**Monthly:**
- [ ] Review and optimize database indexes
- [ ] Review and clean up old data (if retention policy)
- [ ] Review error logs for patterns
- [ ] Update dependencies
- [ ] Review security patches

---

## Scaling Considerations

### Horizontal Scaling

**Proxy Servers:**
- Stateless design (can run multiple instances)
- Load balancer distributes requests
- Shared database and Redis

**Background Workers:**
- Run multiple worker instances
- BullMQ handles job distribution
- Each worker processes jobs independently

**Database:**
- Read replicas for read-heavy queries
- Connection pooling per instance
- Index optimization

### Vertical Scaling

**Database:**
- Increase CPU/RAM for better query performance
- SSD storage for faster I/O

**Application:**
- Increase Node.js memory limit: Set NODE_OPTIONS="--max-old-space-size=4096" if needed (default: 2GB)
- Tune connection pool sizes

---

## Security Best Practices

### Data Protection

**Encryption:**
- Encrypt sensitive data at rest (database)
- Use HTTPS for all communications
- Encrypt payment provider secrets

**Access Control:**
- Verify ownership for all resource access
- Use prepared statements (Prisma handles this)
- Validate all user inputs

**Secrets Management:**
- Store secrets in environment variables
- Use secret management service in production
- Rotate secrets regularly
- Never commit secrets to version control

### Rate Limiting

**Implementation:**
```typescript
// Rate limiting per user
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (10x for testing environment)
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

### SSRF Prevention

**URL Validation:**
- Block private IP ranges (127.0.0.1, 10.x.x.x, 192.168.x.x, etc.)
- Block localhost
- Validate URL scheme (only http/https)
- Check DNS resolution (prevent DNS rebinding)

---

## Backup & Recovery

### Database Backups

**Automated Backups:**
- Daily full backups
- Hourly incremental backups (if supported)
- Retain backups for 30 days

**Backup Testing:**
- Test restore procedures regularly
- Verify backup integrity
- Document recovery procedures

### Recovery Procedures

**Database Restore:**
```bash
# Restore from backup
pg_restore -d api_discovery backup.dump

# Verify restore
psql -d api_discovery -c "SELECT COUNT(*) FROM users;"
```

**Data Recovery:**
- Keep audit logs for recovery
- Can reconstruct credit transactions from audit log
- Can recover endpoint data from backups

---

## Performance Benchmarks

### Target Metrics

**Proxy Performance:**
- p50 latency: < 100ms
- p95 latency: < 500ms
- p99 latency: < 1000ms
- Throughput: 1000+ requests/second

**Documentation Generation:**
- Average time: < 5 minutes
- p95 time: < 10 minutes
- Success rate: > 95%

**Database Performance:**
- Query time p95: < 100ms
- Connection pool usage: < 80%
- No slow queries (> 1 second)

---

## Support Procedures

### User Support

**Common Support Requests:**
1. "Proxy not working" → Check endpoint status, destination URL
2. "No API calls captured" → Verify proxy usage, check logs
3. "Documentation not generating" → Check job queue, Groq API status
4. "Payment failed" → Check payment provider status, webhook logs
5. "Credits not added" → Check payment status, transaction logs

**Support Workflow:**
1. Acknowledge request
2. Check user account status
3. Review audit logs for user actions
4. Check system logs for errors
5. Provide solution or escalate

---

## Related Documentation

- [Implementation Guide](api-discovery-implementation.md) - Development setup and coding patterns
- [API Specifications](api-discovery-api.md) - API endpoint documentation
- [Architecture](api-discovery-architecture.md) - System architecture details
- [Database Schema](api-discovery-database.md) - Database structure

