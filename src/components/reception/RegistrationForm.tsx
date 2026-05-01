'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, CheckCircle2, Clipboard, Printer, UserRound, X } from 'lucide-react'

type Mode = 'ER' | 'CLINIC'

type SavedResult = {
  patient: { id: string; name: string; phone: string }
  visit: { id: string; publicVisitId: string; queueStatus: string }
  qrPayload: unknown
}

export default function RegistrationForm({
  mode,
  onClose,
}: {
  mode: Mode
  onClose: () => void
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Other')
  const [phone, setPhone] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState(mode === 'ER' ? 'Emergency' : 'Clinic appointment')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const title = mode === 'ER' ? 'ER Registration' : 'Clinic Registration'

  const qrPayloadString = useMemo(() => {
    if (!saved) return ''
    return typeof saved.qrPayload === 'string' ? saved.qrPayload : JSON.stringify(saved.qrPayload)
  }, [saved])

  const copyIds = async (s: SavedResult) => {
    const payload = `Public ID: ${s.visit.publicVisitId}\nVisit ID: ${s.visit.id}\nPatient ID: ${s.patient.id}`
    try {
      await navigator.clipboard.writeText(payload)
      setToast(`ID copied: ${s.visit.publicVisitId}`)
      window.setTimeout(() => setToast(null), 2200)
    } catch {
      setToast(`Saved ID: ${s.visit.publicVisitId}`)
      window.setTimeout(() => setToast(null), 2200)
    }
  }

  const saveRegistration = async (): Promise<SavedResult> => {
    const body = {
      patientType: mode,
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      age: age ? Number(age) : undefined,
      gender,
      phone: phone.trim() || undefined,
      chiefComplaint: chiefComplaint.trim() || undefined,
    }
    const res = await fetch('/api/reception/register-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      patient?: SavedResult['patient']
      visit?: SavedResult['visit']
      qrPayload?: unknown
    }
    if (!res.ok || !data.patient || !data.visit) {
      throw new Error(data.error || 'Registration failed')
    }
    return {
      patient: data.patient,
      visit: data.visit,
      qrPayload: data.qrPayload,
    }
  }

  const triggerPrint = (s: SavedResult) => {
    const printWindow = window.open('', '_blank', 'width=360,height=640')
    if (!printWindow) return

    const safeName = s.patient.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safePid = s.patient.id.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safeVid = s.visit.id.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safePub = s.visit.publicVisitId.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const qrSvg = document.querySelector('.unified-badge-qr svg')?.outerHTML || ''

    const content = `<!doctype html><html><head><meta charset="utf-8"/><title>ZION Badge</title>
      <style>
      @media print { @page { size: 80mm auto; margin: 4mm; } body { margin:0; } }
      body { font-family: ui-monospace,Consolas,monospace; background:#fff;color:#000;padding:10px;max-width:72mm;margin:0 auto; }
      .t{ text-align:center;font-weight:800;font-size:16px; } .s{ text-align:center;font-size:10px;color:#444; }
      .r{ border-top:2px solid #000;margin:10px 0; } .row{display:flex;justify-content:space-between;font-size:11px;margin:6px 0;gap:10px}
      .q{display:flex;justify-content:center;margin:10px 0;padding:10px;border:1px dashed #000}
      </style></head><body>
      <div class="t">ZION HOSPITAL</div><div class="s">${mode === 'ER' ? 'ER Badge' : 'Clinic Badge'}</div><div class="r"></div>
      <div class="row"><span>Patient</span><span>${safeName}</span></div>
      <div class="row"><span>Public ID</span><span>${safePub}</span></div>
      <div class="row"><span>Visit ID</span><span>${safeVid}</span></div>
      <div class="row"><span>Patient ID</span><span>${safePid}</span></div>
      <div class="q"><div>${qrSvg}</div></div></body></html>`

    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 280)
  }

  const handleSaveAndIssue = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await saveRegistration()
      setSaved(result)
      await copyIds(result)
      triggerPrint(result)
      window.setTimeout(() => {
        onClose()
        router.push(mode === 'ER' ? '/emergency/clinic' : '/clinic/dashboard')
      }, 450)
    } catch (e) {
      setError((e as Error).message || 'Failed to save record')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0b1220]">
        <div className="flex items-center justify-between border-b border-slate-700/50 p-4">
          <h2 className="text-base font-bold text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <label className="text-xs text-slate-400">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Date of Birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Age (optional)</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Phone {mode === 'CLINIC' ? '*' : '(optional)'}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
          </div>

          <label className="text-xs text-slate-400">Chief Complaint</label>
          <input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />

          {saved ? (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-xs text-cyan-200">
              <div className="font-semibold">Saved</div>
              <div className="mt-1 font-mono">Public ID: {saved.visit.publicVisitId}</div>
              <div className="font-mono">Visit ID: {saved.visit.id}</div>
              <button
                type="button"
                onClick={() => void copyIds(saved)}
                className="mt-2 inline-flex items-center gap-1 rounded border border-cyan-500/40 px-2 py-1 text-[11px]"
              >
                <Clipboard className="h-3 w-3" />
                Copy IDs
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy || !fullName.trim()}
            onClick={() => void handleSaveAndIssue()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-5 py-3 text-sm font-bold text-cyan-100 disabled:opacity-50"
          >
            {busy ? (
              <>
                <CheckCircle2 className="h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                Save & Issue Badge
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500">
            Atomic flow: save Patient + Visit first, then print badge and redirect.
          </p>
        </div>
      </div>

      <div className="hidden unified-badge-qr">
        {qrPayloadString ? <QRCodeSVG value={qrPayloadString} size={180} includeMargin level="M" /> : null}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-cyan-500/40 bg-slate-900/90 px-4 py-2 text-xs text-cyan-200">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

