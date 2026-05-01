import { NextResponse } from 'next/server'
import { EmergencyTaskStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type CompleteTaskBody = {
  taskId?: string
  resultText?: string
  resultAttachmentUrl?: string
  resultMeta?: Record<string, unknown>
}

// PATCH /api/er/tasks/complete
// Worker marks task as completed (billing happens at RELEASE endpoint only).
export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'LAB_TECH', 'RADIOLOGY_TECH', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as CompleteTaskBody
    if (!body.taskId) {
      return NextResponse.json({ error: 'taskId is required.' }, { status: 400 })
    }

    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.emergencyTask.findUnique({
        where: { id: body.taskId! },
      })
      if (!task) throw new Error('Task not found.')
      if (task.status === EmergencyTaskStatus.COMPLETED || task.status === EmergencyTaskStatus.RELEASED) {
        return { task, alreadyCompleted: true }
      }

      const completed = await tx.emergencyTask.update({
        where: { id: task.id },
        data: {
          status: EmergencyTaskStatus.COMPLETED,
          executedBy: user.id,
          completedAt: now,
          ...(typeof body.resultText === 'string' ? { resultText: body.resultText.trim() } : {}),
          ...(typeof body.resultAttachmentUrl === 'string' && body.resultAttachmentUrl.trim()
            ? { resultAttachmentUrl: body.resultAttachmentUrl.trim() }
            : {}),
          ...(body.resultMeta && typeof body.resultMeta === 'object'
            ? { resultMeta: body.resultMeta as Prisma.InputJsonValue }
            : {}),
          updatedAt: now,
        },
      })

      return { task: completed, alreadyCompleted: false }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete ER task.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
