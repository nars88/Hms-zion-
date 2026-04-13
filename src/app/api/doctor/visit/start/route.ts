import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/doctor/visit/start
// Starts a visit and adds consultation fee to invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, doctorId, isFollowUp = false } = body

    if (!visitId || !patientId || !doctorId) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId, doctorId' },
        { status: 400 }
      )
    }

    // Update visit status to In_Consultation
    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.In_Consultation,
        doctorId: doctorId,
        updatedAt: new Date(),
      },
    })

    // Consultation fee - FREE for follow-up visits
    const consultationFee = isFollowUp ? 0 : 50000 // 50,000 IQD (or 0 for follow-up)
    const consultationDescription = isFollowUp ? 'Follow-up Consultation (Free)' : 'Doctor Consultation'

    // Find or create bill and add consultation fee
    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      // Create new bill with consultation fee
      bill = await prisma.bill.create({
        data: {
          visitId,
          patientId,
          generatedBy: doctorId,
          items: [
            {
              department: 'Doctor',
              description: consultationDescription,
              quantity: 1,
              unitPrice: consultationFee,
              total: consultationFee,
              addedAt: new Date().toISOString(),
              addedBy: doctorId,
            },
          ],
          subtotal: consultationFee,
          tax: 0,
          discount: 0,
          total: consultationFee,
          paymentStatus: 'Pending',
        },
      })
    } else {
      // Check if consultation fee already exists
      const items = (bill.items as any[]) || []
      const hasConsultationFee = items.some(
        (item: any) => item.department === 'Doctor' && item.description.includes('Consultation')
      )

      if (!hasConsultationFee) {
        // Add consultation fee to existing bill
        const newItem = {
          department: 'Doctor',
          description: consultationDescription,
          quantity: 1,
          unitPrice: consultationFee,
          total: consultationFee,
          addedAt: new Date().toISOString(),
          addedBy: doctorId,
        }

        const updatedItems = [...items, newItem]
        const subtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
        const newTotal = subtotal + Number(bill.tax ?? 0) - Number(bill.discount ?? 0)

        bill = await prisma.bill.update({
          where: { id: bill.id },
          data: {
            items: updatedItems,
            subtotal: subtotal,
            total: newTotal,
            updatedAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      visit,
      bill,
      message: 'Visit started and consultation fee added',
    })
  } catch (error: any) {
    console.error('❌ Error starting visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to start visit' },
      { status: 500 }
    )
  }
}

