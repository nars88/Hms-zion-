import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// ── Public paths (never touched by JWT logic) ──────────────────────────
// Exact-match paths. `/` must only be treated as public when accessed as "/",
// not as a prefix (otherwise it would match every URL).
const PUBLIC_EXACT = new Set<string>(['/login'])

// Prefix-match paths. Anything starting with these is treated as public.
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/verify-role',
  '/api/health',
  '/api/scanner',
  '/_next',
  '/favicon',
]

// Static asset file extensions that should always bypass middleware.
const STATIC_FILE_RE = /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|map|woff|woff2|ttf|otf)$/i

// ── Role-based page protection ─────────────────────────────────────────
// ADMIN is implicitly allowed everywhere; everyone else is bound here.
// Longer prefixes first (checked in order below).
const ROLE_ROUTES: Record<string, string[]> = {
  '/er/mobile-tasks': ['ER_NURSE', 'ADMIN'],
  '/er/vitals-station': ['ER_INTAKE_NURSE', 'ADMIN'],
  '/er/clinic': ['DOCTOR', 'ADMIN'],
  '/er/dashboard': ['DOCTOR', 'ADMIN'],
  '/secretary': ['SECRETARY', 'ADMIN'],
  '/doctor': ['DOCTOR', 'ADMIN'],
  '/lab': ['LAB_TECH', 'ADMIN'],
  '/radiology': ['RADIOLOGY_TECH', 'ADMIN'],
  '/pharmacy': ['PHARMACIST', 'ADMIN'],
  '/accountant': ['ACCOUNTANT', 'ADMIN'],
  '/gatekeeper': ['SECURITY', 'ADMIN'],
  '/intake': ['INTAKE_NURSE', 'ADMIN'],
  '/reception': ['RECEPTIONIST', 'ADMIN'],
}

const ROLE_ROUTE_ENTRIES = Object.entries(ROLE_ROUTES).sort((a, b) => b[0].length - a[0].length)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Anonymous marketing `/` — no cookie → skip auth entirely.
  if ((pathname === '/' || pathname === '') && !request.cookies.get('zionmed_auth_token')?.value?.trim()) {
    return NextResponse.next()
  }

  // ── FIRST: public paths (exact + prefix) ──
  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // ── SECOND: static files ──
  if (STATIC_FILE_RE.test(pathname)) return NextResponse.next()

  // ── THIRD: API routes — token presence only, handlers re-verify ──
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get('zionmed_auth_token')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── FOURTH: protected pages — full JWT verification ──
  const tokenValue = request.cookies.get('zionmed_auth_token')?.value?.trim()
  if (!tokenValue) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const VERIFY_TIMEOUT = Symbol('VERIFY_TIMEOUT')
  let payload: Awaited<ReturnType<typeof verifyToken>> | null = null
  try {
    const verifyResult = await Promise.race<
      Awaited<ReturnType<typeof verifyToken>> | typeof VERIFY_TIMEOUT
    >([
      verifyToken(tokenValue),
      new Promise<typeof VERIFY_TIMEOUT>((resolve) => setTimeout(() => resolve(VERIFY_TIMEOUT), 2000)),
    ])
    // Fail-open on timeout only: avoid UI lock/hang if runtime is slow.
    if (verifyResult === VERIFY_TIMEOUT) {
      return NextResponse.next()
    }
    payload = verifyResult
  } catch {
    payload = null
  }

  if (!payload?.role) {
    // Tampered / expired token → wipe cookies and force re-login.
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('zionmed_auth_token')
    response.cookies.delete('zionmed_user_role')
    return response
  }

  // ADMIN all-access pass for admin panel routes.
  if (pathname.startsWith('/admin') && payload.role === 'ADMIN') {
    return NextResponse.next()
  }

  // Admin-only area for non-admins.
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Alias → canonical ER vitals terminal.
  if (pathname === '/er/vitals') {
    const dest = new URL(request.url)
    dest.pathname = '/er/vitals-station'
    return NextResponse.redirect(dest)
  }

  // Dedicated ER vitals-room account: no reception, intake queue, or doctor ER UI.
  if (payload.role === 'ER_INTAKE_NURSE') {
    if (!pathname.startsWith('/er/vitals-station')) {
      return NextResponse.redirect(new URL('/er/vitals-station', request.url))
    }
    return NextResponse.next()
  }

  // Legacy /emergency/* → canonical /er/* (JWT already verified).
  if (pathname.startsWith('/emergency')) {
    let targetPath: string | null = null
    if (pathname.startsWith('/emergency/nurse')) {
      targetPath = '/er/mobile-tasks'
    } else if (pathname.startsWith('/emergency/vitals')) {
      targetPath = '/er/vitals-station'
    } else if (pathname.startsWith('/emergency/doctor')) {
      targetPath = '/er/clinic'
    } else if (pathname.startsWith('/emergency/dashboard')) {
      if (payload.role === 'DOCTOR' || payload.role === 'ADMIN') targetPath = '/er/dashboard'
      else if (payload.role === 'ER_NURSE') targetPath = '/er/mobile-tasks'
      else if (payload.role === 'INTAKE_NURSE') targetPath = '/intake'
      else targetPath = '/'
    } else {
      if (payload.role === 'DOCTOR' || payload.role === 'ADMIN') targetPath = '/er/dashboard'
      else if (payload.role === 'ER_NURSE') targetPath = '/er/mobile-tasks'
      else if (payload.role === 'INTAKE_NURSE') targetPath = '/intake'
      else targetPath = '/'
    }
    if (targetPath) {
      return NextResponse.redirect(new URL(targetPath, request.url))
    }
  }

  // Role-based page protection (longest route prefix wins).
  for (const [route, allowedRoles] of ROLE_ROUTE_ENTRIES) {
    if (pathname.startsWith(route) && !allowedRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}
