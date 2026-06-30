export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>
}

type SqlArg = { type: 'text' | 'integer' | 'float' | 'blob' | 'null'; value?: string }
type PipelineResult = { results: Array<{ rows: SqlArg[][]; cols: Array<{ name: string }> }> }

function toSqlArg(v: unknown): SqlArg {
  if (v === null || v === undefined) return { type: 'null' }
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) }
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' }
  return { type: 'text', value: String(v) }
}

function fromSqlArg(v: SqlArg): unknown {
  if (v.type === 'null') return null
  if (v.type === 'integer') return parseInt(v.value ?? '0', 10)
  if (v.type === 'float') return parseFloat(v.value ?? '0')
  return v.value ?? null
}

export function createDbClient(baseUrl: string, namespace?: string, token?: string): DbClient {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (namespace) headers['x-namespace'] = namespace
  if (token)     headers['authorization'] = `Bearer ${token}`

  async function pipeline(
    statements: Array<{ sql: string; args?: unknown[] }>,
  ): Promise<PipelineResult> {
    const requests = [
      ...statements.map(s => ({
        type: 'execute',
        stmt: { sql: s.sql, args: (s.args ?? []).map(toSqlArg) },
      })),
      { type: 'close' },
    ]
    const res = await fetch(`${baseUrl}/v2/pipeline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ baton: null, requests }),
    })
    if (!res.ok) throw new Error(`sqld error: ${res.status}`)
    const body = await res.json() as {
      results: Array<{ type: string; response?: { type?: string; result?: { rows: SqlArg[][]; cols: Array<{ name: string }> } } }>
    }
    return {
      results: body.results
        .filter(r => r.type === 'ok' && r.response?.type === 'execute')
        .map(r => ({
          rows: r.response?.result?.rows ?? [],
          cols: r.response?.result?.cols ?? [],
        })),
    }
  }

  return {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await pipeline([{ sql, args: params }])
      const { rows, cols } = result.results[0] ?? { rows: [], cols: [] }
      return rows.map(row =>
        Object.fromEntries(cols.map((c, i) => [c.name, fromSqlArg(row[i]!)])),
      ) as T[]
    },

    async execute(sql: string, params: unknown[] = []): Promise<{ rowsAffected: number }> {
      await pipeline([{ sql, args: params }])
      return { rowsAffected: 1 }
    },

    async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void> {
      await pipeline(statements.map(s => ({ sql: s.sql, args: s.params })))
    },
  }
}
