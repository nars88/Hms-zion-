import { prisma } from '@/lib/prisma'

export async function logEmergencyActivity(input: {
  visitId: string
  action: string
  details?: string
  actorUserId?: string | null
  actorName?: string | null
}) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO activity_history (visit_id, action, details, actor_user_id, actor_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      input.visitId,
      input.action,
      input.details ?? null,
      input.actorUserId ?? null,
      input.actorName ?? null
    )
  } catch (error) {
    // Non-blocking by design: patient flow must continue even if activity storage is unavailable.
    console.error('Failed to log emergency activity:', error)
  }
}
