import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { pool, initDb } from './db.js'
import { redis, cacheGet, cacheSet } from './cache.js'
import { generateSlug, isValidSlug } from './slug.js'
import { dashboardHtml } from './dashboard.js'

const BASE_URL = process.env['BASE_URL'] ?? 'https://short.davidfdzmorilla.dev'
const ADMIN_KEY = process.env['ADMIN_KEY'] ?? 'platform-admin-key'
const PORT      = Number(process.env['PORT'] ?? 3014)

const app = Fastify({
  logger: { level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info' },
  trustProxy: true,
})

// ── Plugins ────────────────────────────────────────────────────────────────
await app.register(cors, { origin: '*' })

await app.register(rateLimit, {
  global: false,
  redis,
  nameSpace: 'rl:',
})

// ── Schemas ────────────────────────────────────────────────────────────────
const shortenBody = {
  type: 'object',
  required: ['url'],
  properties: {
    url:  { type: 'string', maxLength: 2048 },
    slug: { type: 'string', minLength: 3, maxLength: 50 },
  },
} as const

// ── Dashboard ──────────────────────────────────────────────────────────────
app.get('/', async (_req, reply) => {
  return reply.type('text/html').send(dashboardHtml())
})

// ── POST /api/shorten ──────────────────────────────────────────────────────
app.post('/api/shorten', {
  config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  schema: { body: shortenBody },
}, async (req, reply) => {
  const { url, slug: customSlug } = req.body as { url: string; slug?: string }

  // Validate URL
  try { new URL(url) } catch {
    return reply.code(400).send({ error: 'Invalid URL format' })
  }

  // Block localhost/private ranges
  const hostname = new URL(url).hostname
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
    return reply.code(400).send({ error: 'Private URLs not allowed' })
  }

  const slug = customSlug ?? generateSlug()

  if (!isValidSlug(slug)) {
    return reply.code(400).send({ error: 'Slug must be 3–50 chars: letters, digits, _ -' })
  }

  try {
    const { rows } = await pool.query<{ slug: string; created_at: string }>(
      `INSERT INTO urls (slug, original_url)
       VALUES ($1, $2)
       RETURNING slug, created_at`,
      [slug, url]
    )
    const row = rows[0]!
    await cacheSet(slug, url)

    return reply.code(201).send({
      slug:        row.slug,
      shortUrl:    `${BASE_URL}/${row.slug}`,
      originalUrl: url,
      createdAt:   row.created_at,
    })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === '23505') {
      return reply.code(409).send({ error: 'Slug already taken' })
    }
    app.log.error(err)
    return reply.code(500).send({ error: 'Internal server error' })
  }
})

// ── GET /:slug — hot redirect path ────────────────────────────────────────
app.get('/:slug', async (req, reply) => {
  const { slug } = req.params as { slug: string }

  // 1. Redis cache first (sub-ms)
  let originalUrl = await cacheGet(slug)

  if (!originalUrl) {
    // 2. PostgreSQL fallback
    const { rows } = await pool.query<{ original_url: string }>(
      'SELECT original_url FROM urls WHERE slug = $1',
      [slug]
    )
    if (!rows[0]) {
      return reply.code(404).send({ error: 'Short URL not found' })
    }
    originalUrl = rows[0].original_url
    await cacheSet(slug, originalUrl)      // warm up cache
  }

  // Fire-and-forget analytics (non-blocking — doesn't slow down redirect)
  const country   = (req.headers['cf-ipcountry'] as string | undefined) ?? 'Unknown'
  const userAgent = req.headers['user-agent'] ?? ''
  const referrer  = req.headers['referer'] ?? ''

  setImmediate(() => {
    Promise.all([
      pool.query(
        `INSERT INTO clicks (slug, country, user_agent, referrer)
         VALUES ($1, $2, $3, $4)`,
        [slug, country, userAgent.slice(0, 512), referrer.slice(0, 512)]
      ),
      pool.query(
        'UPDATE urls SET click_count = click_count + 1 WHERE slug = $1',
        [slug]
      ),
    ]).catch((e) => app.log.error({ err: e }, 'click tracking failed'))
  })

  return reply
    .header('Cache-Control', 'no-store')
    .redirect(originalUrl, 302)
})

// ── GET /api/stats/:slug ───────────────────────────────────────────────────
app.get('/api/stats/:slug', async (req, reply) => {
  const { slug } = req.params as { slug: string }

  const [urlRes, clickRes] = await Promise.all([
    pool.query<{ slug: string; original_url: string; created_at: string; click_count: string }>(
      'SELECT slug, original_url, created_at, click_count FROM urls WHERE slug = $1',
      [slug]
    ),
    pool.query<{ country: string; count: string }>(
      `SELECT country, COUNT(*) AS count
       FROM clicks WHERE slug = $1
       GROUP BY country ORDER BY count DESC LIMIT 10`,
      [slug]
    ),
  ])

  if (!urlRes.rows[0]) {
    return reply.code(404).send({ error: 'URL not found' })
  }

  const row = urlRes.rows[0]
  return reply.send({
    url: {
      slug:        row.slug,
      originalUrl: row.original_url,
      createdAt:   row.created_at,
      clickCount:  Number(row.click_count),
    },
    topCountries: clickRes.rows.map((r) => ({
      country: r.country,
      count:   Number(r.count),
    })),
  })
})

// ── GET /api/health ────────────────────────────────────────────────────────
app.get('/api/health', async (_req, reply) => {
  const [pgOk, redisOk] = await Promise.all([
    pool.query('SELECT 1').then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ])
  const status = pgOk && redisOk ? 'ok' : 'degraded'
  return reply.code(status === 'ok' ? 200 : 503).send({
    status,
    version: '1.0.0',
    runtime: 'fastify',
    services: { postgres: pgOk, redis: redisOk },
  })
})

// ── GET /api/list (admin) ──────────────────────────────────────────────────
app.get('/api/list', async (req, reply) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  const { rows } = await pool.query(
    `SELECT slug, original_url, created_at, click_count
     FROM urls ORDER BY created_at DESC LIMIT 100`
  )
  return reply.send({ urls: rows })
})

// ── Startup ────────────────────────────────────────────────────────────────
try {
  await redis.connect()
  app.log.info('Redis connected')

  await initDb()
  app.log.info('Database schema ready')

  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`🚀 Edge URL Shortener on :${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
