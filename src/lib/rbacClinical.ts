import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { writeAuditLog, type AuditActor } from '@/lib/auditLog'

/** Roles that must not read or write clinical content (notes, diagnosis, prescriptions, lab, etc.). */
export function isClinicalAccessAllowed(role: string): boolean {
  return role !== UserRole.ADMIN && role !== UserRole.ACCOUNTANT
}

export function toAuditActor(user: { id: string; name?: string | null; role: string }): AuditActor {
  return {
    id: user.id,
    name: user.name?.trim() || 'Unknown',
    role: user.role,
  }
}

export async function auditRbacViolation(
  actor: AuditActor,
  request: Request,
  entity: string,
  details: string
): Promise<void> {
  const path = new URL(request.url).pathname
  await writeAuditLog(prisma, {
    actor,
    request,
    action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    metadata: {
      entity,
      details: details || `User ${actor.id} with role ${actor.role} attempted to access restricted endpoint ${path}`,
      severity: 'HIGH',
    },
  })
}

/** 403 for clinical RBAC violations (ADMIN / ACCOUNTANT). */
export async function forbiddenClinicalAccess(
  user: { id: string; name?: string | null; role: string },
  request: Request
): Promise<NextResponse> {
  const path = new URL(request.url).pathname
  const actor = toAuditActor(user)
  await auditRbacViolation(
    actor,
    request,
    'ClinicalData',
    `User ${user.id} with role ${user.role} attempted to access restricted endpoint ${path}`
  )
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** 403 when only ACCOUNTANT may finalize payment (blocks ADMIN and others). */
export async function forbiddenPaymentFinalize(
  user: { id: string; name?: string | null; role: string },
  request: Request
): Promise<NextResponse> {
  const path = new URL(request.url).pathname
  const actor = toAuditActor(user)
  await auditRbacViolation(
    actor,
    request,
    'FinancialAction',
    `User ${user.id} with role ${user.role} attempted to finalize payment on restricted endpoint ${path}`
  )
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
