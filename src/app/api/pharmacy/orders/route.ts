import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus, MedicationOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/pharmacy/orders
// Active medication orders only: pending/out-of-stock and not discharged.
// CLOSED orders remain in DB for history; they are excluded from the active queue.
export async function GET() {
  try {
    const orders = await prisma.medicationOrder.findMany({
      where: {
        status: { in: [MedicationOrderStatus.PENDING, MedicationOrderStatus.OUT_OF_STOCK] },
        visit: {
          status: { not: VisitStatus.Discharged },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          select: {
            id: true,
            chiefComplaint: true,
            status: true,
            patientId: true,
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
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    const list = orders.map((o) => {
      const v = o.visit
      const items = (o.items as Array<{ medicineName?: string; dosage?: string; frequency?: string; quantity?: number; unitPrice?: number; totalPrice?: number }>) || []
      return {
        id: o.id,
        visitId: o.visitId,
        status: o.status,
        totalCost: Number(o.totalCost),
        items,
        dispensedAt: o.dispensedAt?.toISOString() ?? null,
        outOfStockAt: o.outOfStockAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        patientName: v.patient ? `${v.patient.firstName} ${v.patient.lastName}`.trim() : 'Patient info missing',
        patientId: v.patientId,
        patientAllergies: v.patient?.allergies ?? null,
        doctorName: v.doctor?.name ?? 'Unknown',
        bedNumber: (v as { bedNumber?: number | null }).bedNumber ?? null,
        chiefComplaint: v.chiefComplaint,
        visitStatus: v.status,
      }
    })

    return NextResponse.json(list)
  } catch (e) {
    console.error('Pharmacy orders fetch error:', e)
    // For dashboards (Pharmacy/Admin), return empty list instead of breaking the UI
    return NextResponse.json([])
  }
}
