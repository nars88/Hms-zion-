/**
 * Slot Locking System - Prevents double booking
 * Uses a simple in-memory lock with expiration
 */

interface SlotLock {
  key: string // doctorId-date-time
  lockedBy: string // user/receptionist ID
  lockedAt: number // timestamp
  expiresAt: number // timestamp
}

const LOCKS: Map<string, SlotLock> = new Map()
const LOCK_DURATION = 30000 // 30 seconds - enough time to complete booking

/**
 * Lock a time slot
 * @returns true if locked successfully, false if already locked
 */
export function lockSlot(doctorId: string, date: string, time: string, lockedBy: string): boolean {
  const key = `${doctorId}-${date}-${time}`
  const now = Date.now()
  
  // Check if slot is already locked
  const existingLock = LOCKS.get(key)
  if (existingLock && existingLock.expiresAt > now) {
    return false // Slot is locked
  }
  
  // Lock the slot
  LOCKS.set(key, {
    key,
    lockedBy,
    lockedAt: now,
    expiresAt: now + LOCK_DURATION,
  })
  
  // Auto-unlock after duration
  setTimeout(() => {
    LOCKS.delete(key)
  }, LOCK_DURATION)
  
  return true
}

/**
 * Unlock a time slot
 */
export function unlockSlot(doctorId: string, date: string, time: string): void {
  const key = `${doctorId}-${date}-${time}`
  LOCKS.delete(key)
}

/**
 * Check if a slot is locked
 */
export function isSlotLocked(doctorId: string, date: string, time: string): boolean {
  const key = `${doctorId}-${date}-${time}`
  const lock = LOCKS.get(key)
  if (!lock) return false
  
  // Check if lock expired
  if (lock.expiresAt <= Date.now()) {
    LOCKS.delete(key)
    return false
  }
  
  return true
}

/**
 * Clean up expired locks (call periodically)
 */
export function cleanupExpiredLocks(): void {
  const now = Date.now()
  for (const [key, lock] of Array.from(LOCKS.entries())) {
    if (lock.expiresAt <= now) {
      LOCKS.delete(key)
    }
  }
}

// Cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredLocks, 60000)
}

