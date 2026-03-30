# Kabin-e Operations Manual

## Deploy Flow

1. Push to `main` branch
2. GitHub Actions CI runs: backend tests + frontend lint/typecheck
3. If CI passes, Render auto-deploys backend from `main`
4. Frontend is deployed separately (Vercel or Render static)

### Render Start Command (Production)

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

This gives 4 workers so one blocked sync DB call doesn't block the entire server.

---

## Environment Variables

### Required (Backend - Render Dashboard)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `SECRET_KEY` | JWT signing key (32+ chars) | `your-secret-key-here` |
| `MEDICAL_ENCRYPTION_KEY` | AES-256 key for medical data (base64) | Generate with: `python -c "from app.security.encryption import generate_encryption_key; print(generate_encryption_key())"` |
| `AI_PROVIDER` | AI provider (`gemini` or `claude`) | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |

### Optional (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (backup AI) | `None` |
| `SENTRY_DSN` | Sentry DSN for error monitoring | `None` |
| `REDIS_URL` | Redis URL for persistent rate limiting | `None` (uses in-memory) |
| `STRIPE_SECRET_KEY` | Stripe secret key | `None` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `None` |
| `RESEND_API_KEY` | Resend email API key | `None` |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:3000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `DEBUG` | Enable debug mode | `false` |
| `SUPERADMIN_EMAILS` | Comma-separated superadmin emails | `` |

### Required (Frontend)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Optional (Frontend)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

---

## Database Migrations

Migrations are in `backend/database/migrations/` numbered sequentially.

### Running a Migration

```bash
# Connect to Supabase SQL editor or use psql:
psql $DATABASE_URL -f backend/database/migrations/040_stripe_price_ids.sql
```

### Current Migrations

- `010` through `039`: Core schema (plans, subscriptions, GDPR, medical, etc.)
- `040`: Stripe price ID columns on `planes` table
- `041`: Row Level Security policies on core tables

### RLS Note

Migration `041` enables RLS on core tables. The backend uses `service_role_key` which bypasses RLS. This protects against direct Supabase access with the anon key.

---

## Sentry Alerts Setup

1. Create a Sentry project for backend (Python/FastAPI)
2. Create a Sentry project for frontend (Next.js)
3. Set `SENTRY_DSN` in Render and `NEXT_PUBLIC_SENTRY_DSN` in frontend env
4. Configure alert rules:
   - **P1**: Any `RuntimeError` or `500` error > 5 occurrences in 5 min
   - **P2**: Any new issue (first occurrence)
   - **P3**: Weekly digest of unresolved issues

### Testing Sentry

Backend: trigger a test error by visiting `/health` — any unhandled error will be captured.

---

## Stripe Webhook Testing

### Local Development

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local backend
stripe listen --forward-to localhost:8000/v1/stripe/webhook

# The CLI will print a webhook signing secret — set it as STRIPE_WEBHOOK_SECRET
```

### Production

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-api.onrender.com/v1/stripe/webhook`
3. Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret to Render env as `STRIPE_WEBHOOK_SECRET`

---

## Health Check

**URL**: `GET /health`

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "database": "connected",
    "redis": "connected" | "not_configured",
    "stripe": "configured" | "not_configured",
    "sentry": "configured" | "not_configured"
  },
  "version": "2.0.0"
}
```

Returns `503` if database is disconnected.

### Render Health Check

Configure in Render dashboard: Health Check Path = `/health`

---

## Incident Response Playbook

### 1. App Returns 500 Errors

1. Check Sentry for the error details
2. Check Render logs: `render logs --tail`
3. Verify database connectivity: `curl https://your-api/health`
4. If DB is down, check Supabase status page

### 2. High Latency / Timeouts

1. Check if a single worker is blocked (sync DB call issue)
2. Verify gunicorn is running with 4 workers
3. Check Supabase dashboard for slow queries
4. Check Redis connectivity if rate limiter is degraded

### 3. Authentication Failures

1. Check Supabase Auth service status
2. Verify `SECRET_KEY` hasn't changed
3. Check `audit_log` table for `login_fallido` entries (possible brute force)
4. Verify CORS origins are correctly configured

### 4. Stripe Payment Issues

1. Check Stripe Dashboard for failed payments
2. Verify webhook endpoint is receiving events
3. Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
4. Review Sentry for webhook processing errors

### 5. Medical Data Encryption Errors

1. Verify `MEDICAL_ENCRYPTION_KEY` is set in Render
2. **Never** change the encryption key — existing data becomes unreadable
3. If key is lost, medical data cannot be recovered (by design)

---

## Performance Monitoring

### Key Metrics

- Response time: check `x-response-time` header
- Rate limiting: check `x-ratelimit-remaining` header
- Error rate: Sentry dashboard
- Database: Supabase dashboard > Database > Query Performance

### Load Testing

```bash
# Basic load test with Apache Bench
ab -n 1000 -c 50 -H "Authorization: Bearer <token>" https://your-api/v1/sesiones
```
