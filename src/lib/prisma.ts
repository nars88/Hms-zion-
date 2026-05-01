import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as { prisma?: PrismaClient }

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
        url: ensureConnectionLimit(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
