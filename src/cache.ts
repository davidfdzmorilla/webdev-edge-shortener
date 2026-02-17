import { Redis as IORedis } from 'ioredis'

export const redis = new IORedis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6380),
  password: process.env['REDIS_PASS'] ?? undefined,
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 100, 2000),
  maxRetriesPerRequest: 3,
})

const REDIRECT_TTL = 7 * 24 * 60 * 60 // 7 days in seconds
const KEY_PREFIX   = 'short:url:'

export async function cacheGet(slug: string): Promise<string | null> {
  return redis.get(`${KEY_PREFIX}${slug}`)
}

export async function cacheSet(slug: string, url: string): Promise<void> {
  await redis.setex(`${KEY_PREFIX}${slug}`, REDIRECT_TTL, url)
}

export async function cacheDel(slug: string): Promise<void> {
  await redis.del(`${KEY_PREFIX}${slug}`)
}
