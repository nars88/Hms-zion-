import type { Prisma, PrismaClient } from '@prisma/client'

export type AuditDb = Pick<PrismaClient, 'auditLog'>

export type AuditActor = { id: string; name: string; role: string }

export function getRequestClientMeta(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
  const rawUa = request.headers.get('user-agent')
  const userAgent =
    rawUa && rawUa.length > 512 ? `${rawUa.slice(0, 509)}...` : rawUa || null
  return { ipAddress: ip, userAgent }
}

function auditCreateData(
  params: {
    actor: AuditActor
    request: Request
    action: string
    metadata?: Prisma.InputJsonValue
  }
): Prisma.AuditLogCreateInput {
  const { ipAddress, userAgent } = getRequestClientMeta(params.request)
  return {
    userId: params.actor.id,
    userName: params.actor.name?.trim() || 'Unknown',
    userRole: String(params.actor.role),
    action: params.action.slice(0, 2000),
    metadata: params.metadata ?? undefined,
    ipAddress: ipAddress ? ipAddress.slice(0, 128) : null,
    userAgent,
  }
}

/** Best-effort: never throw — main business action should still succeed if logging fails. */
export async function writeAuditLog(
  db: PrismaClient,
  params: {
    actor: AuditActor
    request: Request
    action: string
    metadata?: Prisma.InputJsonValue
  }
): Promise<void> {
  try {
    await db.auditLog.create({ data: auditCreateData(params) })
  } catch (e) {
    console.error('writeAuditLog failed:', e)
  }
}

/** Use inside `prisma.$transaction` so payment + audit commit atomically. */
export async function writeAuditLogTx(
  db: AuditDb,
  params: {
    actor: AuditActor
    request: Request
    action: string
    metadata?: Prisma.InputJsonValue
  }
): Promise<void> {
  await db.auditLog.create({ data: auditCreateData(params) })
}
