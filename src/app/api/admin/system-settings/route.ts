import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { writeAuditLog } from '@/lib/auditLog'
import { DEFAULT_SYSTEM_NAME, SYSTEM_SETTINGS_ID } from '@/lib/brandingConstants'
import { removeBrandingFileIfManaged } from '@/lib/brandingStorage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH /api/admin/system-settings — ADMIN: update system name; optional clearLogo (logo files use POST /logo)
export async function PATCH(request: Request) {
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

    const body = (await request.json().catch(() => ({}))) as {
      systemName?: string
      clearLogo?: boolean
    }

    const systemName =
      typeof body.systemName === 'string' && body.systemName.trim()
        ? body.systemName.trim().slice(0, 200)
        : DEFAULT_SYSTEM_NAME

    const clearLogo = body.clearLogo === true

    const prev = await delegate.findUnique({
      where: { id: SYSTEM_SETTINGS_ID },
      select: { systemName: true, logoUrl: true },
    })

    if (clearLogo && prev?.logoUrl) {
      await removeBrandingFileIfManaged(prev.logoUrl)
    }

    const updated = await delegate.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      create: {
        id: SYSTEM_SETTINGS_ID,
        systemName,
        logoUrl: null,
        updatedBy: user.id,
      },
      update: {
        systemName,
        ...(clearLogo ? { logoUrl: null } : {}),
        updatedBy: user.id,
      },
    })

    await writeAuditLog(prisma, {
      actor: user,
      request,
      action: clearLogo ? 'Cleared system branding logo' : 'Updated system branding (name)',
      metadata: {
        previous: prev ? { systemName: prev.systemName, hadLogo: Boolean(prev.logoUrl) } : null,
        next: {
          systemName: updated.systemName,
          hasLogo: Boolean(updated.logoUrl),
        },
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
    const message = error instanceof Error ? error.message : 'Failed to update settings.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
