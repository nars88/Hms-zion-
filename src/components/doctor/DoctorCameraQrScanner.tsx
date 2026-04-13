'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

export type DoctorCameraQrScannerProps = {
  open: boolean
  onClose: () => void
  onDecoded: (text: string) => void
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (image: ImageBitmapSource) => Promise<{ rawValue?: string }[]>
    }
  }
}

export function DoctorCameraQrScanner({ open, onClose, onDecoded }: DoctorCameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const onDecodedRef = useRef(onDecoded)
  const onCloseRef = useRef(onClose)
  const [error, setError] = useState<string | null>(null)
  const [manualId, setManualId] = useState('')
  const [hasDetector, setHasDetector] = useState(false)

  useEffect(() => {
    onDecodedRef.current = onDecoded
    onCloseRef.current = onClose
  }, [onDecoded, onClose])

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
      setError(null)
      setManualId('')
      return
    }

    const BarcodeDetectorCls = typeof window !== 'undefined' ? window.BarcodeDetector : undefined
    if (!BarcodeDetectorCls) {
      setHasDetector(false)
      setError(null)
      return
    }

    setHasDetector(true)
    let cancelled = false

    ;(async () => {
      try {
        setError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const el = videoRef.current
        if (!el) return
        el.srcObject = stream
        await el.play()

        const detector = new BarcodeDetectorCls({ formats: ['qr_code'] })

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const raw = codes[0]?.rawValue?.trim()
            if (raw) {
              stopCamera()
              onDecodedRef.current(raw)
              onCloseRef.current()
              return
            }
          } catch {
            /* frame errors — continue */
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || 'Could not access camera')
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, stopCamera])

  if (!open) return null

  const submitManual = () => {
    const t = manualId.trim()
    if (!t) return
    onDecodedRef.current(t)
    onCloseRef.current()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-950/80 shadow-[0_0_48px_rgba(34,211,238,0.2)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="qr-scan-title"
      >
        <div className="flex items-center justify-between border-b border-cyan-500/15 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
              <Camera className="h-4 w-4 text-cyan-300" aria-hidden />
            </div>
            <h2 id="qr-scan-title" className="text-sm font-bold tracking-wide text-cyan-100">
              Scan patient ID
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {hasDetector ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-black/60 shadow-[inset_0_0_32px_rgba(34,211,238,0.06)]">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]" />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">
              Live QR scan uses your camera (Chrome / Edge). You can enter a visit ID below, or use a USB
              scanner on this page — it will route automatically.
            </p>
          )}

          {error ? <p className="text-sm text-amber-400">{error}</p> : null}

          <div className="rounded-xl border border-blue-500/20 bg-white/[0.03] p-3 backdrop-blur-sm">
            <label htmlFor="manual-visit-id" className="text-[10px] font-bold uppercase tracking-wider text-blue-300/90">
              Or enter visit / patient ID
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="manual-visit-id"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                placeholder="Paste scanned code…"
                className="min-w-0 flex-1 rounded-lg border border-slate-600/80 bg-[#0a0f1e]/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              <button
                type="button"
                onClick={submitManual}
                className="shrink-0 rounded-lg bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
