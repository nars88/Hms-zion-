import { GET as resolveByQueryParam } from '../route'

export const dynamic = 'force-dynamic'

// Support /api/scanner/resolve/:code (legacy callers) by forwarding to ?code=
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const url = new URL(request.url)
  if (!url.searchParams.get('code')) {
    url.searchParams.set('code', decodeURIComponent(code || ''))
  }
  return resolveByQueryParam(new Request(url.toString(), { method: 'GET', headers: request.headers }))
}
