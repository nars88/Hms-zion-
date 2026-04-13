/**
 * Visit ID Generator - Unified ID Format
 * 
 * Standard Format: ZION-YYYYMMDD-XXXX (e.g., ZION-20260121-0001)
 * ER Format: ER-YYYYMMDD-XXXX (e.g., ER-20260121-0001)
 * 
 * This ensures:
 * - Consistent ID format across the system
 * - Easy identification of ER vs regular visits
 * - One-to-one link between visit and billing
 */

// Store daily counters in localStorage to ensure sequential numbering
const getDailyCounter = (prefix: string, date: string): number => {
  if (typeof window === 'undefined') return 1
  
  const key = `zionmed_visit_counter_${prefix}_${date}`
  const stored = localStorage.getItem(key)
  
  if (stored) {
    const counter = parseInt(stored, 10)
    const newCounter = counter + 1
    localStorage.setItem(key, newCounter.toString())
    return newCounter
  } else {
    localStorage.setItem(key, '1')
    return 1
  }
}

/**
 * Generate a standard clinic Visit ID
 * Format: ZION-YYYYMMDD-XXXX
 * Example: ZION-20260121-0001
 */
export function generateVisitId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const counter = getDailyCounter('ZION', dateStr)
  const counterStr = counter.toString().padStart(4, '0') // XXXX (0001, 0002, etc.)
  
  return `ZION-${dateStr}-${counterStr}`
}

/**
 * Generate an Emergency Room Visit ID
 * Format: ER-YYYYMMDD-XXXX
 * Example: ER-20260121-0001
 */
export function generateERVisitId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const counter = getDailyCounter('ER', dateStr)
  const counterStr = counter.toString().padStart(4, '0') // XXXX (0001, 0002, etc.)
  
  return `ER-${dateStr}-${counterStr}`
}

/**
 * Check if a Visit ID is an ER visit
 */
export function isERVisitId(visitId: string): boolean {
  return visitId.startsWith('ER-')
}

/**
 * Check if a Visit ID is a standard clinic visit
 */
export function isClinicVisitId(visitId: string): boolean {
  return visitId.startsWith('ZION-')
}

/**
 * Get the date from a Visit ID
 */
export function getVisitDate(visitId: string): string | null {
  const match = visitId.match(/^(ZION|ER)-(\d{8})-/)
  if (match) {
    const dateStr = match[2] // YYYYMMDD
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    return `${year}-${month}-${day}`
  }
  return null
}

