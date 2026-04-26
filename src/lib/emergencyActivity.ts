import { prisma } from '@/lib/prisma'

export async function logEmergencyActivity(input: {
  visitId: string
  action: string
  details?: string
  actorUserId?: string | null
  actorName?: string | null
}) {
  try {
    await prisma.activityHistory.create({
      data: {
        visitId: input.visitId,
        action: input.action,
        details: input.details,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to log emergency activity:', error)
  }
}
