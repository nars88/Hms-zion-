import { NextResponse } from 'next/server'
import { EmergencyTaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type StartTaskBody = {
  taskId?: string
}

// PATCH /api/er/tasks/start
// Moves task lifecycle to IN_PROGRESS.
export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'LAB_TECH', 'RADIOLOGY_TECH', 'DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as StartTaskBody
    if (!body.taskId) {
      return NextResponse.json({ error: 'taskId is required.' }, { status: 400 })
    }

    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.emergencyTask.findUnique({
        where: { id: body.taskId! },
        select: { id: true, status: true, startedAt: true, visitId: true },
      })
      if (!task) throw new Error('Task not found.')
      if (task.status === EmergencyTaskStatus.CANCELLED || task.status === EmergencyTaskStatus.RELEASED) {
        throw new Error(`Task cannot be started from status ${task.status}.`)
      }
      if (task.status === EmergencyTaskStatus.IN_PROGRESS) {
        return { task, alreadyStarted: true }
      }

      const updated = await tx.emergencyTask.update({
        where: { id: task.id },
        data: {
          status: EmergencyTaskStatus.IN_PROGRESS,
          startedAt: task.startedAt ?? now,
          updatedAt: now,
        },
      })
      return { task: updated, alreadyStarted: false }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start ER task.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
