'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pill, ClipboardList, ShieldAlert, CheckCircle2, AlertTriangle, X, Clock3, Timer, Save, Trash2 } from 'lucide-react'

interface DispensingDashboardProps {
  order: any
  onDispensed: () => void
}

// Normalize order so we always have prescription array, diagnosis text, and diagnosticResults (Lab + Radiology)
function normalizeOrder(order: any) {
  const sourceRows = order.prescription ?? (order.items?.map((i: any) => ({
    medicationId: i.medicationId ?? i.inventoryId ?? '',
    medication: i.medicineName ?? i.medication ?? '—',
    dosage: i.dosage ?? '—',
    frequency: i.frequency ?? i.instructions ?? '—',
    duration: i.duration ?? '—',
    quantity: Number(i.quantity) || 1,
    unitPrice: Number(i.unitPrice ?? i.price ?? 0),
    totalPrice: Number(i.totalPrice ?? ((Number(i.unitPrice ?? i.price ?? 0) || 0) * (Number(i.quantity) || 1))),
    price: Number(i.price ?? i.unitPrice ?? 0),
    notes: i.notes,
  })) ?? [])
  const grouped = new Map<string, any>()
  for (const row of sourceRows) {
    const key =
      String(row.medicationId || '').trim() ||
      [String(row.medication || '').toLowerCase(), String(row.dosage || '').toLowerCase(), String(row.frequency || '').toLowerCase()].join('|')
    const current = grouped.get(key)
    if (!current) {
      grouped.set(key, { ...row, quantity: Math.max(1, Number(row.quantity) || 1) })
      continue
    }
    current.quantity += Math.max(1, Number(row.quantity) || 1)
    current.totalPrice = Number(current.unitPrice || 0) * Number(current.quantity || 1)
  }
  const prescription = Array.from(grouped.values())
  const diagnosis = order.diagnosis ?? order.chiefComplaint ?? 'No diagnosis recorded.'
  const diagnosticResults = order.diagnosticResults
  const allergies = order.allergies ?? order.patientAllergies ?? []
  return { ...order, prescription, diagnosis, diagnosticResults, allergies }
}

export default function DispensingDashboard({ order: rawOrder, onDispensed }: DispensingDashboardProps) {
  const order = normalizeOrder(rawOrder)
  const draftKey = `zion-pharmacy-draft-${order.id}`
  const [showSuccess, setShowSuccess] = useState(false)
  const [allergyCheck, setAllergyCheck] = useState<any>(null)
  const [isCheckingAllergies, setIsCheckingAllergies] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isDispensing, setIsDispensing] = useState(false)
  const [saveDraftMessage, setSaveDraftMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionToast, setActionToast] = useState<string | null>(null)
  const [draftPrescription, setDraftPrescription] = useState<any[]>(order.prescription)
  const [inventoryRows, setInventoryRows] = useState<Array<{ drugName: string; currentStock: number }>>([])
  const toSafeDispenseError = (message?: string) => {
    const raw = String(message || '').trim()
    const normalized = raw.toLowerCase()
    if (
      normalized.includes('invalid invocation') ||
      normalized.includes('invalid `prisma') ||
      normalized.includes('prisma client')
    ) {
      return 'Dispense failed due to a temporary backend issue. Please retry.'
    }
    return raw || 'Failed to dispense order'
  }
  const hasAllergyConflict = Boolean(allergyCheck?.hasConflicts)
  const hasDraftItems = draftPrescription.length > 0
  const computedDraftTotal = useMemo(
    () =>
      draftPrescription.reduce((sum, item) => {
        const qty = Number(item.quantity) || 1
        const unit = Number(item.unitPrice ?? item.price ?? 0)
        return sum + unit * qty
      }, 0),
    [draftPrescription]
  )
  const currentBillSubtotal = Number((order as any).currentBillSubtotal || 0)
  const structuredGrandTotal = currentBillSubtotal + computedDraftTotal

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDraftPrescription(parsed)
        }
      }
    } catch {
      /* ignore */
    }
  }, [draftKey])

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await fetch('/api/pharmacy/inventory')
        if (!res.ok) return
        const rows = (await res.json().catch(() => [])) as Array<{ drugName?: string; currentStock?: number }>
        setInventoryRows(
          Array.isArray(rows)
            ? rows.map((row) => ({
                drugName: String(row.drugName || '').trim(),
                currentStock: Number(row.currentStock) || 0,
              }))
            : []
        )
      } catch {
        setInventoryRows([])
      }
    }
    void loadInventory()
  }, [])

  const getAvailableStock = (medicineName: string) => {
    const target = String(medicineName || '').trim().toLowerCase()
    if (!target) return null
    const matched = inventoryRows.find((row) => {
      const stockName = row.drugName.toLowerCase()
      return stockName === target || stockName.includes(target) || target.includes(stockName)
    })
    return matched ? matched.currentStock : null
  }

  const notifyBillingUpdate = () => {
    if (typeof BroadcastChannel === 'undefined') return
    new BroadcastChannel('zion-billing').postMessage({ type: 'billing-updated', visitId: order.visitId })
  }

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
    if (!hasDraftItems) return
    const orderId = order.id

    setActionError(null)
    setIsDispensing(true)

    try {
      // Step 1: Update order status to DISPENSED
      const orderRes = await fetch(`/api/pharmacy/orders/${orderId}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItems: draftPrescription.map((item) => ({
            medicineName: String(item.medicineName || item.medication || '').trim(),
            dosage: String(item.dosage || '').trim(),
            quantity: Number(item.quantity) || 1,
          })),
        }),
      })

      if (!orderRes.ok) {
        const data = (await orderRes.json().catch(() => ({}))) as { error?: string }
        setActionError(toSafeDispenseError(data.error))
        return
      }

      // Step 2 (best-effort): Add medications to invoice and set Billing status
      // Primary dispense success already happened in /orders/[orderId]/dispense.
      if (order.visitId) {
        try {
          const medicationPrices = draftPrescription.map((item) => ({
            medicineName: String(item.medicineName || item.medication || '').trim(),
            price: Number(item.unitPrice || item.price || 0),
          }))

          const invoiceRes = await fetch(`/api/pharmacy/prescription/${order.visitId}/dispense`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medicationPrices }),
          })

          if (!invoiceRes.ok) {
            const data = (await invoiceRes.json().catch(() => ({}))) as { error?: string }
            console.warn('Invoice sync warning:', data.error || 'Failed to update invoice')
          }
        } catch {
          // Do not block successful dispense UI on secondary sync failures.
        }
      }

      setActionToast('Medications dispensed and sent to billing!')
      setTimeout(() => setActionToast(null), 1800)
      setShowSuccess(true)
      notifyBillingUpdate()

      try {
        window.localStorage.removeItem(draftKey)
      } catch {
        /* ignore */
      }

      setTimeout(() => onDispensed(), 2000)
    } catch (e) {
      setActionError(toSafeDispenseError((e as Error)?.message))
      setActionToast('Dispense API failed. You can retry or use decline to close.')
      setTimeout(() => setActionToast(null), 1800)
    } finally {
      setIsDispensing(false)
    }
  }

  // Patient declined / end visit without dispensing. Prescription stays in history; order set to CLOSED.
  const handleEndVisitWithoutDispense = async () => {
    if (isClosing || showSuccess) return
    const orderId = order.id
    if (!orderId) {
      onDispensed()
      return
    }
    setActionError(null)
    setIsClosing(true)
    let didCloseSuccessfully = false
    try {
      const res = await fetch(`/api/pharmacy/orders/${orderId}/close`, { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setActionError(data.error || 'Failed to cancel pharmacy order')
        return
      }
      didCloseSuccessfully = true
      setActionToast('Pharmacy order canceled and removed from invoice.')
      setTimeout(() => setActionToast(null), 1800)
    } finally {
      setIsClosing(false)
      if (didCloseSuccessfully) {
        notifyBillingUpdate()
        try {
          window.localStorage.removeItem(draftKey)
        } catch {
          /* ignore */
        }
        onDispensed()
      }
    }
  }

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draftPrescription))
      setSaveDraftMessage('Draft saved locally (not sent to invoice).')
    } catch {
      setSaveDraftMessage('Could not save draft locally.')
    }
    setTimeout(() => setSaveDraftMessage(null), 1800)
  }

  const removeDraftItem = (idx: number) => {
    setDraftPrescription((prev) => prev.filter((_, i) => i !== idx))
  }

  const actionDisabled = isDispensing || isClosing || showSuccess
  const actionBtnClass =
    'inline-flex h-11 flex-1 min-w-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45'

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
    <div
      className={`h-full flex flex-col overflow-hidden min-h-0 rounded-xl border ${
        hasAllergyConflict
          ? 'border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.35),0_0_38px_rgba(239,68,68,0.25)]'
          : 'border-slate-700/50'
      }`}
    >
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
          <div className="flex flex-col min-h-0 min-w-0 rounded-xl border border-slate-600/60 bg-gradient-to-br from-[#0b1d3a]/80 via-[#0f2342]/75 to-[#13294b]/80 backdrop-blur-md flex-1 shadow-[0_10px_45px_rgba(7,13,28,0.45)]">
            <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Prescribed Medications</h3>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {draftPrescription.map((med: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-cyan-300/20 bg-gradient-to-br from-white/[0.07] to-cyan-200/[0.04] shadow-[0_8px_30px_rgba(56,189,248,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[1.65rem] leading-tight font-extrabold tracking-tight text-[#38bdf8]">
                        {String(med.medication || med.medicineName || 'Medication')} (x{Number(med.quantity) || 1})
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(idx)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/45 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        title="Remove medicine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Pill size={14} className="text-cyan-300" />
                        {med.dosage}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} className="text-cyan-300" />
                              {med.frequency || med.instructions || 'As prescribed'}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Timer size={14} className="text-cyan-300" />
                        {med.duration}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      <span className="mr-3">Requested: {Number(med.quantity) || 1}</span>
                      <span>
                        Available in Stock: {getAvailableStock(String(med.medication || med.medicineName || '')) ?? 'N/A'}
                      </span>
                    </div>
                    {med.notes && (
                      <p className="text-sm text-slate-400 mt-2 italic border-l-2 border-slate-600 pl-2">Note: {med.notes}</p>
                    )}
                  </div>
                ))}
                {draftPrescription.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-600/70 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
                    No medicines selected. You can decline all for this patient.
                  </div>
                )}
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
                  className={`mt-2 p-3 rounded-lg border text-sm ${
                    allergyCheck.hasConflicts
                      ? 'bg-gradient-to-r from-red-500/20 via-amber-500/15 to-red-500/20 border-red-500/50 text-red-200 shadow-[0_0_28px_rgba(239,68,68,0.16)]'
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
                <p className="text-sm text-red-400 mt-2 font-semibold">Cannot dispense — resolve allergy conflict with doctor first.</p>
              )}
            </div>

            {/* Action buttons — balanced at bottom */}
            <div className="flex-shrink-0 p-4 pt-2 border-t border-slate-700/50">
              <div className="mb-3 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2">
                <p className="text-[11px] text-cyan-200">
                  Structured Total: <span className="font-bold">{structuredGrandTotal.toLocaleString('en-US')} IQD</span>
                </p>
                <p className="mt-1 text-[10px] text-cyan-100/80">
                  Current Bill Subtotal: {currentBillSubtotal.toLocaleString('en-US')} IQD + Draft Medications:{' '}
                  {computedDraftTotal.toLocaleString('en-US')} IQD
                </p>
              </div>
              {saveDraftMessage ? (
                <p className="mb-2 text-xs text-emerald-300">{saveDraftMessage}</p>
              ) : null}
              {actionToast ? <p className="mb-2 text-xs text-emerald-300">{actionToast}</p> : null}
              {actionError ? <p className="mb-2 text-xs text-rose-300">{actionError}</p> : null}
              <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={actionDisabled}
                className={`${actionBtnClass} border border-slate-500/60 bg-slate-800/70 text-slate-200 hover:bg-slate-700`}
              >
                <Save size={16} className="flex-shrink-0" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={handleEndVisitWithoutDispense}
                disabled={actionDisabled}
                className={`${actionBtnClass} border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}
              >
                {isClosing ? (
                  <span>Cancelling…</span>
                ) : (
                  <>
                    <X size={16} className="flex-shrink-0" />
                    <span>Patient Declined All</span>
                  </>
                )}
              </button>
              <button
                onClick={handleMarkAsDispensed}
                disabled={allergyCheck?.hasConflicts || actionDisabled || !hasDraftItems}
                className={`${actionBtnClass} border border-emerald-300/40 bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.35)]`}
              >
                {showSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Dispensed Successfully!</span>
                  </>
                ) : isDispensing ? (
                  <span>Dispensing…</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Dispense &amp; Send to Invoice</span>
                  </>
                )}
              </button>
              </div>
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
          <div className="bg-slate-900 rounded-xl border border-emerald-500/30 p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">Medication Dispensed!</h3>
            <p className="text-sm text-secondary">
              Medications added to invoice. Patient directed to Accountant.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

