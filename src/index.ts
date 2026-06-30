import { createDbClient, type DbClient } from './db.js'
import { createKvClient, type KvClient } from './kv.js'
import { createStoreClient, type StoreClient } from './store.js'

export type { DbClient, KvClient, StoreClient }

export interface FlectEnv {
  db(binding: string): DbClient
  kv(binding: string): KvClient
  store(binding: string): StoreClient
}

export function createEnv(): FlectEnv {
  const dbCache  = new Map<string, DbClient>()
  const kvCache  = new Map<string, KvClient>()

  const storeCache = new Map<string, StoreClient>()

  return {
    store(binding: string): StoreClient {
      if (storeCache.has(binding)) return storeCache.get(binding)!

      const endpoint   = process.env[`${binding}_ENDPOINT`]
      const bucket     = process.env[`${binding}_BUCKET`]
      const accessKey  = process.env[`${binding}_ACCESS_KEY`]
      const secretKey  = process.env[`${binding}_SECRET_KEY`]
      const region     = process.env[`${binding}_REGION`] ?? 'eu'

      if (!endpoint || !bucket || !accessKey || !secretKey) throw new Error(
        `[flect/sdk] Missing env vars for store binding: ${binding}\n` +
        `  Add [[stores]] binding = "${binding}" to flect.toml`
      )

      const client = createStoreClient(endpoint, bucket, accessKey, secretKey, region)
      storeCache.set(binding, client)
      return client
    },

    db(binding: string): DbClient {
      if (dbCache.has(binding)) return dbCache.get(binding)!

      const url       = process.env[`${binding}_URL`]
      const namespace = process.env[`${binding}_NAMESPACE`]
      if (!url) throw new Error(
        `[flect/sdk] Missing env var: ${binding}_URL\n` +
        `  Add [[databases]] binding = "${binding}" to flect.toml`
      )

      const token  = process.env['FLECT_TOKEN']
      const client = createDbClient(url, namespace, token)
      dbCache.set(binding, client)
      return client
    },

    kv(binding: string): KvClient {
      if (kvCache.has(binding)) return kvCache.get(binding)!

      const url    = process.env[`${binding}_URL`]
      const prefix = process.env[`${binding}_PREFIX`] ?? ''

      if (!url) throw new Error(
        `[flect/sdk] Missing env var: ${binding}_URL\n` +
        `  Add [[kv]] binding = "${binding}" to flect.toml`
      )

      const client = createKvClient(url, prefix)
      kvCache.set(binding, client)
      return client
    },
  }
}
