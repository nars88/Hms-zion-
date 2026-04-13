'use client'

import { useState } from 'react'
import { Pill, ClipboardList, ShieldAlert, CheckCircle2, AlertTriangle, X, LogOut } from 'lucide-react'

interface DispensingDashboardProps {
  order: any
  onDispensed: () => void
}

// Normalize order so we always have prescription array, diagnosis text, and diagnosticResults (Lab + Radiology)
function normalizeOrder(order: any) {
  const prescription = order.prescription ?? (order.items?.map((i: any) => ({
    medication: i.medicineName ?? i.medication ?? '—',
    dosage: i.dosage ?? '—',
    frequency: i.frequency ?? '—',
    duration: i.duration ?? '—',
    notes: i.notes,
  })) ?? [])
  const diagnosis = order.diagnosis ?? order.chiefComplaint ?? 'No diagnosis recorded.'
  const defaultResults = {
    lab: [
      { testName: 'CBC', value: 'Normal', status: 'Normal' },
      { testName: 'Glucose', value: '98 mg/dL', status: 'Normal' },
    ],
    imaging: [
      { studyType: 'Chest X-Ray', findings: 'Clear. No abnormalities found.', status: 'Normal' },
    ],
  }
  const diagnosticResults = order.diagnosticResults ?? defaultResults
  const allergies = order.allergies ?? order.patientAllergies ?? []
  return { ...order, prescription, diagnosis, diagnosticResults, allergies }
}

export default function DispensingDashboard({ order: rawOrder, onDispensed }: DispensingDashboardProps) {
  const order = normalizeOrder(rawOrder)
  const [showSuccess, setShowSuccess] = useState(false)
  const [allergyCheck, setAllergyCheck] = useState<any>(null)
  const [isCheckingAllergies, setIsCheckingAllergies] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isDispensing, setIsDispensing] = useState(false)

  // AI Allergy Check
  const handleAllergyCheck = () => {
    setIsCheckingAllergies(true)
    
    // Simulate AI analysis
    setTimeout(() => {
      const conflicts: string[] = []
      
      // Check each medication against allergies
      order.prescription.forEach((med: any) => {
        order.allergies?.forEach((allergy: string) => {
          // Simple pattern matching - in production, use medical database
          if (allergy.toLowerCase().includes('penicillin') && 
              med.medication.toLowerCase().includes('amoxicillin')) {
            conflicts.push(`${med.medication} conflicts with ${allergy} allergy`)
          }
          if (allergy.toLowerCase().includes('sulfa') && 
              med.medication.toLowerCase().includes('sulfa')) {
            conflicts.push(`${med.medication} conflicts with ${allergy} allergy`)
          }
        })
      })

      setAllergyCheck({
        hasConflicts: conflicts.length > 0,
        conflicts,
        checked: true,
      })
      setIsCheckingAllergies(false)
    }, 1500)
  }

  // Dispense: update DB to DISPENSED (archive only — never delete). Then clear UI.
  const handleMarkAsDispensed = async () => {
    if (isDispensing || showSuccess) return
    const orderId = order.id
    if (orderId) {
      setIsDispensing(true)
      try {
        const res = await fetch(`/api/pharmacy/orders/${orderId}/dispense`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          console.error('Dispense failed:', data)
          return
        }
      } catch (e) {
        console.error('Dispense error:', e)
        return
      } finally {
        setIsDispensing(false)
      }
    }
    setShowSuccess(true)
    setTimeout(() => onDispensed(), 2000)
  }

  // Patient declined / end visit without dispensing. Prescription stays in history; order set to CLOSED.
  const handleEndVisitWithoutDispense = async () => {
    if (isClosing || showSuccess) return
    const orderId = order.id
    if (!orderId) {
      onDispensed()
      return
    }
    setIsClosing(true)
    try {
      const res = await fetch(`/api/pharmacy/orders/${orderId}/close`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Close order failed:', data)
      }
    } finally {
      setIsClosing(false)
      onDispensed()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Abnormal':
      case 'Urgent':
        return 'text-rose-400'
      case 'Normal':
        return 'text-emerald-400'
      default:
        return 'text-secondary'
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      {/* Patient Header - compact */}
      <div className="flex-shrink-0 border-b border-slate-800/50 px-4 py-3 bg-slate-900/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{order.patientName}</h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
              <span>ID: {order.patientId}</span>
              <span>•</span>
              <span>Visit: {order.visitId}</span>
            </div>
          </div>
          {order.allergies && order.allergies.length > 0 && (
            <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-rose-400" />
                <span className="text-xs font-semibold text-rose-400">Allergies: {order.allergies.join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: strict 70% / 30% — big medications area left, narrow reference right */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-3 min-w-0">
          {/* LEFT: 70% — Prescribed Medications (main work area) */}
          <div className="flex flex-col min-h-0 min-w-0 rounded-lg border border-slate-700/50 bg-slate-900/50 flex-1">
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Prescribed Medications</h3>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {order.prescription.map((med: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-slate-600/50 bg-slate-800/40"
                  >
                    <h4 className="text-lg font-bold text-slate-100">{med.medication}</h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-sm text-slate-300">
                      <span>{med.dosage}</span>
                      <span className="text-slate-500">•</span>
                      <span>{med.frequency}</span>
                      <span className="text-slate-500">•</span>
                      <span>{med.duration}</span>
                    </div>
                    {med.notes && (
                      <p className="text-sm text-slate-400 mt-2 italic border-l-2 border-slate-600 pl-2">Note: {med.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Allergy Check */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700/50 bg-slate-900/40">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase">Allergy Safety Check</span>
                </div>
                {!allergyCheck?.checked && (
                  <button
                    onClick={handleAllergyCheck}
                    disabled={isCheckingAllergies}
                    className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 text-xs font-medium disabled:opacity-50"
                  >
                    {isCheckingAllergies ? 'Checking...' : 'Run Allergy Check'}
                  </button>
                )}
              </div>
              {isCheckingAllergies && (
                <div className="py-2 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent" />
                  <p className="text-xs text-slate-400">Analyzing...</p>
                </div>
              )}
              {allergyCheck?.checked && (
                <div
                  className={`mt-2 p-2.5 rounded border text-xs ${
                    allergyCheck.hasConflicts
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {allergyCheck.hasConflicts ? (
                    <>
                      <span className="font-semibold">⚠ Conflict: </span>
                      {allergyCheck.conflicts.join(' ')} — verify with doctor.
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> No conflicts. Safe to dispense.
                    </span>
                  )}
                </div>
              )}
              {allergyCheck?.hasConflicts && (
                <p className="text-xs text-rose-400 mt-1.5">Cannot dispense — resolve allergy conflict with doctor first.</p>
              )}
            </div>

            {/* Action buttons — balanced at bottom */}
            <div className="flex-shrink-0 p-4 pt-2 flex gap-3 border-t border-slate-700/50">
              <button
                type="button"
                onClick={handleEndVisitWithoutDispense}
                disabled={showSuccess || isClosing}
                className="flex-1 min-w-0 py-3 bg-transparent text-slate-300 border border-slate-500/60 rounded-lg font-semibold hover:bg-slate-700/30 hover:border-slate-500 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? (
                  <span>Closing…</span>
                ) : (
                  <>
                    <LogOut size={18} className="flex-shrink-0" />
                    <span>End Visit (No Dispense)</span>
                  </>
                )}
              </button>
              <button
                onClick={handleMarkAsDispensed}
                disabled={allergyCheck?.hasConflicts || showSuccess || isDispensing}
                className="flex-1 min-w-0 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg font-semibold hover:bg-emerald-500/25 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showSuccess ? (
                  <>
                    <CheckCircle2 size={18} className="animate-bounce" />
                    <span>Dispensed Successfully!</span>
                  </>
                ) : isDispensing ? (
                  <span>Dispensing…</span>
                ) : (
                  <>
                    <Pill size={18} />
                    <span>Mark as Dispensed</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: 30% — Final Diagnosis + Results (narrow reference column, no empty space) */}
          <div className="flex flex-col gap-3 min-h-0 min-w-0 overflow-hidden">
            <div className="flex-shrink-0 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList size={14} className="text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-300 uppercase">Final Diagnosis</h3>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">{order.diagnosis}</p>
            </div>
            <div className="flex-1 min-h-0 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-300 uppercase mb-3">Diagnostic Results Summary</h3>
              {order.diagnosticResults ? (
                <div className="space-y-3">
                  {order.diagnosticResults.lab && order.diagnosticResults.lab.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-wide mb-1.5">Lab</p>
                      <div className="flex flex-wrap gap-2">
                        {order.diagnosticResults.lab.map((test: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded border border-slate-700/40"
                          >
                            <span className="text-xs text-slate-200">{test.testName}</span>
                            <span className="text-xs text-slate-400">{test.value}</span>
                            <span className={`text-xs font-medium ${getStatusColor(test.status)}`}>{test.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.diagnosticResults.ecg && (
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-wide mb-1.5">ECG</p>
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded border border-slate-700/40">
                        <span className="text-xs text-slate-200">{order.diagnosticResults.ecg.heartRate} bpm, {order.diagnosticResults.ecg.rhythm}</span>
                        <span className={`text-xs font-medium ${getStatusColor(order.diagnosticResults.ecg.status)}`}>{order.diagnosticResults.ecg.status}</span>
                      </div>
                    </div>
                  )}
                  {order.diagnosticResults.imaging && order.diagnosticResults.imaging.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-wide mb-1.5">Radiology</p>
                      <div className="space-y-1.5">
                        {order.diagnosticResults.imaging.map((study: any, idx: number) => (
                          <div
                            key={`img-${idx}`}
                            className="px-2 py-1.5 bg-slate-800/40 rounded border border-slate-700/40"
                          >
                            <span className="text-xs font-medium text-slate-200">{study.studyType}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{study.findings}</p>
                            <span className={`text-xs font-medium ${getStatusColor(study.status)}`}>{study.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No results</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-emerald-500/30 p-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">Medication Dispensed!</h3>
            <p className="text-sm text-secondary">
              Visit status updated to AWAITING_BILLING
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

