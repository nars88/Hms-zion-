import { NextResponse } from 'next/server'
import { EmergencyTaskCategory, EmergencyTaskStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { categoryToResultCardType, type ErResultCardType } from '@/lib/erClinicalBroadcast'

export const dynamic = 'force-dynamic'

const DIAGNOSTIC: EmergencyTaskCategory[] = [
  EmergencyTaskCategory.DIAGNOSTIC_LAB,
  EmergencyTaskCategory.DIAGNOSTIC_RADIOLOGY,
  EmergencyTaskCategory.DIAGNOSTIC_SONAR,
  EmergencyTaskCategory.DIAGNOSTIC_ECG,
]

// GET /api/emergency/result-notifications?since=ISO
// Released diagnostic tasks after `since` (for ER doctor live updates).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sinceRaw = searchParams.get('since')
    let since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 120_000)
    if (Number.isNaN(since.getTime())) since = new Date(Date.now() - 120_000)

    const rows = await prisma.emergencyTask.findMany({
      where: {
        status: EmergencyTaskStatus.RELEASED,
        releasedAt: { gt: since },
        category: { in: DIAGNOSTIC },
      },
      orderBy: { releasedAt: 'asc' },
      take: 20,
      select: {
        id: true,
        visitId: true,
        title: true,
        releasedAt: true,
        category: true,
        service: { select: { displayName: true } },
        visit: {
          select: {
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    const events = rows
      .map((row) => {
        const resultCardType = categoryToResultCardType(row.category)
        if (!resultCardType || !row.releasedAt) return null
        const p = row.visit.patient
        const patientName = p ? `${p.firstName} ${p.lastName}`.trim() : 'Patient'
        const testType = row.service?.displayName?.trim() || row.title
        return {
          taskId: row.id,
          visitId: row.visitId,
          patientName,
          testType,
          resultCardType,
          releasedAt: row.releasedAt.toISOString(),
        }
      })
      .filter(Boolean) as Array<{
      taskId: string
      visitId: string
      patientName: string
      testType: string
      resultCardType: ErResultCardType
      releasedAt: string
    }>

    return NextResponse.json({ events, serverNow: new Date().toISOString() })
  } catch (e: unknown) {
    const err = e as Error
    const msg = err?.message || 'Failed to load notifications'
    // Keep ER dashboard alive under pool saturation.
    if (msg.includes('Timed out fetching a new connection')) {
      return NextResponse.json({ events: [], serverNow: new Date().toISOString(), degraded: true })
    }
    console.error('result-notifications', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
