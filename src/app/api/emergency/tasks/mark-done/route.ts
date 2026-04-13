import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const visitId = body.visitId
    const at = body.at
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
    let found = false
    for (const order of erOrders) {
      if (order.at === at) {
        order.status = 'DONE'
        found = true
        break
      }
    }
    if (!found) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders }), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error marking task done:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
