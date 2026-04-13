import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png']

// POST /api/upload/diagnostic - Upload PDF/JPG/PNG for diagnostic result (linked to visitId)
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const visitId = formData.get('visitId') as string | null
    if (!file || !visitId?.trim()) {
      return NextResponse.json({ error: 'file and visitId required' }, { status: 400 })
    }
    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, and PNG are allowed' }, { status: 400 })
    }
    const safeVisitId = visitId.replace(/[^a-zA-Z0-9-_]/g, '_')
    const timestamp = Date.now()
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'diagnostics', safeVisitId)
    await mkdir(baseDir, { recursive: true })
    const safeName = `${timestamp}${ext}`
    const filePath = path.join(baseDir, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    // URL path (no leading slash for path.join; for URL we use /uploads/...)
    const urlPath = `/uploads/diagnostics/${safeVisitId}/${safeName}`
    return NextResponse.json({ path: urlPath })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error uploading diagnostic file:', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
