import {
  BillingUnit,
  EmergencyTaskCategory,
  Prisma,
  ServiceDepartment,
} from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { writeAuditLog } from '@/lib/auditLog'
import { ER_ADMISSION_SERVICE_CODE } from '@/lib/billing/erAdmission'

export const dynamic = 'force-dynamic'

type UpdateBody = {
  displayName?: string
  basePrice?: number
  isActive?: boolean
  billingUnit?: BillingUnit
  department?: ServiceDepartment
  taskCategory?: EmergencyTaskCategory
}

// PATCH /api/admin/service-catalog/[serviceCode]
// Admin: update price row and active flag.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ serviceCode: string }> }
) {
  try {
    const { serviceCode: rawServiceCode } = await params
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const serviceCode = decodeURIComponent(rawServiceCode || '').trim()
    if (!serviceCode) {
      return NextResponse.json({ error: 'serviceCode is required.' }, { status: 400 })
    }

    const body = (await request.json()) as UpdateBody
    const updateData: Record<string, unknown> = { updatedBy: user.id, updatedAt: new Date() }

    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      updateData.displayName = body.displayName.trim()
    }
    if (typeof body.basePrice === 'number' && Number.isFinite(body.basePrice) && body.basePrice >= 0) {
      updateData.basePrice = body.basePrice
    }
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive
    }
    if (body.billingUnit && Object.values(BillingUnit).includes(body.billingUnit)) {
      updateData.billingUnit = body.billingUnit
    }
    if (body.department && Object.values(ServiceDepartment).includes(body.department)) {
      updateData.department = body.department
    }
    if (body.taskCategory && Object.values(EmergencyTaskCategory).includes(body.taskCategory)) {
      updateData.taskCategory = body.taskCategory
    }

    const updated = await prisma.serviceCatalog.update({
      where: { serviceCode },
      data: updateData,
    })

    const actionLabel =
      serviceCode === ER_ADMISSION_SERVICE_CODE
        ? `Updated ER_ADMISSION_FEE (${serviceCode})`
        : `Updated service catalog: ${serviceCode}`
    await writeAuditLog(prisma, {
      actor: user,
      request,
      action: actionLabel,
      metadata: {
        serviceCode,
        patch: {
          displayName: body.displayName,
          basePrice: body.basePrice,
          isActive: body.isActive,
          department: body.department,
        },
      },
    })

    return NextResponse.json({ success: true, service: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update service.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/admin/service-catalog/[serviceCode]
// Admin: remove catalog row (fails if referenced by emergency tasks, etc.).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ serviceCode: string }> }
) {
  try {
    const { serviceCode: rawServiceCode } = await params
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const serviceCode = decodeURIComponent(rawServiceCode || '').trim()
    if (!serviceCode) {
      return NextResponse.json({ error: 'serviceCode is required.' }, { status: 400 })
    }

    await prisma.serviceCatalog.delete({
      where: { serviceCode },
    })

    await writeAuditLog(prisma, {
      actor: user,
      request,
      action:
        serviceCode === ER_ADMISSION_SERVICE_CODE
          ? `Deleted ER_ADMISSION_FEE (${serviceCode})`
          : `Deleted service catalog: ${serviceCode}`,
      metadata: { serviceCode },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete this service: it is still linked to existing records.' },
        { status: 409 }
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to delete service.'
    if (
      typeof message === 'string' &&
      (message.toLowerCase().includes('foreign key') || message.toLowerCase().includes('violates'))
    ) {
      return NextResponse.json(
        { error: 'Cannot delete this service: it is still linked to existing records.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
