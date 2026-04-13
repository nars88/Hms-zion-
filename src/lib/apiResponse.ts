import { NextResponse } from 'next/server'

/**
 * Consistent API response helpers for route handlers.
 * Use these so all API errors have the same shape and status codes.
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T = unknown>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function apiNotFound(message: string = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function apiUnauthorized(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function apiServerError(message: string = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}
