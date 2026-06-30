import Redis from 'ioredis'

export interface KvClient {
  get(key: string): Promise<string | null>
  getJson<T>(key: string): Promise<T | null>
  set(key: string, value: string, opts?: { ttl?: number }): Promise<void>
  setJson(key: string, value: unknown, opts?: { ttl?: number }): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  keys(pattern?: string): Promise<string[]>
}

export function createKvClient(url: string, prefix: string): KvClient {
  const redis = new Redis(url, { lazyConnect: true })
  const p = (key: string) => `${prefix}${key}`

  return {
    async get(key: string): Promise<string | null> {
      return redis.get(p(key))
    },

    async getJson<T>(key: string): Promise<T | null> {
      const raw = await redis.get(p(key))
      if (!raw) return null
      try { return JSON.parse(raw) as T } catch { return null }
    },

    async set(key: string, value: string, opts?: { ttl?: number }): Promise<void> {
      if (opts?.ttl) {
        await redis.setex(p(key), opts.ttl, value)
      } else {
        await redis.set(p(key), value)
      }
    },

    async setJson(key: string, value: unknown, opts?: { ttl?: number }): Promise<void> {
      const serialized = JSON.stringify(value)
      if (opts?.ttl) {
        await redis.setex(p(key), opts.ttl, serialized)
      } else {
        await redis.set(p(key), serialized)
      }
    },

    async del(key: string): Promise<void> {
      await redis.del(p(key))
    },

    async exists(key: string): Promise<boolean> {
      return (await redis.exists(p(key))) === 1
    },

    async keys(pattern = '*'): Promise<string[]> {
      const full = await redis.keys(p(pattern))
      return full.map(k => k.slice(prefix.length))
    },
  }
}
