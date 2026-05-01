import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

/** Public URL path prefix for uploaded logos (served from `public/uploads/branding`). */
export const BRANDING_PUBLIC_PREFIX = '/uploads/branding/'

const ALLOWED_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

export function extensionForImageMime(mime: string): string | null {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  return ALLOWED_MIME[m] ?? null
}

export function brandingUploadDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', 'branding')
}

export function isManagedBrandingAsset(stored: string | null | undefined): boolean {
  if (!stored || typeof stored !== 'string') return false
  const t = stored.trim()
  if (!t.startsWith(BRANDING_PUBLIC_PREFIX)) return false
  if (t.includes('..') || t.includes('\\')) return false
  const base = path.basename(t)
  return Boolean(base && base !== '.' && base !== '..')
}

/** Remove a file under public/uploads/branding if `stored` is a managed path. */
export async function removeBrandingFileIfManaged(stored: string | null | undefined): Promise<void> {
  if (!isManagedBrandingAsset(stored)) return
  const name = path.basename(stored!.trim())
  const abs = path.join(brandingUploadDir(), name)
  const root = path.resolve(brandingUploadDir())
  if (!path.resolve(abs).startsWith(root)) return
  try {
    await unlink(abs)
  } catch {
    // ignore missing file
  }
}

export async function saveBrandingLogoFile(
  bytes: Uint8Array,
  mime: string
): Promise<{ publicPath: string; filename: string }> {
  const ext = extensionForImageMime(mime)
  if (!ext) {
    throw new Error('Unsupported image type. Use PNG, JPEG, WebP, GIF, or SVG.')
  }
  const maxBytes = 2.5 * 1024 * 1024
  if (bytes.byteLength > maxBytes) {
    throw new Error('Logo file is too large (max 2.5 MB).')
  }

  const dir = brandingUploadDir()
  await mkdir(dir, { recursive: true })

  const { randomUUID } = await import('crypto')
  const filename = `logo-${randomUUID()}${ext}`
  const abs = path.join(dir, filename)
  await writeFile(abs, bytes)

  return { publicPath: `${BRANDING_PUBLIC_PREFIX}${filename}`, filename }
}
