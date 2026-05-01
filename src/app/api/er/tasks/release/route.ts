import { NextResponse } from 'next/server'
import { BillingUnit, EmergencyTaskBillingStatus, EmergencyTaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { categoryToResultCardType, emitResultReadyBroadcast, type ErResultCardType } from '@/lib/erClinicalBroadcast'

export const dynamic = 'force-dynamic'

type ReleaseTaskBody = {
  taskId?: string
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    const parsed = Number(value.toString())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function computeLineTotal(unit: BillingUnit, basePrice: number, quantity: number): number {
  const q = quantity > 0 ? quantity : 1
  if (unit === BillingUnit.PER_TASK) return basePrice
  return basePrice * q
}

// PATCH /api/er/tasks/release
// Atomic release + single billing trigger from ServiceCatalog.
export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'LAB_TECH', 'RADIOLOGY_TECH', 'DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as ReleaseTaskBody
    if (!body.taskId) {
      return NextResponse.json({ error: 'taskId is required.' }, { status: 400 })
    }

    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.emergencyTask.findUnique({
        where: { id: body.taskId! },
        include: {
          visit: {
            select: {
              id: true,
              patientId: true,
              patient: { select: { firstName: true, lastName: true } },
            },
          },
          service: {
            select: {
              serviceCode: true,
              displayName: true,
              department: true,
              billingUnit: true,
              basePrice: true,
              isActive: true,
              effectiveFrom: true,
              effectiveTo: true,
            },
          },
        },
      })
      if (!task) throw new Error('Task not found.')
      if (task.status === EmergencyTaskStatus.CANCELLED) throw new Error('Cancelled task cannot be released.')
      if (task.status !== EmergencyTaskStatus.COMPLETED && task.status !== EmergencyTaskStatus.RELEASED) {
        throw new Error('Task must be completed before release.')
      }
      if (task.status === EmergencyTaskStatus.RELEASED && task.billingStatus === EmergencyTaskBillingStatus.BILLED) {
        return {
          task,
          billing: null,
          alreadyReleased: true,
        }
      }

      let billing: null | {
        serviceCode: string
        unitPrice: number
        quantity: number
        lineTotal: number
      } = null

      if (task.serviceCode && task.billingStatus !== EmergencyTaskBillingStatus.BILLED) {
        const service = task.service
        if (!service) throw new Error(`ServiceCatalog item not found for code ${task.serviceCode}`)
        if (!service.isActive) throw new Error(`Service ${task.serviceCode} is inactive`)
        if (service.effectiveFrom > now || (service.effectiveTo && service.effectiveTo < now)) {
          throw new Error(`Service ${task.serviceCode} is outside active time window`)
        }

        const quantity = task.billQuantity && task.billQuantity > 0 ? task.billQuantity : 1
        const unitPrice = safeNumber(service.basePrice)
        const lineTotal = computeLineTotal(service.billingUnit, unitPrice, quantity)

        const billItem = {
          id: `ER-TASK-${task.id}`,
          department: String(service.department),
          description: service.displayName || task.title,
          quantity,
          unitPrice,
          total: lineTotal,
          addedAt: now.toISOString(),
          addedBy: task.prescribedBy || user.id,
          sourceTaskId: task.id,
          serviceCode: service.serviceCode,
          billingUnit: service.billingUnit,
        }

        const bill = await tx.bill.findUnique({ where: { visitId: task.visitId } })
        if (!bill) {
          await tx.bill.create({
            data: {
              visitId: task.visitId,
              patientId: task.visit.patientId,
              generatedBy: task.prescribedBy || user.id,
              items: [billItem],
              subtotal: lineTotal,
              tax: 0,
              discount: 0,
              total: lineTotal,
              paymentStatus: 'Pending',
            },
          })
        } else {
          const existingItems = Array.isArray(bill.items) ? bill.items : []
          const deduped = existingItems.filter((item) => {
            if (!item || typeof item !== 'object') return true
            const sourceTaskId = (item as { sourceTaskId?: unknown }).sourceTaskId
            return sourceTaskId !== task.id
          })
          const updatedItems = [...deduped, billItem]
          const subtotal = updatedItems.reduce<number>((sum, item) => {
            if (!item || typeof item !== 'object') return sum
            return sum + safeNumber((item as { total?: unknown }).total)
          }, 0)
          const tax = safeNumber(bill.tax)
          const discount = safeNumber(bill.discount)
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              items: updatedItems,
              subtotal,
              total: subtotal + tax - discount,
              updatedAt: now,
            },
          })
        }

        billing = {
          serviceCode: service.serviceCode,
          unitPrice,
          quantity,
          lineTotal,
        }
      }

      const released = await tx.emergencyTask.update({
        where: { id: task.id },
        data: {
          status: EmergencyTaskStatus.RELEASED,
          releasedBy: user.id,
          releasedAt: now,
          billingStatus: billing ? EmergencyTaskBillingStatus.BILLED : task.billingStatus,
          ...(billing ? { billedAt: now, billItemId: `ER-TASK-${task.id}` } : {}),
          updatedAt: now,
        },
      })

      const resultCardType = categoryToResultCardType(task.category)
      const pt = task.visit.patient
      const patientName = pt ? `${pt.firstName} ${pt.lastName}`.trim() : 'Patient'
      const testType = task.service?.displayName?.trim() || task.title
      const resultReady: null | {
        taskId: string
        visitId: string
        patientName: string
        testType: string
        resultCardType: ErResultCardType
      } =
        resultCardType != null
          ? {
              taskId: task.id,
              visitId: task.visitId,
              patientName,
              testType,
              resultCardType: resultCardType,
            }
          : null

      return {
        task: released,
        billing,
        alreadyReleased: false,
        resultReady,
      }
    })

    const { resultReady, ...rest } = result as typeof result & {
      resultReady?: {
        taskId: string
        visitId: string
        patientName: string
        testType: string
        resultCardType: ErResultCardType
      } | null
    }

    if (resultReady && !rest.alreadyReleased) {
      emitResultReadyBroadcast({
        taskId: resultReady.taskId,
        visitId: resultReady.visitId,
        patientName: resultReady.patientName,
        testType: resultReady.testType,
        resultCardType: resultReady.resultCardType,
      })
    }

    return NextResponse.json({ success: true, ...rest, resultReady: resultReady ?? undefined })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to release ER task.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
