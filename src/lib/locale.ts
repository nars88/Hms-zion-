export function formatNumber(value: number | string): string {
  if (typeof value === 'number') return value.toLocaleString('en-US')
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toLocaleString('en-US') : String(value)
}
