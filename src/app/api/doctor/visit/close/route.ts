import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface CloseVisitBody {
  visitId: string
  patientId: string
  doctorId: string
  finalDisposition: string // 'Discharge' | 'Admit to Ward' | 'Refer to Specialist'
  diagnosis: string
  prescription: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CloseVisitBody
    const {
      visitId,
      patientId,
      doctorId,
      finalDisposition,
      diagnosis,
      prescription,
    } = body

    if (!visitId || !patientId || !doctorId) {
      return NextResponse.json(
        { error: 'visitId, patientId and doctorId are required.' },
        { status: 400 },
      )
    }

    if (!finalDisposition) {
      return NextResponse.json(
        { error: 'Final disposition is required before closing the visit.' },
        { status: 400 },
      )
    }

    // Normalize disposition for storage
    const normalizedDisposition = finalDisposition.trim()

    // Ensure visit exists
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, patientId },
      include: { bill: true },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found for this patient.' },
        { status: 404 },
      )
    }

    // Update visit clinical data and lock disposition
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        diagnosis,
        prescription,
        finalDisposition: normalizedDisposition,
        status: 'Billing',
      },
    })

    // Auto-generate or ensure a pending bill for this visit
    const consultationFee = 50000

    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId,
          patientId,
          generatedBy: doctorId,
          items: [
            {
              department: 'Doctor',
              description: 'Doctor Consultation',
              quantity: 1,
              unitPrice: consultationFee,
              total: consultationFee,
            },
          ],
          subtotal: consultationFee,
          tax: 0,
          discount: 0,
          total: consultationFee,
          // paymentStatus defaults to "Pending"
        },
      })
    } else if (bill.paymentStatus !== 'Pending') {
      // If bill exists but not pending, we don't change totals, just ensure status is Pending
      bill = await prisma.bill.update({
        where: { id: bill.id },
        data: { paymentStatus: 'Pending' },
      })
    }

    return NextResponse.json(
      {
        success: true,
        visit: updatedVisit,
        billId: bill.id,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('❌ Error closing doctor visit:', error)
    return NextResponse.json(
      { error: 'Failed to close visit.' },
      { status: 500 },
    )
  }
}


