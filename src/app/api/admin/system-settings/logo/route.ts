import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { writeAuditLog } from '@/lib/auditLog'
import { DEFAULT_SYSTEM_NAME, SYSTEM_SETTINGS_ID } from '@/lib/brandingConstants'
import { extensionForImageMime, removeBrandingFileIfManaged, saveBrandingLogoFile } from '@/lib/brandingStorage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 2.5 * 1024 * 1024

// POST /api/admin/system-settings/logo — ADMIN: multipart file → public/uploads/branding
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const delegate = prisma.systemSettings
    if (!delegate?.findUnique || !delegate?.upsert) {
      return NextResponse.json(
        {
          error:
            'SystemSettings is not available. Run `npx prisma generate`, apply schema (`npx prisma db push` or migrations), and restart the server.',
        },
        { status: 503 }
      )
    }

    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Missing logo file.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Logo file is too large (max 2.5 MB).' }, { status: 400 })
    }

    const mime = file.type || 'application/octet-stream'
    if (!extensionForImageMime(mime)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use PNG, JPEG, WebP, GIF, or SVG.' },
        { status: 400 }
      )
    }

    const buf = new Uint8Array(await file.arrayBuffer())
    const prev = await delegate.findUnique({
      where: { id: SYSTEM_SETTINGS_ID },
      select: { systemName: true, logoUrl: true },
    })

    const { publicPath } = await saveBrandingLogoFile(buf, mime)
    await removeBrandingFileIfManaged(prev?.logoUrl ?? null)

    const systemName = (prev?.systemName?.trim() || DEFAULT_SYSTEM_NAME).slice(0, 200)

    const updated = await delegate.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      create: {
        id: SYSTEM_SETTINGS_ID,
        systemName,
        logoUrl: publicPath,
        updatedBy: user.id,
      },
      update: {
        logoUrl: publicPath,
        updatedBy: user.id,
      },
    })

    await writeAuditLog(prisma, {
      actor: user,
      request,
      action: 'Uploaded system branding logo',
      metadata: {
        path: publicPath,
        previousHadLogo: Boolean(prev?.logoUrl),
      },
    })

    return NextResponse.json({
      success: true,
      settings: {
        systemName: updated.systemName,
        logoUrl: updated.logoUrl,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload logo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
