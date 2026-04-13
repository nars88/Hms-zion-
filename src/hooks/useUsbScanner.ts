import { useCallback, useEffect, useRef } from 'react'

interface UseScannerOptions {
  onScan: (code: string) => void
  minLength?: number
  maxDelay?: number
  enabled?: boolean
}

export function useUsbScanner({
  onScan,
  minLength = 4,
  maxDelay = 80,
  enabled = true,
}: UseScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const code = bufferRef.current.trim()
    bufferRef.current = ''
    if (code.length >= minLength) {
      onScan(code)
    }
  }, [minLength, onScan])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()

      // Ignore if user is typing in an input/textarea
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
        return
      }

      const now = Date.now()
      const gap = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // If gap is too large, reset buffer (user typed manually)
      if (gap > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current)
        flush()
        return
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

      // Auto-flush after delay (in case scanner doesn't send Enter)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flush, 300)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, flush, maxDelay])
}
