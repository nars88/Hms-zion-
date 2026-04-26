/**
 * ER-only: vitals + triage rules for emergency pulse on bed cards (doctor view).
 * Aligns with clinic doctor-queue thresholds for consistency.
 */
export function erVitalsEmergencyPulse(
  vitals: { bp: string; temperature: number; heartRate: number } | null | undefined,
  triageLevel: number | null | undefined
): boolean {
  if (triageLevel != null && triageLevel <= 2) return true
  if (!vitals) return false
  if (typeof vitals.temperature === 'number' && vitals.temperature > 38.5) return true
  const m = String(vitals.bp || '')
    .trim()
    .match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/)
  if (m) {
    const systolic = Number(m[1])
    const diastolic = Number(m[2])
    if (Number.isFinite(systolic) && Number.isFinite(diastolic)) {
      if (systolic >= 180 || systolic <= 90 || diastolic >= 120 || diastolic <= 60) return true
    }
  }
  if (typeof vitals.heartRate === 'number' && (vitals.heartRate >= 130 || vitals.heartRate <= 45)) return true
  return false
}
