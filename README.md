# Edge URL Shortener

High-performance URL shortener with sub-ms Redis caching, PostgreSQL persistence, and click analytics.

🔗 **Live**: https://short.davidfdzmorilla.dev  
📦 **GitHub**: https://github.com/davidfdzmorilla/webdev-edge-shortener

## Architecture

```
short.davidfdzmorilla.dev
       │
    Nginx (port 80/443)
       │
  localhost:3014
       │
  ┌────┴─────────────────────────────┐
  │  Fastify (TypeScript)            │
  │  GET /:slug  ─→ Redis (sub-ms)   │
  │              ─→ PostgreSQL (miss)│
  │  POST /api/shorten               │
  │  GET  /api/stats/:slug           │
  │  GET  /api/health                │
  │  GET  /                          │
  └──────────────────────────────────┘
       │                    │
  Redis :6380          PostgreSQL :5438
  (redirect cache)     (persistent store)
```

## Performance characteristics

| Operation | Latency |
|-----------|---------|
| Redirect (cache hit) | < 2 ms |
| Redirect (cache miss) | ~5-15 ms |
| Create short URL | ~10-20 ms |
| Stats query | ~5-10 ms |

## API

### Create short URL
```bash
curl -X POST https://short.davidfdzmorilla.dev/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/davidfdzmorilla", "slug": "github"}'
```

### Redirect (302)
```bash
curl -L https://short.davidfdzmorilla.dev/github
```

### Analytics
```bash
curl https://short.davidfdzmorilla.dev/api/stats/github
```

### Health
```bash
curl https://short.davidfdzmorilla.dev/api/health
```

## Stack

- **Fastify 5** — fastest Node.js web framework
- **Redis** — sub-millisecond redirect cache (TTL: 7 days)
- **PostgreSQL 16** — persistent URL + analytics storage
- **TypeScript** strict mode
- **Docker Compose** for production deployment
- **Nginx** reverse proxy

## Deploy

```bash
docker compose up -d
```

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3014` | App port |
| `BASE_URL` | `https://short.davidfdzmorilla.dev` | Public base URL |
| `REDIS_HOST` | `host.docker.internal` | Redis hostname |
| `REDIS_PORT` | `6380` | Redis port |
| `DB_*` | (see compose) | PostgreSQL credentials |
| `ADMIN_KEY` | `platform-admin-key` | Admin API key |
