'use client'

import { useEffect, useMemo, useState } from 'react'
import { Printer, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { VisitStatus } from '@prisma/client'

type PatientBadgeQRModalProps = {
  patientId: string
  patientName: string
  visitId?: string | null
  caseType?: 'ER' | 'CLINIC'
  onClose: () => void
}

export default function PatientBadgeQRModal({
  patientId,
  patientName,
  visitId,
  caseType = 'CLINIC',
  onClose,
}: PatientBadgeQRModalProps) {
  const [toast, setToast] = useState<string | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [liveVisitId, setLiveVisitId] = useState<string | null>(visitId || null)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let alive = true
    let timer: number | null = null

    const fetchStatus = async () => {
      if (!patientId) return
      setStatusLoading(true)
      try {
        if (liveVisitId) {
          const res = await fetch(`/api/visits/${encodeURIComponent(liveVisitId)}`, { method: 'GET' })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error || 'Failed to fetch visit')
          const rawStatus = (data?.visit?.status as VisitStatus | undefined) ?? null
          const notes = data?.visit?.notes
          let display = rawStatus ? String(rawStatus) : null
          if (typeof notes === 'string' && notes) {
            try {
              const parsed = JSON.parse(notes)
              if (parsed?.visitType === 'EMERGENCY' || parsed?.department === 'ER') display = 'EMERGENCY'
            } catch {
              // ignore
            }
          }
          if (alive) setLiveStatus(display)
        } else {
          const res = await fetch(`/api/reception/current-visit?patientId=${encodeURIComponent(patientId)}`, { method: 'GET' })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error || 'Failed to fetch current visit')
          const v = data?.visit
          if (alive) {
            setLiveVisitId(v?.id ?? null)
            setLiveStatus(v?.displayStatus ?? (v?.status ? String(v.status) : null))
          }
        }
      } catch {
        if (alive) setLiveStatus(null)
      } finally {
        if (alive) setStatusLoading(false)
      }
    }

    fetchStatus()
    timer = window.setInterval(fetchStatus, 5000)

    return () => {
      alive = false
      if (timer) window.clearInterval(timer)
    }
  }, [patientId, liveVisitId])

  const payload = useMemo(() => {
    return JSON.stringify({
      type: caseType === 'ER' ? 'ZION_ER_BADGE' : 'ZION_PATIENT_BADGE',
      department: caseType === 'ER' ? 'ER' : 'CLINIC',
      patientId,
      visitId: liveVisitId || undefined,
      generatedAt: new Date().toISOString(),
    })
  }, [caseType, patientId, liveVisitId])

  const handlePrintThermal = () => {
    setToast('Sending to Thermal Printer...')
    const printWindow = window.open('', '_blank', 'width=360,height=640')
    if (!printWindow) return

    const safeName = patientName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safePatientId = patientId.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safeVisit = (visitId || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const content = `<!DOCTYPE html>
<html>
<head>
  <title>ZION - Patient QR</title>
  <meta charset="utf-8" />
  <style>
    @media print {
      @page { size: 80mm auto; margin: 4mm; }
      body { margin: 0; }
    }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #000;
      background: #fff;
      padding: 10px;
      max-width: 72mm;
      margin: 0 auto;
    }
    .title { text-align: center; font-weight: 800; letter-spacing: 1px; font-size: 16px; }
    .sub { text-align: center; font-size: 10px; color: #444; margin-top: 3px; }
    .rule { border-top: 2px solid #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; margin: 6px 0; }
    .label { font-weight: 700; color: #222; }
    .value { text-align: right; word-break: break-all; }
    .qr { display: flex; justify-content: center; margin: 10px 0; padding: 10px; border: 1px dashed #000; }
    .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="title">ZION HOSPITAL</div>
  <div class="sub">Patient QR Badge</div>
  <div class="rule"></div>
  <div class="row"><span class="label">Patient</span><span class="value">${safeName}</span></div>
  <div class="row"><span class="label">Patient ID</span><span class="value">${safePatientId}</span></div>
  ${safeVisit ? `<div class="row"><span class="label">Visit ID</span><span class="value">${safeVisit}</span></div>` : ''}
  <div class="qr">
    <div style="background:#fff;padding:6px;border:1px solid #000;">
      ${printWindow.opener?.document.querySelector('.zion-patient-qr-target svg')?.outerHTML || ''}
    </div>
  </div>
  <div class="footer">Generated: ${new Date().toLocaleString()}</div>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 350)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0b1220] shadow-[0_0_70px_rgba(56,189,248,0.20)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-800/50 p-5">
          <div className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-cyan-400" aria-hidden />
            <div>
              <h2 className="text-base font-bold text-primary">Print Label for {patientName}</h2>
              <p className="text-xs text-secondary">
                High-contrast thermal badge QR {caseType === 'ER' ? '· ER PRIORITY' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col items-center">
              <div className="zion-patient-qr-target rounded-2xl border border-cyan-500/20 bg-white p-4 shadow-[0_0_24px_rgba(56,189,248,0.16)]">
                <QRCodeSVG value={payload} size={180} level="M" includeMargin />
              </div>
              <p className="mt-4 text-sm font-semibold text-cyan-200">Thermal Label for Badge: READY.</p>
              <p className="mt-2 text-sm font-semibold text-slate-200">
                Status:{' '}
                <span className={liveStatus === 'EMERGENCY' ? 'text-rose-300' : 'text-cyan-200'}>
                  {statusLoading ? '...' : liveStatus || 'UNKNOWN'}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Patient ID: <span className="font-mono text-slate-300">{patientId}</span>
                {liveVisitId ? (
                  <>
                    <span className="mx-2 text-slate-700">|</span>
                    Visit ID: <span className="font-mono text-slate-300">{liveVisitId}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800/50 p-6">
          <button
            type="button"
            onClick={handlePrintThermal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_34px_rgba(14,165,233,0.30)] transition-all hover:shadow-[0_0_46px_rgba(14,165,233,0.42)]"
          >
            <Printer className="h-4 w-4" aria-hidden />
            PRINT THERMAL LABEL
          </button>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div className="rounded-full border border-cyan-500/25 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-cyan-200 shadow-[0_0_24px_rgba(56,189,248,0.18)] backdrop-blur">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  )
}

