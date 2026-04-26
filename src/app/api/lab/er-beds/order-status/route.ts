import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type OrderKind = 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'

/** POST /api/lab/er-beds/order-status — set ER diagnostic order lifecycle (lab sample / tech start / done). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      visitId?: string
      at?: string
      kind?: OrderKind
    }
    const { visitId, at, kind } = body
    if (!visitId || at === undefined || at === null || String(at).trim() === '') {
      return NextResponse.json({ error: 'visitId and at are required' }, { status: 400 })
    }
    if (kind !== 'IN_PROGRESS' && kind !== 'SAMPLE_COLLECTED' && kind !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'kind must be IN_PROGRESS, SAMPLE_COLLECTED, or COMPLETED' },
        { status: 400 }
      )
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch {
      parsed = {}
    }

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string; content?: string }>) || []
    const idx = erOrders.findIndex((o) => String(o.at) === String(at))
    if (idx === -1) {
      return NextResponse.json({ error: 'No ER order found for this request' }, { status: 404 })
    }

    const nextStatus =
      kind === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : kind === 'SAMPLE_COLLECTED'
          ? 'SAMPLE_COLLECTED'
          : 'COMPLETED'
    const next = erOrders.map((o, i) => (i === idx ? { ...o, status: nextStatus } : o))

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        notes: JSON.stringify({ ...parsed, erOrders: next }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, kind })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Failed to update order' }, { status: 500 })
  }
}
