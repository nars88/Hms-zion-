'use client'

import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

type SaveResponse = {
  patient: { id: string; name: string }
  visit: { id: string; publicVisitId: string }
  qrPayload: unknown
}

function printBadge(result: SaveResponse) {
  const qrSvg = document.querySelector('.er-quick-qr svg')?.outerHTML || ''
  const win = window.open('', '_blank', 'width=360,height=640')
  if (!win) return
  const safeName = result.patient.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeVisit = result.visit.publicVisitId.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeInternal = result.visit.id.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ER Badge</title>
  <style>
    @media print { @page { size: 80mm auto; margin: 4mm; } body { margin:0; } }
    body { font-family: ui-monospace,Consolas,monospace; background:#fff; color:#000; padding:10px; max-width:72mm; margin:0 auto; }
    .t { text-align:center; font-size:16px; font-weight:800; }
    .s { text-align:center; font-size:10px; color:#444; margin-top:2px; }
    .r { border-top:2px solid #000; margin:10px 0; }
    .row { display:flex; justify-content:space-between; gap:10px; font-size:11px; margin:6px 0; }
    .q { display:flex; justify-content:center; margin-top:10px; border:1px dashed #000; padding:8px; }
  </style></head><body>
    <div class="t">ZION HOSPITAL</div>
    <div class="s">ER Quick Reception</div>
    <div class="r"></div>
    <div class="row"><span>Patient</span><span>${safeName}</span></div>
    <div class="row"><span>ER ID</span><span>${safeVisit}</span></div>
    <div class="row"><span>Visit ID</span><span>${safeInternal}</span></div>
    <div class="q">${qrSvg}</div>
  </body></html>`
  win.document.open()
  win.document.write(html)
  win.document.close()
  window.setTimeout(() => {
    win.focus()
    win.print()
    win.close()
  }, 260)
}

export default function ERQuickReceptionPage() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<SaveResponse | null>(null)

  const qrPayloadString = useMemo(() => {
    if (!lastResult) return ''
    return typeof lastResult.qrPayload === 'string' ? lastResult.qrPayload : JSON.stringify(lastResult.qrPayload)
  }, [lastResult])

  const handleSave = async () => {
    const fullName = name.trim()
    const ageNum = Number(age)
    const complaint = chiefComplaint.trim()
    if (!fullName || !Number.isFinite(ageNum) || ageNum <= 0 || !complaint) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/reception/er-quick-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: fullName,
          age: ageNum,
          chiefComplaint: complaint,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        patient?: { id: string; name: string }
        visit?: { id: string; publicVisitId: string }
        qrPayload?: unknown
      }
      if (!res.ok || !data.patient || !data.visit) {
        throw new Error(data.error || 'Failed to save ER patient')
      }
      const result: SaveResponse = {
        patient: data.patient,
        visit: data.visit,
        qrPayload: data.qrPayload,
      }
      setLastResult(result)
      printBadge(result)

      // Auto reset immediately after print trigger.
      setName('')
      setAge('')
      setChiefComplaint('')
    } catch {
      // Keep UI minimal by not rendering error banners.
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']} redirectTo="/">
      <div className="flex min-h-screen flex-col bg-[#0B1120]">
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl">
            <h1 className="text-xl font-bold text-slate-100">ER Quick Reception</h1>
            <p className="mt-1 text-sm text-slate-400">Standalone intake — open via URL only</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Patient Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  placeholder="e.g. Ahmed Ali"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Age</label>
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  placeholder="e.g. 42"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Chief Complaint</label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                  placeholder="e.g. Severe chest pain for 2 hours"
                />
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-5 py-3 text-base font-bold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save & Print QR'}
              </button>
            </div>
          </div>
        </main>
      </div>

      <div className="hidden er-quick-qr">
        {qrPayloadString ? <QRCodeSVG value={qrPayloadString} size={180} includeMargin level="M" /> : null}
      </div>
    </ProtectedRoute>
  )
}
