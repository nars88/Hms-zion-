import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

const ER_ADMISSION_FEE_IQD = 50_000

// POST /api/er/create-case
// When a nurse submits an ER case: create Visit (chiefComplaint: Emergency) + Bill with ER Admission Fee.
// patientId, patientName required; visitId optional (will create visit); generatedBy optional (userId).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId: providedVisitId, patientId, patientName, generatedBy } = body

    if (!patientId || !patientName) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, patientName' },
        { status: 400 }
      )
    }

    // Resolve generatedBy (Bill requires a valid User id)
    let creatorId = generatedBy
    if (!creatorId) {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      })
      creatorId = admin?.id ?? patientId
    }

    // Find or create visit for this patient with Emergency
    let visit = providedVisitId
      ? await prisma.visit.findUnique({ where: { id: providedVisitId }, include: { bill: true } })
      : null

    if (!visit) {
      visit = await prisma.visit.create({
        data: {
          patientId,
          status: VisitStatus.Waiting,
          chiefComplaint: 'Emergency',
          notes: 'ER case',
        },
        include: { bill: true },
      })
    }

    if (!visit || !visit.id) {
      return NextResponse.json({ error: 'Failed to create or find visit' }, { status: 500 })
    }

    const existingBill = await prisma.bill.findUnique({
      where: { visitId: visit.id },
    })

    if (existingBill) {
      return NextResponse.json({
        success: true,
        message: 'ER case and invoice already exist',
        visitId: visit.id,
        patientId: visit.patientId,
        bill: existingBill,
      })
    }

    const erFeeItem = {
      id: `ITEM-ER-${Date.now()}`,
      department: 'Doctor',
      description: 'ER Admission Fee',
      quantity: 1,
      unitPrice: ER_ADMISSION_FEE_IQD,
      total: ER_ADMISSION_FEE_IQD,
      addedAt: new Date().toISOString(),
      addedBy: creatorId,
    }

    const bill = await prisma.bill.create({
      data: {
        visitId: visit.id,
        patientId: visit.patientId,
        generatedBy: creatorId,
        items: [erFeeItem],
        subtotal: ER_ADMISSION_FEE_IQD,
        tax: 0,
        discount: 0,
        total: ER_ADMISSION_FEE_IQD,
        paymentStatus: 'Pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ER case created with pending invoice',
      visitId: visit.id,
      patientId: visit.patientId,
      patientName,
      caseType: 'Emergency',
      bill,
    })
  } catch (error: any) {
    console.error('❌ Error creating ER case:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create ER case' },
      { status: 500 }
    )
  }
}
