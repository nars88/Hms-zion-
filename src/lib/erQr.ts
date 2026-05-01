import { createHmac, timingSafeEqual } from 'crypto'

export type ERQrPayload = {
  version: 1
  type: 'ZION_ER_BADGE'
  patientId: string
  visitId: string
  issuedAt: string
  signature: string
}

const DEFAULT_BADGE_TTL_MINUTES = 60 * 24

function getQrSecret(): string {
  return process.env.QR_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || 'zion-er-default-secret'
}

function getBadgeTtlMinutes(): number {
  const raw = Number(process.env.ER_BADGE_TTL_MINUTES ?? DEFAULT_BADGE_TTL_MINUTES)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_BADGE_TTL_MINUTES
  return Math.floor(raw)
}

function canonicalString(input: Omit<ERQrPayload, 'signature'>): string {
  return `${input.version}|${input.type}|${input.patientId}|${input.visitId}|${input.issuedAt}`
}

export function signErQrPayload(input: Omit<ERQrPayload, 'signature'>): string {
  return createHmac('sha256', getQrSecret()).update(canonicalString(input)).digest('hex')
}

export function createErQrPayload(patientId: string, visitId: string): ERQrPayload {
  const base: Omit<ERQrPayload, 'signature'> = {
    version: 1,
    type: 'ZION_ER_BADGE',
    patientId,
    visitId,
    issuedAt: new Date().toISOString(),
  }
  return { ...base, signature: signErQrPayload(base) }
}

function isValidIsoDate(value: string): boolean {
  const ts = Date.parse(value)
  return Number.isFinite(ts)
}

export function verifyBadgePayload(raw: unknown): ERQrPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<ERQrPayload>
  if (
    data.version !== 1 ||
    data.type !== 'ZION_ER_BADGE' ||
    typeof data.patientId !== 'string' ||
    typeof data.visitId !== 'string' ||
    typeof data.issuedAt !== 'string' ||
    typeof data.signature !== 'string'
  ) {
    return null
  }

  if (!isValidIsoDate(data.issuedAt)) {
    return null
  }

  const issuedAtTs = Date.parse(data.issuedAt)
  const ageMs = Date.now() - issuedAtTs
  const maxAgeMs = getBadgeTtlMinutes() * 60 * 1000
  if (ageMs < 0 || ageMs > maxAgeMs) {
    return null
  }

  const expected = signErQrPayload({
    version: data.version,
    type: data.type,
    patientId: data.patientId,
    visitId: data.visitId,
    issuedAt: data.issuedAt,
  })
  const provided = data.signature
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? (data as ERQrPayload) : null
}

export function verifyErQrPayload(raw: unknown): raw is ERQrPayload {
  return verifyBadgePayload(raw) !== null
}
