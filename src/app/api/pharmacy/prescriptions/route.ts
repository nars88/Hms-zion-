import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/pharmacy/prescriptions
// Returns visits with prescriptions that are pending (not yet dispensed)
// Status should be 'Billing' (visit closed by doctor) and prescription field is not empty
export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: VisitStatus.READY_FOR_PHARMACY, // Visit sent to pharmacy by doctor
        AND: [{ prescription: { not: null } }, { prescription: { not: '' } }],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        patientId: true,
        prescription: true,
        diagnosis: true,
        chiefComplaint: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        bill: {
          select: {
            id: true,
            paymentStatus: true,
          },
        },
      },
    })

    // Parse prescription text into structured format
    const prescriptions = visits
      .filter(v => v.prescription && v.prescription.trim() !== '')
      .map(visit => {
        // Parse prescription text (format: "Medicine Name dosage - frequency\n...")
        const lines = visit.prescription!.split('\n').filter(l => l.trim())
        const items = lines.map((line, idx) => {
          // Try to parse: "Medicine Name dosage - frequency"
          const parts = line.split(' - ')
          const medicinePart = parts[0] || line
          const frequency = parts[1] || 'As prescribed'
          
          // Extract medicine name and dosage
          const medicineMatch = medicinePart.match(/^(.+?)\s+(\d+.*?)$/)
          const medicineName = medicineMatch ? medicineMatch[1].trim() : medicinePart.trim()
          const dosage = medicineMatch ? medicineMatch[2].trim() : 'As prescribed'

          return {
            id: `item-${idx}`,
            medicineName,
            dosage,
            frequency: frequency.trim(),
          }
        })

        return {
          id: `PRES-${visit.id}`,
          visitId: visit.id,
          patientId: visit.patient!.id,
          patientName: `${visit.patient!.firstName} ${visit.patient!.lastName}`,
          doctorId: visit.doctor?.id || '',
          doctorName: visit.doctor?.name || 'Unknown Doctor',
          items,
          diagnosis: visit.diagnosis || null,
          chiefComplaint: visit.chiefComplaint || null,
          status: 'Pending',
          createdAt: visit.createdAt.toISOString(),
          updatedAt: visit.updatedAt.toISOString(),
          // Include allergies for safety check
          patientAllergies: visit.patient!.allergies,
        }
      })

    return NextResponse.json(prescriptions)
  } catch (error) {
    console.error('❌ Error fetching pharmacy prescriptions:', error)
    // For dashboards, return empty list instead of 500 so UI can show empty state
    return NextResponse.json([])
  }
}

