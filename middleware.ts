import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// ── Public paths (never touched by JWT logic) ──────────────────────────
// Exact-match paths. `/` must only be treated as public when accessed as "/",
// not as a prefix (otherwise it would match every URL).
const PUBLIC_EXACT = new Set<string>(['/', '/login'])

// Prefix-match paths. Anything starting with these is treated as public.
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/verify-role',
  '/api/system/branding',
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
  '/er-reception': ['RECEPTIONIST', 'ADMIN'],
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
const API_MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])
const API_ROLE_PREFIXES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/api/admin', roles: ['ADMIN'] },
  { prefix: '/api/employees', roles: ['ADMIN'] },
  { prefix: '/api/doctor', roles: ['DOCTOR', 'ADMIN'] },
  { prefix: '/api/emergency/doctor', roles: ['DOCTOR', 'ADMIN'] },
  { prefix: '/api/pharmacy', roles: ['PHARMACIST', 'ADMIN'] },
  { prefix: '/api/accountant', roles: ['ACCOUNTANT', 'ADMIN'] },
  { prefix: '/api/lab', roles: ['LAB_TECH', 'ADMIN'] },
  { prefix: '/api/radiology', roles: ['RADIOLOGY_TECH', 'ADMIN'] },
]

/** These prefixes require ADMIN for every method (including GET). */
const API_ADMIN_ONLY_PREFIXES = ['/api/admin', '/api/employees'] as const

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

  // ── THIRD: API routes — verify JWT + RBAC (defense in depth with route handlers)
  if (pathname.startsWith('/api/')) {
    // CORS preflight does not send cookies; do not block browsers from proceeding.
    if (request.method === 'OPTIONS') {
      return NextResponse.next()
    }
    const token = request.cookies.get('zionmed_auth_token')
    const tokenValue = token?.value?.trim()
    if (!tokenValue) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyToken(tokenValue)
    if (!payload?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    for (const prefix of API_ADMIN_ONLY_PREFIXES) {
      if (pathname.startsWith(prefix) && payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (API_MUTATING_METHODS.has(request.method.toUpperCase())) {
      for (const rule of API_ROLE_PREFIXES) {
        if (pathname.startsWith(rule.prefix) && !rule.roles.includes(payload.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
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
    // Fail-closed: do not allow navigation on slow/ambiguous verification.
    if (verifyResult === VERIFY_TIMEOUT) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('zionmed_auth_token')
      response.cookies.delete('zionmed_user_role')
      return response
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
  // Include `/api/*` so JWT + RBAC run on API routes (public `/api/auth/*` etc. still exit early above).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
