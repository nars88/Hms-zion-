import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/emergency/doctor/append-task - Append a task to visit notes (e.g. PHARMACY_SENT)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, type, content } = body
    if (!visitId || !type) {
      return NextResponse.json({ error: 'visitId and type required' }, { status: 400 })
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
    erOrders.push({
      type: String(type),
      content: content != null ? String(content) : undefined,
      at: new Date().toISOString(),
      status: 'DONE',
    })
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders }), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error appending task:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
