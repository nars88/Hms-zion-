/**
 * Run `prisma db execute --file ...` using the same URL rules as db-push-direct.mjs.
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

function withPgbouncerParam(dbUrl) {
  if (!/pooler\.supabase\.com/i.test(dbUrl)) return dbUrl
  if (/[?&]pgbouncer=true/.test(dbUrl)) return dbUrl
  const sep = dbUrl.includes('?') ? '&' : '?'
  return `${dbUrl}${sep}pgbouncer=true`
}

const sqlRel = process.argv[2] || 'scripts/sql/sync-system-settings-audit-log.sql'
const sqlFile = path.isAbsolute(sqlRel) ? sqlRel : path.join(root, sqlRel)

if (!fs.existsSync(sqlFile)) {
  console.error('SQL file not found:', sqlFile)
  process.exit(1)
}

const env = loadEnvFile(envPath)
const explicitPush = env.PRISMA_DB_PUSH_URL?.trim()
const direct = env.DIRECT_URL?.trim()
const migrateUrl = explicitPush || direct

if (!migrateUrl) {
  console.error('Set PRISMA_DB_PUSH_URL or DIRECT_URL in .env')
  process.exit(1)
}

if (!explicitPush && /pooler\.supabase\.com/i.test(migrateUrl)) {
  console.error('Use PRISMA_DB_PUSH_URL (Session pooler) or a non-pooler DIRECT_URL.')
  process.exit(1)
}

if (explicitPush && /:6543(\/|\?|$)/.test(migrateUrl)) {
  console.error('PRISMA_DB_PUSH_URL must use port 5432 (Session), not 6543.')
  process.exit(1)
}

let url = withConnectTimeout(migrateUrl, 60)
url = withPgbouncerParam(url)

env.DATABASE_URL = url
env.DIRECT_URL = url

const r = spawnSync('npx', ['prisma', 'db', 'execute', '--file', sqlFile, '--schema', 'prisma/schema.prisma'], {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: root,
})

process.exit(r.status ?? 1)
