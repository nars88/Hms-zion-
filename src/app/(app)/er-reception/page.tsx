'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, User, Printer, CheckCircle2, ListOrdered, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type RegistrationStep = 'form' | 'success'

type PatientData = {
  visitId: string
  patientId: string
  patientName: string
  age: string
  chiefComplaint: string
  qrUrl: string
  createdAt: string
}

type TodayPatient = {
  visitId: string
  patientId: string
  name: string
  createdAt: string
}

export default function ERReceptionPage() {
  const { logout } = useAuth()
  const [step, setStep] = useState<RegistrationStep>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [todayPatients, setTodayPatients] = useState<TodayPatient[]>([])
  const [listLoading, setListLoading] = useState(false)

  const [form, setForm] = useState({
    patientName: '',
    age: '',
    chiefComplaint: '',
  })

  const loadTodayPatients = async () => {
    setListLoading(true)
    try {
      const res = await fetch('/api/er-reception/register')
      const data = (await res.json().catch(() => ({}))) as { patients?: TodayPatient[] }
      if (res.ok && Array.isArray(data.patients)) {
        setTodayPatients(data.patients)
      }
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    void loadTodayPatients()
  }, [])

  const handleSubmit = async () => {
    if (!form.patientName.trim() || !form.age.trim() || !form.chiefComplaint.trim()) {
      setError('Please fill: Patient Name, Age, and Chief Complaint')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const normalized = form.patientName.trim().replace(/\s+/g, ' ')
      const parts = normalized.split(' ')
      const firstName = parts[0] || normalized
      const lastName = parts.slice(1).join(' ') || '—'

      const patientRes = await fetch('/api/er-reception/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          age: parseInt(form.age),
          gender: 'Male',
          phone: '0000000000',
          chiefComplaint: form.chiefComplaint.trim(),
        }),
      })

      const data = await patientRes.json()
      if (!patientRes.ok) throw new Error(data.error || 'Registration failed')

      setPatient({
        visitId: data.visitId,
        patientId: data.patientId,
        patientName: normalized,
        age: form.age,
        chiefComplaint: form.chiefComplaint,
        qrUrl: `${window.location.origin}/emergency/doctor?patientId=${data.patientId}&visitId=${data.visitId}`,
        createdAt: new Date().toLocaleTimeString(),
      })

      await loadTodayPatients()
      setStep('success')
    } catch (e) {
      setError((e as Error).message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!patient) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return

    const qrSvg = document.getElementById('er-qr-code')?.innerHTML || ''

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>ZION ER - Patient Wristband</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #0f172a;
            max-width: 400px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #ef4444;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .hospital { font-size: 20px; font-weight: 700; color: #ef4444; }
          .dept { font-size: 13px; color: #64748b; }
          .patient-name {
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            margin: 12px 0 4px;
          }
          .meta {
            display: flex;
            justify-content: center;
            gap: 16px;
            font-size: 13px;
            color: #475569;
            margin-bottom: 12px;
          }
          .complaint {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            margin-bottom: 16px;
          }
          .complaint-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #ef4444;
            margin-bottom: 4px;
          }
          .qr-container {
            text-align: center;
            margin: 16px 0;
          }
          .qr-container svg { width: 160px; height: 160px; }
          .visit-id {
            text-align: center;
            font-family: monospace;
            font-size: 11px;
            color: #64748b;
            margin-top: 8px;
          }
          .time {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
          }
          .instructions {
            border-top: 1px solid #e2e8f0;
            margin-top: 16px;
            padding-top: 12px;
            font-size: 11px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">🏥 ZION HOSPITAL</div>
          <div class="dept">Emergency Department — Patient Wristband</div>
        </div>
        <div class="patient-name">${patient.patientName}</div>
        <div class="meta">
          <span>Age: ${patient.age}</span>
          <span>|</span>
          <span>ID: ${patient.patientId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="complaint">
          <div class="complaint-label">⚠ Chief Complaint</div>
          ${patient.chiefComplaint}
        </div>
        <div class="qr-container">
          ${qrSvg}
          <div class="visit-id">Visit: ${patient.visitId}</div>
          <div class="time">Registered: ${patient.createdAt}</div>
        </div>
        <div class="instructions">
          <strong>Scan QR code</strong> to access full patient record.<br/>
          Show this wristband to all medical staff.
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()

    // Immediately reset for next patient entry.
    handleNewPatient()
  }

  const handleNewPatient = () => {
    setForm({ patientName: '', age: '', chiefComplaint: '' })
    setPatient(null)
    setStep('form')
    setError(null)
  }

  return (
    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']} redirectTo="/">
      <div className="min-h-screen bg-[#0B1120] flex flex-col">
        <header className="border-b border-red-500/30 bg-red-500/5 px-6 py-4">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">NARS Hospital — Emergency Reception</h1>
                <p className="text-xs text-slate-400">Quick patient registration for ER</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
              <div className="mb-4 flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-cyan-300" />
                <h3 className="text-sm font-semibold text-slate-100">Today Registered</h3>
              </div>
              {listLoading ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : todayPatients.length === 0 ? (
                <p className="text-xs text-slate-500">No patients yet today.</p>
              ) : (
                <div className="space-y-2">
                  {todayPatients.map((item) => (
                    <div key={item.visitId} className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
                      <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            <div className="w-full">
            {step === 'form' ? (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <User className="h-4 w-4 text-red-400" />
                  Register New Emergency Patient
                </h2>

                {error && (
                  <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Patient Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.patientName}
                      onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                      placeholder="e.g. Ahmed Ali"
                      className="w-full h-11 rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 text-slate-100 text-sm placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/25"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Age <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                      placeholder="e.g. 35"
                      min="0"
                      max="120"
                      className="w-full h-11 rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 text-slate-100 text-sm placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/25"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Chief Complaint <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={form.chiefComplaint}
                      onChange={(e) => setForm((p) => ({ ...p, chiefComplaint: e.target.value }))}
                      placeholder="e.g. Chest pain, shortness of breath since 2 hours"
                      rows={3}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/25 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-[0_0_24px_rgba(239,68,68,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save & Generate QR
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/40 p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-lg font-bold text-emerald-300">Patient Registered Successfully!</h2>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                  QR wristband is ready to print. Patient will be seen by Intake Nurse next.
                </p>

                <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 mb-6 text-left">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Patient Name</p>
                      <p className="font-semibold text-white">{patient?.patientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Age</p>
                      <p className="font-semibold text-white">{patient?.age} years</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-0.5">Chief Complaint</p>
                      <p className="font-semibold text-white">{patient?.chiefComplaint}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Visit ID</p>
                      <p className="font-mono text-xs text-slate-300">{patient?.visitId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Registered At</p>
                      <p className="text-slate-300 text-xs">{patient?.createdAt}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <div id="er-qr-code" className="rounded-2xl border border-slate-700/60 bg-white p-4 shadow-lg">
                    {patient && <QRCodeSVG value={patient.qrUrl} size={180} bgColor="#ffffff" fgColor="#0f172a" level="H" />}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.3)]"
                  >
                    <Printer className="h-4 w-4" />
                    Print QR Wristband
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
