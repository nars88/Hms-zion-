import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthBoundsUtc(year: number, monthIndex: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0))
  return { start, end }
}

function todayBoundsUtc(): { start: Date; end: Date } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0))
  return { start, end }
}

export type DashboardMonthPoint = {
  month: string
  year: number
  monthIndex: number
  revenue: number
  visits: number
}

// GET /api/admin/dashboard — ADMIN: aggregates from visits + bills (Postgres via Prisma)
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const now = new Date()
    const curY = now.getUTCFullYear()
    const curM = now.getUTCMonth()
    const { start: monthStart, end: monthEnd } = monthBoundsUtc(curY, curM)
    const { start: dayStart, end: dayEnd } = todayBoundsUtc()

    const paidStatuses = ['Paid', 'COMPLETED'] as const

    const paidRevenueWhere = {
      paymentStatus: { in: [...paidStatuses] },
      OR: [
        { paidAt: { gte: monthStart, lt: monthEnd } },
        { paidAt: null, updatedAt: { gte: monthStart, lt: monthEnd } },
      ],
    }

    const [monthRevenueAgg, monthVisitCount, monthBillCount, todayVisitCount] = await Promise.all([
      prisma.bill.aggregate({
        where: paidRevenueWhere,
        _sum: { total: true },
      }),
      prisma.visit.count({
        where: { visitDate: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.bill.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.visit.count({
        where: { visitDate: { gte: dayStart, lt: dayEnd } },
      }),
    ])

    const monthRevenueIqd = Number(monthRevenueAgg._sum.total ?? 0)

    const monthlySeries: DashboardMonthPoint[] = []
    for (let back = 5; back >= 0; back--) {
      const ref = new Date(Date.UTC(curY, curM - back, 1))
      const y = ref.getUTCFullYear()
      const m = ref.getUTCMonth()
      const { start, end } = monthBoundsUtc(y, m)

      const [revAgg, visits] = await Promise.all([
        prisma.bill.aggregate({
          where: {
            paymentStatus: { in: [...paidStatuses] },
            OR: [
              { paidAt: { gte: start, lt: end } },
              { paidAt: null, updatedAt: { gte: start, lt: end } },
            ],
          },
          _sum: { total: true },
        }),
        prisma.visit.count({
          where: { visitDate: { gte: start, lt: end } },
        }),
      ])

      monthlySeries.push({
        month: MONTH_SHORT[m],
        year: y,
        monthIndex: m,
        revenue: Number(revAgg._sum.total ?? 0),
        visits,
      })
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary: {
        monthRevenueIqd,
        monthVisitCount,
        monthBillCount,
        /** Visits whose visitDate falls on the current UTC calendar day. */
        todayVisitCount,
      },
      monthlySeries,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dashboard load failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
