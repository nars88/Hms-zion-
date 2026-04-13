import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, MedicationOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/doctor/visit/send-to-pharmacy
// Updates visit status to READY_FOR_PHARMACY and saves prescription
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, doctorId, prescriptionItems, diagnosis } = body

    if (!patientId || !doctorId) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, doctorId' },
        { status: 400 }
      )
    }

    if (!prescriptionItems || prescriptionItems.length === 0) {
      return NextResponse.json(
        { error: 'Prescription items are required' },
        { status: 400 }
      )
    }

    // Find the visit - try by visitId first, then by patientId
    let visit = null
    
    // First, try to find by visitId if provided
    if (visitId && visitId.trim() !== '') {
      try {
        visit = await prisma.visit.findFirst({
          where: { 
            id: visitId,
            patientId: patientId 
          },
        })
      } catch (err) {
        console.log('Visit not found by visitId, trying patientId...')
      }
    }

    // If not found by visitId, find the most recent active visit for this patient
    if (!visit) {
      visit = await prisma.visit.findFirst({
        where: {
          patientId: patientId,
          status: { in: [VisitStatus.Waiting, VisitStatus.In_Consultation] },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    // If still no visit found, create a new one
    if (!visit) {
      console.log(`Creating new visit for patient ${patientId}`)
      visit = await prisma.visit.create({
        data: {
          patientId: patientId,
          doctorId: doctorId,
          status: VisitStatus.READY_FOR_PHARMACY,
          chiefComplaint: 'Clinic visit',
        },
      })
    }

    if (!visit || !visit.id) {
      throw new Error('Failed to find or create visit for patient')
    }

    // Format prescription as text string (matching the schema)
    const prescriptionText = prescriptionItems
      .map((item: any) => `${item.medicineName || item.medicine} ${item.dosage || ''} - ${item.frequency || ''}`)
      .join('\n')

    // Update visit status to READY_FOR_PHARMACY
    const updatedVisit = await prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: VisitStatus.READY_FOR_PHARMACY,
        doctorId: doctorId,
        diagnosis: diagnosis || null,
        prescription: prescriptionText || null,
        updatedAt: new Date(),
      },
    })

    // Create or update MedicationOrder (visit-based) for pharmacy feed
    const orderItems = (prescriptionItems as Array<{ medicineName?: string; medicine?: string; dosage?: string; frequency?: string }>).map((item) => ({
      medicineName: item.medicineName || item.medicine || '',
      dosage: item.dosage || '',
      frequency: item.frequency || 'As prescribed',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }))
    await prisma.medicationOrder.upsert({
      where: { visitId: visit.id },
      create: {
        visitId: visit.id,
        status: MedicationOrderStatus.PENDING,
        totalCost: 0,
        items: orderItems,
      },
      update: {
        status: MedicationOrderStatus.PENDING,
        totalCost: 0,
        items: orderItems,
        dispensedAt: null,
        outOfStockAt: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      visit: updatedVisit,
      message: 'Prescription sent to pharmacy successfully',
    })
  } catch (error: any) {
    console.error('❌ Error sending prescription to pharmacy:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send prescription to pharmacy' },
      { status: 500 }
    )
  }
}

