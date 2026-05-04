/**
 * Forces admin@zionmed.com to password Zion@2026 (bcrypt) on the **direct** DB URL.
 * Use when login returns 401 (wrong/missing seed) while DATABASE_URL points at a pooler.
 *
 * Requires DIRECT_URL or PRISMA_DB_PUSH_URL (same rules as db-execute-push-url.mjs).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

const url = withPgbouncerParam(withConnectTimeout(migrateUrl, 60))
const prisma = new PrismaClient({
  datasources: { db: { url } },
})

const ADMIN_EMAIL = 'admin@zionmed.com'
const PASSWORD = 'Zion@2026'

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      password: passwordHash,
      name: 'System Administrator',
      role: UserRole.ADMIN,
      phone: '+964 750 000 0001',
    },
    update: {
      password: passwordHash,
      name: 'System Administrator',
      role: UserRole.ADMIN,
      phone: '+964 750 000 0001',
    },
  })
  console.log(`OK: ${ADMIN_EMAIL} password set to ${PASSWORD} (bcrypt).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
