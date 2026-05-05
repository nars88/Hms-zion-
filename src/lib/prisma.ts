import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as { prisma?: PrismaClient }

function sanitizeDbUrl(value?: string) {
  if (!value) return value
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function ensureConnectionLimit(url?: string) {
  if (!url) return url
  const hasQuery = url.includes('?')
  const hasLimit = /([?&])connection_limit=/.test(url)
  if (hasLimit) {
    return url.replace(/([?&])connection_limit=\d+/, '$1connection_limit=10')
  }
  return `${url}${hasQuery ? '&' : '?'}connection_limit=10`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        // Be tolerant to accidental quoted env values in cloud dashboards.
        url: ensureConnectionLimit(
          sanitizeDbUrl(process.env.DATABASE_URL) || sanitizeDbUrl(process.env.DIRECT_URL)
        ),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
