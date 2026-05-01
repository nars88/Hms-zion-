import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/accountant/pending-bills
// Returns all visits with COMPLETED status that have pending bills
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== UserRole.ACCOUNTANT && user.role !== UserRole.ADMIN) return forbidden()

    const bills = await prisma.bill.findMany({
      where: {
        paymentStatus: 'Pending',
        visit: {
          status: VisitStatus.COMPLETED,
        },
      },
      select: {
        id: true,
        visitId: true,
        patientId: true,
        total: true,
        paymentStatus: true,
        qrStatus: true,
        createdAt: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        visit: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            doctor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const pendingBills = bills.map((bill) => ({
      visitId: bill.visitId,
      patientId: bill.patientId,
      patientName: `${bill.patient.firstName} ${bill.patient.lastName}`,
      patientPhone: bill.patient.phone,
      doctorName: bill.visit.doctor?.name || 'Unknown',
      bill,
      visitDate: bill.visit.createdAt,
      completedAt: bill.visit.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      bills: pendingBills,
    })
  } catch (error: any) {
    console.error('❌ Error fetching pending bills:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pending bills' },
      { status: 500 }
    )
  }
}

