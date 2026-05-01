import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { ensureErAdmissionBill } from '@/lib/billing/erAdmission'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/er/create-case
// When a nurse submits an ER case: create Visit (chiefComplaint: Emergency) + Bill with ER Admission Fee.
// patientId, patientName required; visitId optional (will create visit); generatedBy optional (userId).
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'ER_INTAKE_NURSE', 'INTAKE_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

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

    const bill = await ensureErAdmissionBill({
      visitId: visit.id,
      patientId: visit.patientId,
      generatedBy: creatorId,
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
