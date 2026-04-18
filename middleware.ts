import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_API_PREFIXES = ['/api/auth', '/api/health', '/api/scanner']

function isStaticAssetPath(pathname: string) {
  return (
    pathname.includes('.') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow Next internals + static assets
  if (isStaticAssetPath(pathname)) {
    return NextResponse.next()
  }

  // Public marketing + auth entry
  if (pathname === '/' || pathname === '/login') {
    return NextResponse.next()
  }

  // API routes: allow explicitly public prefixes; otherwise require auth cookie
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    if (isPublicApi) return NextResponse.next()

    const token = request.cookies.get('zionmed_auth_token')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // All other pages require auth
  const token = request.cookies.get('zionmed_auth_token')
  const role = request.cookies.get('zionmed_user_role')

  if (!token || !role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && role.value !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
