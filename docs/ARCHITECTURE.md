# 🏗️ AEGIS Architecture

## System Overview

AEGIS, Node.js + TypeScript ekosisteminde microservices geliştirmek için modüler bir framework'tür. 13 bağımsız NPM paketinden oluşur ve her biri belirli bir altyapı sorununu çözer.

---

## Architecture Layers
┌──────────────────────────────────────────────┐
│ YOUR BUSINESS LOGIC │
│ (Express/Fastify + gRPC) │
├──────────────────────────────────────────────┤
│ │
│ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│ │ Tier 1 │ │ Tier 2 │ │ Tier 3 │ │
│ │ Foundation│ │ Utilities│ │ Integration │ │
│ │ │ │ │ │ │ │
│ │ • Audit │ │ • Cache │ │ • Starter │ │
│ │ • Observ │ │ • Valid │ │ • CLI │ │
│ │ • Resil │ │ • Queue │ │ • Docs │ │
│ │ │ │ • Secur │ │ │ │
│ └──────────┘ └──────────┘ └────────────┘ │
│ │
│ ┌──────────────────────────────────────┐ │
│ │ Tier 4: Advanced │ │
│ │ • Testing • Performance • Migration│ │
│ └──────────────────────────────────────┘ │
│ │
├──────────────────────────────────────────────┤
│ INFRASTRUCTURE LAYER │
│ │
│ PostgreSQL • Redis • BullMQ • Docker │
│ Prometheus • Grafana • OpenTelemetry │
│ Nginx • GitHub Actions • Elasticsearch │
└──────────────────────────────────────────────┘




---

## Package List

| Tier | Package | Purpose |
|------|---------|---------|
| 1 | aegis-audit | Audit trail + GDPR |
| 1 | aegis-observability | Tracing + metrics |
| 1 | aegis-resilience | Circuit breaker + retry |
| 2 | aegis-cache | Smart caching |
| 2 | aegis-validation | Zod + gRPC bridge |
| 2 | aegis-queue | BullMQ wrapper |
| 2 | aegis-security | Rate limit + JWT |
| 3 | aegis-starter-template | Project scaffold |
| 3 | aegis-cli | Command-line tools |
| 3 | aegis-docs | Documentation |
| 4 | aegis-testing | Test utilities |
| 4 | aegis-performance | Profilers |
| 4 | aegis-migration | DB migrations |

---

## Core Package

`aegis-core` tüm paketlerin kullandığı shared utilities:
- Logger (Winston)
- Error handler
- ID generator (nanoid)
- Environment loader
- Common types

---

## Design Patterns

### Decorator Pattern
```typescript
@Audited()
@Cacheable({ ttl: 3600 })
async getUser(id: string) { ... }
```
### Middleware Pattern
```typescript
app.use(correlationMiddleware())
app.use(auditMiddleware())
```
### Data Flow
Request → Middleware → Controller → Service → Database/Cache
   │          │            │           │
   └──────────┴────────────┴───────────┘
          Trace ID korunur


### Tecnology Stack
Component	Technology
Runtime	Node.js 18+
Language	TypeScript 5+
HTTP	Express / Fastify
RPC	gRPC
Database	PostgreSQL
ORM	Prisma
Cache	Redis
Queue	BullMQ
Tracing	OpenTelemetry
Metrics	Prometheus
Logs	Winston