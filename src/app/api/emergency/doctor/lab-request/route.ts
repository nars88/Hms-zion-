import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
const DEPARTMENT_TO_TYPE: Record<DiagnosticDepartment, string> = {
  Lab: 'LAB_REQUESTED',
  Radiology: 'RADIOLOGY_REQUESTED',
  Sonar: 'SONAR_REQUESTED',
  ECG: 'ECG_REQUESTED',
}

// POST /api/emergency/doctor/lab-request - Append lab / X-Ray / Sonar request
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, content, department } = body
    if (!visitId || !content || !String(content).trim()) {
      return NextResponse.json({ error: 'visitId and content required' }, { status: 400 })
    }
    const dept: DiagnosticDepartment =
      department === 'ECG'
        ? 'ECG'
        : department === 'Radiology' || department === 'Sonar'
          ? department
          : 'Lab'
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string; department?: string }>) || []
    erOrders.push({
      type: DEPARTMENT_TO_TYPE[dept],
      content: String(content).trim(),
      at: new Date().toISOString(),
      status: 'DONE',
      department: dept,
    })
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders }), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true, message: 'Lab/X-Ray request sent' })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error creating ER lab request:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
