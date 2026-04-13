import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Helper to detect if the current user is an Accountant (billing-only access)
function isAccountant(): boolean {
  const cookieStore = cookies()
  const roleCookie = cookieStore.get('zionmed_user_role')
  if (!roleCookie?.value) return false

  // Cookie stores the app role string, which should match Prisma UserRole
  return roleCookie.value === 'ACCOUNTANT'
}

// GET /api/billing/invoices
// Privacy rule:
// - ACCOUNTANT can ONLY see billing-related fields (no diagnosis / medical notes).
// - Other roles (ADMIN / DOCTOR, etc.) can extend this later if needed.
export async function GET() {
  try {
    const accountant = isAccountant()

    if (!accountant) {
      // For now, we only expose this endpoint to accountants and admins in the future.
      // Other roles should use dedicated clinical APIs.
      return NextResponse.json(
        { error: 'Forbidden: Billing data is restricted to Accountant users.' },
        { status: 403 },
      )
    }

    const bills = await prisma.bill.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        visitId: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
        subtotal: true,
        tax: true,
        discount: true,
        total: true,
        paymentStatus: true,
        paymentMethod: true,
        qrCode: true,
        qrStatus: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('❌ Error fetching invoices for billing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 },
    )
  }
}


