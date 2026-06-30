import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { Client } from '@libsql/client'

export async function runMigrations(client: Client, migrationsDir: string): Promise<void> {
  await client.execute(`CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`)

  const result  = await client.execute(`SELECT name FROM _migrations`)
  const applied = new Set(result.rows.map(r => r['name'] as string))

  let files: string[]
  try {
    files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort()
  } catch {
    console.warn(`[flect/sdk] No migrations found at: ${migrationsDir}`)
    return
  }

  for (const file of files) {
    if (applied.has(file)) continue
    const sql        = await readFile(join(migrationsDir, file), 'utf8')
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      await client.execute(stmt)
    }
    await client.execute({
      sql:  `INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`,
      args: [file, Date.now()],
    })
    console.log(`[flect/sdk] Applied: ${file}`)
  }
}
