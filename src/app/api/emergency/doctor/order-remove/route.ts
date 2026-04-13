import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/emergency/doctor/order-remove - Remove one order from erOrders by timestamp (at)
// So it disappears from Lab, Radiology, Sonar, and Nurse task views.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, at } = body
    if (!visitId || !at) {
      return NextResponse.json({ error: 'visitId and at required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string }>) || []
    const filtered = erOrders.filter((o) => o.at !== at)
    if (filtered.length === erOrders.length) {
      return NextResponse.json({ error: 'Order not found for this visit' }, { status: 404 })
    }
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders: filtered }), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true, message: 'Order removed' })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error removing order:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
