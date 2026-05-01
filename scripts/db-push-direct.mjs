/**
 * Run `prisma db push` with a URL that works from your network.
 *
 * Why two URLs?
 * - Supabase "Direct" (`db.*.supabase.co:5432`) often uses IPv6. If your ISP/network has no IPv6,
 *   Prisma shows: P1001 Can't reach database server.
 * - Fix: In Supabase → Connect → use "Session pooler" (IPv4-friendly), copy the URI into .env as
 *   PRISMA_DB_PUSH_URL, then run: npm run db:push:direct
 * - Optional add-on: Supabase "IPv4" for direct connections if you prefer DIRECT_URL only.
 *
 * Do NOT use Transaction pooler (port 6543) for db push — use Session mode (port 5432 on pooler host).
 */
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env')

function loadEnvFile(p) {
  const out = { ...process.env }
  if (!fs.existsSync(p)) return out
  const text = fs.readFileSync(p, 'utf8')
  for (let line of text.split(/\r?\n/)) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function withConnectTimeout(dbUrl, sec) {
  if (/[?&]connect_timeout=/.test(dbUrl)) return dbUrl
  const sep = dbUrl.includes('?') ? '&' : '?'
  return `${dbUrl}${sep}connect_timeout=${sec}`
}

/** Disable statement_timeout for this CLI session so DDL can finish. */
function withSessionStatementTimeoutDisabled(dbUrl) {
  const opt = encodeURIComponent('-c statement_timeout=0')
  if (/[?&]options=/.test(dbUrl)) {
    console.warn('URL already has options=; if push times out, add statement_timeout=0 manually.')
    return dbUrl
  }
  const sep = dbUrl.includes('?') ? '&' : '?'
  return `${dbUrl}${sep}options=${opt}`
}

/** Prisma + Supavisor: avoids "prepared statement already exists" on pooler. */
function withPgbouncerParam(dbUrl) {
  if (!/pooler\.supabase\.com/i.test(dbUrl)) return dbUrl
  if (/[?&]pgbouncer=true/.test(dbUrl)) return dbUrl
  const sep = dbUrl.includes('?') ? '&' : '?'
  return `${dbUrl}${sep}pgbouncer=true`
}

const env = loadEnvFile(envPath)
const explicitPush = env.PRISMA_DB_PUSH_URL?.trim()
const direct = env.DIRECT_URL?.trim()

const migrateUrl = explicitPush || direct
if (!migrateUrl) {
  console.error(
    [
      'Set one of these in .env:',
      '  PRISMA_DB_PUSH_URL = Supabase "Session pooler" URI (recommended if direct host gives P1001)',
      '  DIRECT_URL       = Supabase "Direct" URI (db.*.supabase.co:5432)',
      '',
      'P1001 on direct host usually means no IPv6 route — use Session pooler URI as PRISMA_DB_PUSH_URL.',
    ].join('\n')
  )
  process.exit(1)
}

if (!explicitPush && /pooler\.supabase\.com/i.test(migrateUrl)) {
  console.error(
    [
      'DIRECT_URL must not be the pooler host. Use db.<ref>.supabase.co for DIRECT_URL,',
      'or add PRISMA_DB_PUSH_URL with the Session pooler connection string for npm run db:push:direct.',
    ].join('\n')
  )
  process.exit(1)
}

if (explicitPush && /:6543(\/|\?|$)/.test(migrateUrl)) {
  console.error(
    'PRISMA_DB_PUSH_URL uses port 6543 (transaction pooler). Use Session mode (port 5432) instead for prisma db push.'
  )
  process.exit(1)
}

let url = withConnectTimeout(migrateUrl, 60)
url = withPgbouncerParam(url)
url = withSessionStatementTimeoutDisabled(url)

// Prisma `db push` / migrate uses `directUrl` when present — it must not point at an unreachable
// direct host while we intentionally use Session pooler via PRISMA_DB_PUSH_URL.
env.DATABASE_URL = url
env.DIRECT_URL = url

const source = explicitPush ? 'PRISMA_DB_PUSH_URL' : 'DIRECT_URL'
console.log(`Using ${source} for prisma db push (connect_timeout=60, statement_timeout=0 for this run).\n`)

const result = spawnSync('npx', ['prisma', 'db', 'push'], {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: root,
})

process.exit(result.status ?? 1)
