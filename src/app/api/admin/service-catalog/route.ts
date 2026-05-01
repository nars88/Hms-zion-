import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { BillingUnit, EmergencyTaskCategory, ServiceDepartment } from '@prisma/client'
import { writeAuditLog } from '@/lib/auditLog'
import {
  ER_ADMISSION_SERVICE_CODE,
  MIN_ER_ADMISSION_CATALOG_IQD,
} from '@/lib/billing/erAdmission'

const ER_ADMISSION_MIN_PRICE_ERROR =
  'Standard ER Admission Fee cannot be lower than the minimum baseline (10,000 IQD).'

export const dynamic = 'force-dynamic'

// GET /api/admin/service-catalog
// Admin: list pricing catalog rows for management page.
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const rows = await prisma.serviceCatalog.findMany({
      orderBy: [{ department: 'asc' }, { displayName: 'asc' }],
    })

    return NextResponse.json({ success: true, services: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch service catalog.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/admin/service-catalog
// Admin: create a new pricing catalog service row.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json().catch(() => ({}))) as {
      serviceCode?: string
      displayName?: string
      department?: ServiceDepartment
      taskCategory?: EmergencyTaskCategory
      billingUnit?: BillingUnit
      basePrice?: number
      currency?: string
      isActive?: boolean
    }

    const serviceCode = String(body.serviceCode || '').trim().toUpperCase()
    const displayName = String(body.displayName || '').trim()
    const basePrice = Number(body.basePrice)
    const currency = String(body.currency || 'IQD').trim().toUpperCase() || 'IQD'
    const isActive = body.isActive !== false

    if (!serviceCode || !displayName || !Number.isFinite(basePrice) || basePrice < 0) {
      return NextResponse.json(
        { error: 'serviceCode, displayName, and non-negative basePrice are required.' },
        { status: 400 }
      )
    }
    if (!body.department || !Object.values(ServiceDepartment).includes(body.department)) {
      return NextResponse.json({ error: 'Invalid department.' }, { status: 400 })
    }
    if (!body.taskCategory || !Object.values(EmergencyTaskCategory).includes(body.taskCategory)) {
      return NextResponse.json({ error: 'Invalid taskCategory.' }, { status: 400 })
    }
    if (!body.billingUnit || !Object.values(BillingUnit).includes(body.billingUnit)) {
      return NextResponse.json({ error: 'Invalid billingUnit.' }, { status: 400 })
    }

    if (
      serviceCode === ER_ADMISSION_SERVICE_CODE &&
      basePrice < MIN_ER_ADMISSION_CATALOG_IQD
    ) {
      await writeAuditLog(prisma, {
        actor: user,
        request,
        action: 'ER_ADMISSION_FEE_POLICY_VIOLATION',
        metadata: {
          entity: 'ServiceCatalog',
          severity: 'HIGH',
          details: 'Attempt to create ER_ADMISSION_FEE with basePrice below minimum baseline',
          serviceCode,
          attemptedPrice: basePrice,
        },
      })
      return NextResponse.json({ error: ER_ADMISSION_MIN_PRICE_ERROR }, { status: 400 })
    }

    const created = await prisma.serviceCatalog.create({
      data: {
        serviceCode,
        displayName,
        department: body.department,
        taskCategory: body.taskCategory,
        billingUnit: body.billingUnit,
        basePrice,
        currency,
        isActive,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    const actionLabel =
      serviceCode === ER_ADMISSION_SERVICE_CODE
        ? `Created / configured ER_ADMISSION_FEE (${displayName})`
        : `Created service catalog item: ${serviceCode}`
    await writeAuditLog(prisma, {
      actor: user,
      request,
      action: actionLabel,
      metadata: {
        serviceCode,
        displayName,
        basePrice,
        department: body.department,
      },
    })

    return NextResponse.json({ success: true, service: created }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create service.'
    if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: 'Service Code already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
