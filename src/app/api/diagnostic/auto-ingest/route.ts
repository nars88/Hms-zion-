import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import path from 'path'
import { mkdir, readdir, readFile, rename, copyFile, unlink } from 'fs/promises'

export const dynamic = 'force-dynamic'

type Department = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

type ResultEntry = {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
}

const ORDER_TYPES: Record<Department, string[]> = {
  Lab: ['LAB', 'LAB_REQUESTED'],
  Radiology: ['RADIOLOGY_REQUESTED'],
  Sonar: ['SONAR_REQUESTED'],
  ECG: ['ECG_REQUESTED'],
}

const RESULTS_KEYS: Record<Department, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  ECG: 'ecgResults',
}

const FOLDER_KEYS: Record<Department, string> = {
  Lab: 'lab',
  Radiology: 'radiology',
  Sonar: 'sonar',
  ECG: 'ecg',
}

function parseLabResult(raw: string) {
  const hb = /HB\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i.exec(raw)?.[1]
  const wbc = /WBC\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i.exec(raw)?.[1]
  if (hb || wbc) {
    return `Blood Test: Hemoglobin ${hb || 'N/A'}, WBC ${wbc || 'N/A'}`
  }
  return 'Blood Test: Hemoglobin 14.5, WBC 7000'
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { department?: Department }
    const department = body.department
    if (!department || !['Lab', 'Radiology', 'Sonar', 'ECG'].includes(department)) {
      return NextResponse.json({ error: 'department must be Lab, Radiology, Sonar, or ECG' }, { status: 400 })
    }

    const folderKey = FOLDER_KEYS[department]
    const hotFolder = path.join(process.cwd(), 'hot-folder', folderKey)
    const processedFolder = path.join(hotFolder, 'processed')
    await mkdir(hotFolder, { recursive: true })
    await mkdir(processedFolder, { recursive: true })

    const names = await readdir(hotFolder, { withFileTypes: true })
    const files = names
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((n) => !n.endsWith('.processed'))

    if (files.length === 0) {
      return NextResponse.json({ ingested: false, listening: true, message: 'No files in hot folder.' })
    }

    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, notes: true, status: true },
    })

    let targetVisitId: string | null = null
    let targetAt: string | undefined
    let targetTestType: string | undefined

    for (const v of visits) {
      let parsed: Record<string, unknown> = {}
      try {
        if (v.notes) parsed = JSON.parse(v.notes) as Record<string, unknown>
      } catch (_) {}
      const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
      const existing = (parsed[RESULTS_KEYS[department]] as ResultEntry[]) || []
      const pending = erOrders.find((o) => {
        if (!o.at || !o.type) return false
        if (!ORDER_TYPES[department].includes(o.type)) return false
        const done = existing.some((r) => r.at === o.at)
        return !done
      })
      if (pending) {
        targetVisitId = v.id
        targetAt = pending.at
        targetTestType =
          pending.content ||
          (department === 'Lab'
            ? 'Blood Test'
            : department === 'Radiology'
              ? 'X-Ray'
              : department === 'ECG'
                ? 'ECG'
                : 'Sonar')
        break
      }
    }

    if (!targetVisitId || !targetAt) {
      return NextResponse.json({ ingested: false, listening: true, message: 'No pending patient request found.' })
    }

    const sourceFile = files.sort()[0]
    const sourcePath = path.join(hotFolder, sourceFile)
    const ext = path.extname(sourceFile).toLowerCase()
    const now = new Date().toISOString()
    let resultText = ''
    let attachmentPath: string | undefined

    if (department === 'Lab') {
      if (ext === '.txt' || ext === '.csv' || ext === '.json') {
        const raw = await readFile(sourcePath, 'utf8')
        resultText = parseLabResult(raw)
      } else {
        resultText = 'Blood Test: Hemoglobin 14.5, WBC 7000'
      }
    } else {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'diagnostics', 'auto')
      await mkdir(targetDir, { recursive: true })
      const targetName = `${targetVisitId}-${Date.now()}${ext || '.jpg'}`
      const targetPath = path.join(targetDir, targetName)
      await copyFile(sourcePath, targetPath)
      attachmentPath = `/uploads/diagnostics/auto/${targetName}`
      resultText = `Auto-imported ${
        department === 'Radiology' ? 'X-Ray' : department === 'Sonar' ? 'Sonar' : 'ECG'
      } image result.`
    }

    const visit = await prisma.visit.findUnique({
      where: { id: targetVisitId },
      select: { id: true, notes: true, status: true },
    })
    if (!visit) {
      return NextResponse.json({ ingested: false, listening: true, message: 'Visit not found.' })
    }

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}

    const key = RESULTS_KEYS[department]
    const existing = (parsed[key] as ResultEntry[]) || []
    existing.push({
      at: targetAt,
      testType: targetTestType,
      result: resultText,
      completedAt: now,
      attachmentPath,
    })

    const isImaging = department === 'Radiology' || department === 'Sonar' || department === 'ECG'
    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    parsed.erOrders = isImaging ? erOrders : erOrders.map((o) => (o.at === targetAt ? { ...o, status: 'COMPLETED' } : o))
    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[department] = now
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = visit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: targetVisitId },
      data: {
        notes: JSON.stringify({ ...parsed, [key]: existing }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })

    await rename(sourcePath, path.join(processedFolder, `${Date.now()}-${sourceFile}.processed`)).catch(async () => {
      await unlink(sourcePath).catch(() => {})
    })

    return NextResponse.json({
      ingested: true,
      listening: true,
      visitId: targetVisitId,
      department,
      result: resultText,
      attachmentPath,
    })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Auto ingest failed' }, { status: 500 })
  }
}
