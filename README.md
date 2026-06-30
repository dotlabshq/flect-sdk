# @flect/sdk

TypeScript SDK for [Flect](https://flect.run) — access databases, KV stores, and object storage from your app.

## Install

```bash
npm install @flect/sdk
```

## Usage

```typescript
import { createEnv } from '@flect/sdk'

const env = createEnv()

// Database (SQLite via sqld)
const db = env.db('DB')
const users = await db.query('SELECT * FROM users WHERE id = ?', [id])
await db.execute('INSERT INTO users (id, name) VALUES (?, ?)', [id, name])

// KV store (Valkey/Redis-compatible)
const cache = env.kv('CACHE')
await cache.set('session:abc', token, { ttl: 3600 })
const val = await cache.get('session:abc')

// Object store (S3-compatible via Garage)
const storage = env.store('STORAGE')
await storage.put('avatars/alice.png', buffer, { contentType: 'image/png' })
const url = await storage.presignedPut('uploads/photo.jpg', { expiresIn: 300 })
```

Bindings are configured in `flect.toml` and env vars are injected automatically at deploy time.

## Docs

[flect.run/docs](https://flect.run/docs)
