import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
const RESULTS_KEYS: Record<DiagnosticDepartment, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  ECG: 'ecgResults',
}

interface ResultEntry {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
}

// POST /api/lab/er-beds/result - Save diagnostic result (Lab / Radiology / Sonar) with optional file
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, at, testType, result, department, attachmentPath, technicianNotes } = body
    if (!visitId || (result !== undefined && typeof result !== 'string')) {
      return NextResponse.json({ error: 'visitId required; result must be string if provided' }, { status: 400 })
    }
    const resultText = typeof result === 'string' ? result.trim() : ''
    if (!resultText && !attachmentPath) {
      return NextResponse.json({ error: 'Provide at least result text or attachment' }, { status: 400 })
    }
    const dept: DiagnosticDepartment =
      department === 'Radiology' || department === 'Sonar' || department === 'ECG' ? department : 'Lab'
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, status: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const key = RESULTS_KEYS[dept]
    const existing = (parsed[key] as ResultEntry[]) || []
    const completedAt = new Date().toISOString()
    const isImaging = dept === 'Radiology' || dept === 'Sonar' || dept === 'ECG'
    existing.push({
      at: at || undefined,
      testType: testType || undefined,
      result: resultText || '(See attachment)',
      completedAt,
      attachmentPath: attachmentPath || undefined,
      technicianNotes:
        typeof technicianNotes === 'string' && technicianNotes.trim()
          ? technicianNotes.trim()
          : undefined,
    })

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    const updatedErOrders = isImaging
      ? erOrders
      : erOrders.map((order) => (String(order.at) === String(at) ? { ...order, status: 'COMPLETED' } : order))
    parsed.erOrders = updatedErOrders

    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[dept] = completedAt
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = visit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        notes: JSON.stringify({ ...parsed, [key]: existing }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true, completedAt, statusUpdatedToReadyForReview: wasOutForTest })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error saving lab result:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
