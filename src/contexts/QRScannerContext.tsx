'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface QRScannerContextType {
  isScanning: boolean
  lastScannedId: string | null
  enableScanner: () => void
  disableScanner: () => void
}

const QRScannerContext = createContext<QRScannerContextType | undefined>(undefined)

// Visit ID pattern: ZION-YYYYMMDD-XXXX or VISIT-XXXXX
const VISIT_ID_PATTERN = /^(ZION|VISIT)-[\dA-Z-]+$/i

// Scanner detection settings
const SCANNER_DETECTION = {
  MIN_LENGTH: 8, // Minimum length for a valid Visit ID
  MIN_TYPING_SPEED: 10, // Extremely fast keystrokes indicate scanner
  MAX_TYPING_SPEED: 50, // Maximum milliseconds between keystrokes (scanner is very fast)
  MAX_TOTAL_TIME: 500, // Maximum total time for scanner input (500ms)
}

export function QRScannerProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user } = useAuth()
  const [isScanning, setIsScanning] = useState(false)
  const [lastScannedId, setLastScannedId] = useState<string | null>(null)
  
  // Scanner detection state
  const inputBuffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  const firstKeyTime = useRef<number>(0)
  const scannerTimeout = useRef<NodeJS.Timeout | null>(null)
  const isProcessing = useRef<boolean>(false)
  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  // Check if current focus is on an input/textarea
  const checkActiveInput = useCallback(() => {
    const activeElement = document.activeElement
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
    ) {
      // Check if it's a search input or short input (likely not a form field we want to protect)
      const input = activeElement as HTMLInputElement | HTMLTextAreaElement
      const isSearchInput = input.type === 'search' || input.placeholder?.toLowerCase().includes('search')
      const isShortInput = input.maxLength && input.maxLength < 20
      
      // If it's a regular text input/textarea (not search, not short), protect it
      if (!isSearchInput && !isShortInput && input.type !== 'number') {
        activeInputRef.current = input
        return true
      }
    }
    activeInputRef.current = null
    return false
  }, [])

  // Play beep sound
  const playBeep = useCallback(() => {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // Beep frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      // Fallback: silent if audio context fails
      console.log('Audio feedback unavailable')
    }
  }, [])

  // Navigate based on user role
  const navigateToPatientPage = useCallback((visitId: string) => {
    if (!user || isProcessing.current) return

    isProcessing.current = true
    setIsScanning(true)
    playBeep()

    // Extract patient ID from visit ID if needed
    // Visit ID format: ZION-YYYYMMDD-XXXX or VISIT-XXXXX
    const patientId = visitId // For now, use visitId directly

    // Role-based navigation
    switch (user.role) {
      case 'DOCTOR':
        router.push(`/doctor/dashboard/${encodeURIComponent(visitId)}`)
        break
      
      case 'LAB_TECH':
        router.push(`/lab?patientId=${patientId}&visitId=${visitId}`)
        break

      case 'RADIOLOGY_TECH':
        router.push(`/radiology?patientId=${patientId}&visitId=${visitId}`)
        break
      
      case 'PHARMACIST':
        router.push(`/pharmacy?patientId=${patientId}&visitId=${visitId}`)
        break
      
      case 'ACCOUNTANT':
        router.push(`/accountant?patientId=${patientId}&visitId=${visitId}`)
        break
      
      case 'SECURITY':
        router.push(`/gatekeeper?patientId=${patientId}&visitId=${visitId}`)
        break
      
      default:
        // For other roles, try to find the patient
        router.push(`/reception?patientId=${patientId}&visitId=${visitId}`)
    }

    setLastScannedId(visitId)
    
    // Reset scanning state after navigation
    setTimeout(() => {
      setIsScanning(false)
      isProcessing.current = false
    }, 1000)
  }, [user, router, playBeep])

  // Process scanner input
  const processScannerInput = useCallback((input: string) => {
    // Clean input (remove any whitespace)
    const cleaned = input.trim().toUpperCase()
    
    // Validate Visit ID pattern
    if (!VISIT_ID_PATTERN.test(cleaned) && cleaned.length < SCANNER_DETECTION.MIN_LENGTH) {
      // Not a valid Visit ID, ignore
      return false
    }

    // Check if it looks like a Visit ID
    const looksLikeVisitId = cleaned.startsWith('ZION-') || 
                             cleaned.startsWith('VISIT-') ||
                             (cleaned.length >= SCANNER_DETECTION.MIN_LENGTH && /^[A-Z0-9-]+$/.test(cleaned))

    if (looksLikeVisitId) {
      navigateToPatientPage(cleaned)
      return true
    }

    return false
  }, [navigateToPatientPage])

  // Handle keyboard input
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if currently processing
    if (isProcessing.current) {
      return
    }

    // Check if user is typing in a protected input field
    if (checkActiveInput()) {
      // User is typing in a form field, don't intercept
      return
    }

    const now = Date.now()
    const key = typeof event.key === 'string' ? event.key : ''

    // Handle Enter key (scanner sends Enter at the end)
    if (key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      if (inputBuffer.current.length >= SCANNER_DETECTION.MIN_LENGTH) {
        // Process the scanned input
        const wasProcessed = processScannerInput(inputBuffer.current)
        
        if (wasProcessed) {
          // Clear buffer after processing
          inputBuffer.current = ''
          firstKeyTime.current = 0
          lastKeyTime.current = 0
          
          if (scannerTimeout.current) {
            clearTimeout(scannerTimeout.current)
            scannerTimeout.current = null
          }
        }
      } else {
        // Too short, probably not a scanner input
        inputBuffer.current = ''
        firstKeyTime.current = 0
        lastKeyTime.current = 0
      }
      return
    }

    // Handle regular characters
    if (key && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Check timing to detect scanner input
      if (firstKeyTime.current === 0) {
        // First character
        firstKeyTime.current = now
        lastKeyTime.current = now
        inputBuffer.current = key
      } else {
        const timeSinceLastKey = now - lastKeyTime.current
        const totalTime = now - firstKeyTime.current

        // If too slow between keystrokes, it's manual typing
        if (timeSinceLastKey > SCANNER_DETECTION.MAX_TYPING_SPEED) {
          // Reset buffer - this is manual typing
          inputBuffer.current = key
          firstKeyTime.current = now
          lastKeyTime.current = now
        } else if (totalTime > SCANNER_DETECTION.MAX_TOTAL_TIME) {
          // Too long overall, reset
          inputBuffer.current = key
          firstKeyTime.current = now
          lastKeyTime.current = now
        } else {
          // Fast typing, likely scanner (but check if it's too fast to be human)
          // If keystrokes are extremely fast (< 10ms), definitely scanner
          if (timeSinceLastKey < SCANNER_DETECTION.MIN_TYPING_SPEED || 
              (timeSinceLastKey < SCANNER_DETECTION.MAX_TYPING_SPEED && totalTime < SCANNER_DETECTION.MAX_TOTAL_TIME)) {
            inputBuffer.current += key
            lastKeyTime.current = now
          } else {
            // Reset - might be manual typing
            inputBuffer.current = key
            firstKeyTime.current = now
            lastKeyTime.current = now
          }
        }
      }

      // Clear buffer if no activity for a while (manual typing detected)
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current)
      }
      
      scannerTimeout.current = setTimeout(() => {
        inputBuffer.current = ''
        firstKeyTime.current = 0
        lastKeyTime.current = 0
      }, SCANNER_DETECTION.MAX_TYPING_SPEED * 2)
    } else {
      // Special key pressed, reset buffer
      inputBuffer.current = ''
      firstKeyTime.current = 0
      lastKeyTime.current = 0
    }
  }, [checkActiveInput, processScannerInput])

  // Setup global keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener)
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current)
      }
    }
  }, [handleKeyDown])

  const enableScanner = useCallback(() => {
    // Scanner is always enabled, this is for future use
  }, [])

  const disableScanner = useCallback(() => {
    // Can disable temporarily if needed
    inputBuffer.current = ''
    firstKeyTime.current = 0
    lastKeyTime.current = 0
  }, [])

  return (
    <QRScannerContext.Provider
      value={{
        isScanning,
        lastScannedId,
        enableScanner,
        disableScanner,
      }}
    >
      {children}
      {/* Loading Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-xl p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent"></div>
              <p className="text-xl font-semibold text-cyan-400">Processing QR Code...</p>
              <p className="text-sm text-secondary">Navigating to patient page</p>
            </div>
          </div>
        </div>
      )}
    </QRScannerContext.Provider>
  )
}

export function useQRScanner() {
  const context = useContext(QRScannerContext)
  if (context === undefined) {
    throw new Error('useQRScanner must be used within a QRScannerProvider')
  }
  return context
}

