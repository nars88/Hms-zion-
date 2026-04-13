'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, X } from 'lucide-react'
import { useUsbScanner } from '@/hooks/useUsbScanner'

export default function GlobalScannerProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [scanToast, setScanToast] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Pages where scanner is active
  const scannerEnabled =
    pathname.startsWith('/doctor') ||
    pathname.startsWith('/accountant') ||
    pathname.startsWith('/radiology') ||
    pathname.startsWith('/lab') ||
    pathname.startsWith('/reception') ||
    pathname.startsWith('/pharmacy') ||
    pathname.startsWith('/gatekeeper') ||
    pathname.startsWith('/intake') ||
    pathname.startsWith('/emergency')

  const handleScan = useCallback(
    async (code: string) => {
      setScanError(null)

      // Try to resolve: is it a visitId or patientId?
      try {
        const res = await fetch(`/api/scanner/resolve?code=${encodeURIComponent(code)}`)
        const data = (await res.json()) as {
          type?: 'patient' | 'visit' | 'bill'
          patientId?: string
          visitId?: string
          patientName?: string
          error?: string
        }

        if (!res.ok || data.error) {
          setScanError(`Not found: ${code}`)
          setTimeout(() => setScanError(null), 3000)
          return
        }

        setScanToast(`✓ Found: ${data.patientName || code}`)
        setTimeout(() => setScanToast(null), 2000)

        // Navigate based on current role/page
        if (pathname.startsWith('/doctor')) {
          if (data.patientId) {
            router.push(`/doctor/dashboard/${encodeURIComponent(data.patientId)}`)
          }
        } else if (pathname.startsWith('/accountant') || pathname.startsWith('/gatekeeper')) {
          if (data.visitId) {
            router.push(`${pathname}?visitId=${data.visitId}`)
          }
        } else if (pathname.startsWith('/radiology') || pathname.startsWith('/lab')) {
          if (data.visitId) {
            router.push(`${pathname}?highlight=${data.visitId}`)
          }
        } else if (pathname.startsWith('/reception')) {
          if (data.patientId) {
            router.push(`/reception?patientId=${data.patientId}`)
          }
        } else if (pathname.startsWith('/pharmacy')) {
          if (data.visitId) {
            router.push(`/pharmacy/dispense?visitId=${data.visitId}`)
          }
        } else if (pathname.startsWith('/intake')) {
          if (data.patientId) {
            router.push(`/intake?patientId=${data.patientId}`)
          }
        } else if (pathname.startsWith('/emergency')) {
          if (data.patientId) {
            router.push(`/emergency/doctor?patientId=${data.patientId}`)
          }
        }
      } catch {
        setScanError('Scanner error — try again')
        setTimeout(() => setScanError(null), 3000)
      }
    },
    [pathname, router]
  )

  useUsbScanner({
    onScan: handleScan,
    enabled: scannerEnabled,
    minLength: 4,
    maxDelay: 80,
  })

  return (
    <>
      {children}

      {scannerEnabled && (
        <div className="fixed bottom-4 left-4 z-[200] flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm">
          <ScanLine className="h-3.5 w-3.5 text-emerald-400" />
          <span>Scanner ready</span>
        </div>
      )}

      {scanToast && (
        <div className="fixed bottom-14 left-4 z-[200] flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-200 shadow-lg backdrop-blur-sm">
          <ScanLine className="h-4 w-4" />
          {scanToast}
        </div>
      )}

      {scanError && (
        <div className="fixed bottom-14 left-4 z-[200] flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/20 px-4 py-2.5 text-sm font-medium text-rose-200 shadow-lg backdrop-blur-sm">
          <X className="h-4 w-4" />
          {scanError}
        </div>
      )}
    </>
  )
}
