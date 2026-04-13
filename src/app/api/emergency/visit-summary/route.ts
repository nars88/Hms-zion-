import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/emergency/visit-summary?visitId=xxx
// Medical summary for Print Summary: vitals, lab/radiology/sonar results, doctor notes.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')
    if (!visitId) {
      return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        chiefComplaint: true,
        diagnosis: true,
        notes: true,
        visitDate: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let labResults: Array<{ testType?: string; result?: string; completedAt?: string }> = []
    let radiologyResults: Array<{
      testType?: string
      result?: string
      completedAt?: string
      technicianNotes?: string
    }> = []
    let sonarResults: Array<{
      testType?: string
      result?: string
      completedAt?: string
      technicianNotes?: string
    }> = []
    let doctorMedications = ''
    let doctorLabTests = ''
    try {
      if (visit.notes) {
        const parsed = JSON.parse(visit.notes) as Record<string, unknown>
        labResults = (parsed.labResults as typeof labResults) || []
        type RawImaging = {
          testType?: string
          result?: string
          completedAt?: string
          technicianNotes?: string
          releasedToDoctorAt?: string
        }
        const rawRad = (parsed.radiologyResults as RawImaging[]) || []
        const rawSon = (parsed.sonarResults as RawImaging[]) || []
        radiologyResults = rawRad
          .filter((r) => r.releasedToDoctorAt)
          .map(({ testType, result, completedAt, technicianNotes }) => ({
            testType,
            result,
            completedAt,
            technicianNotes,
          }))
        sonarResults = rawSon
          .filter((r) => r.releasedToDoctorAt)
          .map(({ testType, result, completedAt, technicianNotes }) => ({
            testType,
            result,
            completedAt,
            technicianNotes,
          }))
        doctorMedications = (parsed.doctorMedications as string) || ''
        doctorLabTests = (parsed.doctorLabTests as string) || ''
      }
    } catch (_) {}

    const patientName = visit.patient
      ? `${visit.patient.firstName} ${visit.patient.lastName}`.trim()
      : 'Patient info missing'
    const age = visit.patient?.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(visit.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
      : null

    return NextResponse.json({
      visitId: visit.id,
      patientName,
      age,
      gender: visit.patient?.gender ?? '',
      chiefComplaint: visit.chiefComplaint,
      diagnosis: visit.diagnosis,
      visitDate: visit.visitDate,
      bedNumber: (visit as { bedNumber?: number | null }).bedNumber ?? null,
      vitals: visit.vitals[0]
        ? {
            bp: visit.vitals[0].bp,
            temperature: visit.vitals[0].temperature,
            heartRate: visit.vitals[0].heartRate,
            weight: visit.vitals[0].weight,
          }
        : null,
      labResults,
      radiologyResults,
      sonarResults,
      doctorMedications,
      doctorLabTests,
    })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Visit summary error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
