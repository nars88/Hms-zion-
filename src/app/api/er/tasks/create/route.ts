import { NextResponse } from 'next/server'
import { BillingUnit, EmergencyTaskBillingStatus, EmergencyTaskCategory, EmergencyTaskStatus, EmergencyTaskType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type CreateTaskBody = {
  visitId?: string
  type?: EmergencyTaskType
  category?: EmergencyTaskCategory
  title?: string
  serviceCode?: string
  billDepartment?: string
  billUnitPrice?: number
  billQuantity?: number
  resultMeta?: Record<string, unknown>
  tasks?: Array<{
    type?: EmergencyTaskType
    category?: EmergencyTaskCategory
    title?: string
    serviceCode?: string
    billDepartment?: string
    billUnitPrice?: number
    billQuantity?: number
    resultMeta?: Record<string, unknown>
  }>
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

// POST /api/er/tasks/create
// Doctor issues structured ER tasks (nurse task / medication order).
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as CreateTaskBody
    if (!body.visitId) {
      return NextResponse.json({ error: 'visitId is required.' }, { status: 400 })
    }
    const normalizedInputTasks =
      Array.isArray(body.tasks) && body.tasks.length > 0
        ? body.tasks
        : [
            {
              type: body.type,
              category: body.category,
              title: body.title,
              serviceCode: body.serviceCode,
              billDepartment: body.billDepartment,
              billUnitPrice: body.billUnitPrice,
              billQuantity: body.billQuantity,
              resultMeta: body.resultMeta,
            },
          ]
    if (!normalizedInputTasks.every((t) => t?.title && t?.type && Object.values(EmergencyTaskType).includes(t.type))) {
      return NextResponse.json({ error: 'Each task requires valid type and title.' }, { status: 400 })
    }

    const visit = await prisma.visit.findUnique({
      where: { id: body.visitId },
      select: { id: true, patientId: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 })

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const batchToken = `ER-BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const serviceCodes = Array.from(
        new Set(
          normalizedInputTasks
            .map((t) => (typeof t.serviceCode === 'string' ? t.serviceCode.trim() : ''))
            .filter((code) => code.length > 0)
        )
      )
      const serviceRows =
        serviceCodes.length > 0
          ? await tx.serviceCatalog.findMany({
              where: {
                serviceCode: { in: serviceCodes },
                isActive: true,
                effectiveFrom: { lte: now },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
              },
              select: {
                serviceCode: true,
                displayName: true,
                department: true,
                billingUnit: true,
                basePrice: true,
              },
            })
          : []
      const serviceMap = new Map(
        serviceRows.map((row) => [
          row.serviceCode,
          {
            serviceCode: row.serviceCode,
            displayName: row.displayName,
            department: String(row.department),
            billingUnit: row.billingUnit,
            basePrice: safeNumber(row.basePrice),
          },
        ])
      )

      const preparedTasks = normalizedInputTasks.map((inputTask, idx) => {
        const qty =
          typeof inputTask.billQuantity === 'number' && Number.isFinite(inputTask.billQuantity) && inputTask.billQuantity > 0
            ? Math.round(inputTask.billQuantity)
            : 1
        const unitPriceOverride =
          typeof inputTask.billUnitPrice === 'number' && Number.isFinite(inputTask.billUnitPrice) && inputTask.billUnitPrice >= 0
            ? inputTask.billUnitPrice
            : null
        const normalizedServiceCode =
          typeof inputTask.serviceCode === 'string' && inputTask.serviceCode.trim() ? inputTask.serviceCode.trim() : null
        if (normalizedServiceCode && !serviceMap.has(normalizedServiceCode)) {
          throw new Error(`Service code is invalid or inactive: ${normalizedServiceCode}`)
        }
        const serviceMeta = normalizedServiceCode ? serviceMap.get(normalizedServiceCode) ?? null : null
        return {
          idx,
          qty,
          unitPriceOverride,
          normalizedServiceCode,
          serviceMeta,
          title: inputTask.title!.trim(),
          type: inputTask.type!,
          category: inputTask.category,
          billDepartment: inputTask.billDepartment?.trim(),
          resultMeta:
            inputTask.resultMeta && typeof inputTask.resultMeta === 'object'
              ? ({ ...inputTask.resultMeta, batchToken, itemIdx: idx } as Prisma.InputJsonValue)
              : ({ batchToken, itemIdx: idx } as Prisma.InputJsonValue),
        }
      })

      await tx.emergencyTask.createMany({
        data: preparedTasks.map((task) => ({
          visitId: body.visitId!,
          type: task.type,
          status: EmergencyTaskStatus.PENDING,
          ...(task.category ? { category: task.category } : {}),
          ...(task.normalizedServiceCode ? { serviceCode: task.normalizedServiceCode } : {}),
          title: task.title,
          prescribedBy: user.id,
          ...(task.billDepartment ? { billDepartment: task.billDepartment } : {}),
          ...(task.unitPriceOverride != null ? { billUnitPrice: task.unitPriceOverride } : {}),
          ...(task.qty > 0 ? { billQuantity: task.qty } : {}),
          resultMeta: task.resultMeta,
        })),
      })

      const createdTasks = preparedTasks.map((task) => ({
        id: `${batchToken}-${task.idx}`,
        title: task.title,
        type: task.type,
        serviceCode: task.normalizedServiceCode,
        billQuantity: task.qty,
      }))
      const billItemsToAppend: Array<{
        id: string
        department: string
        description: string
        quantity: number
        unitPrice: number
        total: number
        addedAt: string
        addedBy: string
        sourceTaskId: string
        serviceCode: string
        billingUnit: BillingUnit
      }> = preparedTasks
        .filter((task) => Boolean(task.serviceMeta))
        .map((task) => {
          const serviceMeta = task.serviceMeta!
          const price = task.unitPriceOverride != null ? task.unitPriceOverride : serviceMeta.basePrice
          const lineTotal = computeLineTotal(serviceMeta.billingUnit, price, task.qty)
          return {
            id: `ER-TASK-${batchToken}-${task.idx}`,
            department: serviceMeta.department,
            description: serviceMeta.displayName || task.title,
            quantity: task.qty,
            unitPrice: price,
            total: lineTotal,
            addedAt: now.toISOString(),
            addedBy: user.id,
            sourceTaskId: `${batchToken}-${task.idx}`,
            serviceCode: serviceMeta.serviceCode,
            billingUnit: serviceMeta.billingUnit,
          }
        })

      if (billItemsToAppend.length > 0) {
        const bill = await tx.bill.findUnique({ where: { visitId: body.visitId! } })
        const newItemsTotal = billItemsToAppend.reduce((sum, i) => sum + i.total, 0)
        if (!bill) {
          await tx.bill.create({
            data: {
              visitId: body.visitId!,
              patientId: visit.patientId,
              generatedBy: user.id,
              items: billItemsToAppend,
              subtotal: newItemsTotal,
              tax: 0,
              discount: 0,
              total: newItemsTotal,
              paymentStatus: 'Pending',
            },
          })
        } else {
          const existingItems = Array.isArray(bill.items) ? bill.items : []
          const deduped = existingItems.filter((item) => {
            if (!item || typeof item !== 'object') return true
            const sourceTaskId = (item as { sourceTaskId?: unknown }).sourceTaskId
            return !billItemsToAppend.some((b) => b.sourceTaskId === sourceTaskId)
          })
          const updatedItems = [...deduped, ...billItemsToAppend]
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
      }

      await tx.emergencyTask.updateMany({
        where: {
          visitId: body.visitId!,
          prescribedBy: user.id,
          createdAt: { gte: new Date(now.getTime() - 30_000) },
          serviceCode: { not: null },
        },
        data: {
          billingStatus: EmergencyTaskBillingStatus.BILLED,
          billedAt: now,
        },
      })

      return createdTasks
    })

    return NextResponse.json(
      { success: true, tasks: result, ...(result.length === 1 ? { task: result[0] } : {}) },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create ER task.'
    console.error('api/er/tasks/create failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
