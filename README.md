# Parcel Routing System

A production-ready parcel routing system with configurable business rules, built with TypeScript, Express, React, and SQLite.

## Quick Start

```bash
# Install dependencies
npm install

# Start both server and client in development mode
npm run dev

# Server runs on http://localhost:3001
# Client runs on http://localhost:5173
```

## Architecture

### System Overview

The system follows a **monorepo** structure with three packages:

- **`packages/shared`** — Shared types, interfaces, and Zod validation schemas
- **`packages/server`** — Express API with routing engine, SQLite persistence, and monitoring
- **`packages/client`** — React SPA with Tailwind CSS for operators to route parcels

### Core Design: Data-Driven Rule Engine

The routing engine is the heart of the system. Instead of hardcoding routing logic, rules are defined as **pure data** in `routing-rules.json` and evaluated by a generic engine.

**Key benefits:**
- **No code changes** to add, modify, or disable routing rules — edit JSON only
- **Hot-reload** — the server watches `routing-rules.json` and reconstructs the engine on file changes without restart
- **Testable** — the engine is a pure function of (rules + parcel) → result, with no side effects
- **Version controlled** — rules live in git alongside code, with full audit trail

### How Routing Works

1. Parcel data is validated against Zod schemas
2. The rule engine evaluates rules in **priority order** (highest first)
3. Each rule's **conditions** are checked against parcel properties using a recursive evaluator
4. Matching rules' **actions** determine the routing outcome
5. In `all-matches` mode, both insurance approval AND department routing can apply simultaneously

### Default Routing Rules

| Priority | Rule | Condition | Action |
|----------|------|-----------|--------|
| 100 | Insurance Approval | Value > €1,000 | Require insurance approval |
| 50 | Heavy Department | Weight > 10kg | Route to Heavy |
| 40 | Regular Department | 1kg < Weight ≤ 10kg | Route to Regular |
| 30 | Mail Department | Weight ≤ 1kg | Route to Mail |

## Adding a New Routing Rule

Edit `routing-rules.json` to add a rule. Example — routing parcels to Netherlands under 2kg to an Express lane:

```json
{
  "id": "express-nl",
  "name": "Express NL Route",
  "priority": 45,
  "enabled": true,
  "conditions": {
    "all": [
      { "field": "destination.country", "operator": "eq", "value": "NL" },
      { "field": "weight", "operator": "lte", "value": 2 }
    ]
  },
  "action": {
    "type": "route",
    "department": "Express NL",
    "message": "Express route for NL parcels ≤ 2kg"
  }
}
```

The server hot-reloads the file automatically. The regression test suite (`rule-engine.test.ts`) verifies that adding new rules doesn't break existing routing.

### Available Operators

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `regex`, `between`

### Condition Logic

- `all: [...]` — AND: all conditions must match
- `any: [...]` — OR: any condition must match
- Conditions can be nested arbitrarily: `any: [ { all: [A, B] }, { all: [C, D] } ]`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/parcels/route` | Route a single parcel |
| POST | `/api/parcels/batch` | Upload batch JSON file |
| GET | `/api/parcels/batch/:jobId` | Check batch job status |
| GET | `/api/routing/rules` | View current routing rules |
| GET | `/api/routing/history` | Paginated routing history |
| GET | `/api/routing/recent` | Last 10 routed parcels |
| GET | `/api/routing/stats` | Route distribution counts |
| GET | `/api/health` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe |
| GET | `/api/metrics` | System metrics and anomalies |

## Testing

```bash
# Run all tests
npm run test -w @parcel-routing/server

# Watch mode
npm run test:watch -w @parcel-routing/server

# Coverage report
npm run test:coverage -w @parcel-routing/server
```

### Test Coverage

- **102 tests** across 7 test suites
- **Unit tests**: Every operator, condition evaluator, rule engine, circuit breaker, schema migrator
- **Regression tests**: Golden parcel sets verify adding rules doesn't break existing routing
- **Integration tests**: Full HTTP lifecycle — routing, batch upload, validation, health checks

### Load Testing

```bash
# Install k6
brew install k6

# Run load tests (server must be running)
k6 run load-tests/routing-load-test.js

# With custom base URL
k6 run -e BASE_URL=http://prod-server:3001 load-tests/routing-load-test.js
```

Scenarios: smoke (1 VU), load (ramp to 50 VUs), spike (burst to 100 VUs).
Thresholds: p95 < 500ms, error rate < 1%.

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t parcel-routing .
docker run -p 3001:3001 -v parcel-data:/app/data parcel-routing
```

Features: multi-stage build, non-root user, tini for PID 1 signal handling, health check, volume for SQLite persistence, static file serving in production.

## Security

- **Helmet** — security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — restricted to configured origins
- **Rate limiting** — 100 req/15min general, 5 req/15min batch uploads
- **Input validation** — Zod schemas reject malformed data at the boundary
- **Parameterized queries** — SQLite queries use prepared statements, preventing SQL injection
- **Body size limits** — 1MB for single parcels, configurable for batch uploads
- **ReDoS protection** — regex operator patterns limited to 200 chars
- **Condition depth limit** — nested conditions capped at 10 levels

## Reliability

- **Circuit breaker** — database writes protected by circuit breaker pattern (5 failure threshold, 30s reset). If DB is down, routing still works — persistence degrades gracefully.
- **Graceful shutdown** — SIGTERM/SIGINT handlers drain connections, close DB, stop watchers. Force exit after 10s timeout.
- **Batch idempotency** — content hash prevents duplicate processing on retry.
- **Batch transactions** — entire batch wrapped in SQLite transaction for consistency.

## Monitoring

- **Structured logging** — Pino JSON logs with request correlation IDs
- **Audit logging** — separate audit trail for routing decisions, rule changes, and security events
- **Health checks** — liveness + readiness probes with circuit breaker state
- **Metrics** — route distribution, latency (avg/p95), error rate, uptime
- **Anomaly detection** — every 5 minutes, checks for:
  - Error rate > 5%
  - P95 latency > 500ms
  - Route distribution deviation > 2 standard deviations from rolling average

## Schema Versioning

Routing rules support automatic schema migration. When the config format evolves, older files are auto-migrated to the current version at load time. Migrations are chained (v1.0 -> v1.1 -> v1.2) and applied transparently.

## Project Structure

```
packages/
├── shared/src/          # Types + Zod schemas shared between server & client
├── server/src/
│   ├── engine/          # Rule engine, condition evaluator, operators, rule loader
│   ├── routes/          # Express route handlers
│   ├── middleware/      # Security, validation, error handling, logging
│   ├── services/        # Parcel routing + batch processing orchestration
│   ├── monitoring/      # Metrics collector + anomaly detector
│   └── db/              # SQLite database, migrations, repositories
└── client/src/
    ├── pages/           # RoutePage, BatchPage, HistoryPage, DashboardPage
    ├── components/      # Reusable UI components
    ├── hooks/           # React Query hooks
    └── api/             # API client
```

## Design Trade-offs

| Decision | Chosen | Why |
|----------|--------|-----|
| Rule storage | JSON file + hot-reload | Git-versioned, simple, no admin UI needed |
| Database | SQLite (better-sqlite3) | Zero-config, sync API, perfect for single-server |
| Frontend state | React Query | Handles caching, loading, error states for server data |
| Logging | Pino | Fastest structured logger for Node.js |
| Monorepo | npm workspaces | Simplest tool at this scale |
| Evaluation mode | `all-matches` (default) | Allows insurance rules and routing rules to both fire |

## Environment Variables

See `.env.example` for all available configuration options.
