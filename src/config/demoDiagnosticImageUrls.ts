/** Demo imaging URLs used by Test Simulator (Radiology / Sonar) and Radiology UI fixtures. */
/** Stable demo chest X-ray (used when badge present but no URL). */
export const DEMO_RADIOLOGY_XRAY_IMAGE_URL =
  'https://clarksonmshealth.com/wp-content/uploads/2023/11/X-Ray-Chest-1.jpg'

/** Demo ultrasound still for dark-mode workstation previews. */
export const DEMO_SONAR_ULTRASOUND_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ultrasound_Scan_ND_116.jpg/480px-Ultrasound_Scan_ND_116.jpg'

export function normalizeExternalImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  if (!t.startsWith('https://') && !t.startsWith('http://')) return undefined
  return t
}
