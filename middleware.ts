import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/health',
]

const PUBLIC_PAGES = [
  '/',
  '/login',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_ROUTES.some(route =>
      pathname.startsWith(route)
    )
    if (isPublicApi) return NextResponse.next()

    // Read the actual ZION Med auth cookie
    const token = request.cookies.get('zionmed_auth_token')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Handle page routes
  const isPublicPage = PUBLIC_PAGES.some(page =>
    pathname === page
  )
  if (isPublicPage) return NextResponse.next()

  // Protect all other pages
  const token = request.cookies.get('zionmed_auth_token')
  const role = request.cookies.get('zionmed_user_role')

  if (!token || !role) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect admin pages
  if (pathname.startsWith('/admin') && role.value !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/doctor/:path*',
    '/pharmacy/:path*',
    '/lab/:path*',
    '/radiology/:path*',
    '/emergency/:path*',
    '/intake/:path*',
    '/gatekeeper/:path*',
    '/accountant/:path*',
  ]
}
