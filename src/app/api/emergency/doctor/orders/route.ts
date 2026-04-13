import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/emergency/doctor/orders - Save doctor medications & lab tests (Visit.notes JSON)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, medications, labTests } = body
    if (!visitId) {
      return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let erOrders: Array<{ type: string; content?: string; at: string; status?: string }> = []
    let existing: Record<string, unknown> = {}
    try {
      if (visit.notes) {
        existing = JSON.parse(visit.notes) as Record<string, unknown>
        const o = existing.erOrders
        if (Array.isArray(o)) erOrders = o as typeof erOrders
      }
    } catch (_) {}

    const now = new Date().toISOString()
    if (medications != null && String(medications).trim()) {
      erOrders.push({ type: 'MEDICATIONS', content: String(medications).trim(), at: now, status: 'PENDING' })
    }
    if (labTests != null && String(labTests).trim()) {
      erOrders.push({ type: 'LAB', content: String(labTests).trim(), at: now, status: 'PENDING' })
    }

    const notesPayload = {
      ...existing,
      doctorMedications: medications != null ? String(medications) : (existing.doctorMedications as string),
      doctorLabTests: labTests != null ? String(labTests) : (existing.doctorLabTests as string),
      erOrders,
    }
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify(notesPayload), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error saving ER doctor orders:', err)
    return NextResponse.json({ error: err?.message || 'Failed to save orders' }, { status: 500 })
  }
}
