'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, Printer, Pill, AlertTriangle, AlertCircle, X, Stethoscope } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'
import { useAuth } from '@/contexts/AuthContext'
import { printPharmacyDispensing } from '@/lib/printUtils'
import { getMedicationAllergyConflicts } from '@/lib/pharmacySafety'

interface PrescriptionDetailsProps {
  prescription: any
  onBack: () => void
}

export default function PrescriptionDetails({ prescription, onBack }: PrescriptionDetailsProps) {
  const { deductStock, medicines } = useInventory()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [patientAllergies, setPatientAllergies] = useState<string | null>(null)
  const [isLoadingAllergies, setIsLoadingAllergies] = useState(false)
  const [allergyConflicts, setAllergyConflicts] = useState<string[]>([])
  const [showAllergyWarning, setShowAllergyWarning] = useState(false)
  const [dispenseCost, setDispenseCost] = useState<string>('')

  const isVisitBasedOrder =
    prescription?.status && ['PENDING', 'DISPENSED', 'OUT_OF_STOCK'].includes(prescription.status) && prescription.visitId && prescription.id && prescription.id.length > 10

  // Load patient allergies when prescription is opened
  useEffect(() => {
    const loadAllergies = async () => {
      if (!prescription?.visitId) return

      try {
        setIsLoadingAllergies(true)
        const res = await fetch(`/api/pharmacy/prescription/${prescription.visitId}/allergies`)
        if (res.ok) {
          const data = await res.json()
          setPatientAllergies(data.allergies)

          // Check for drug-allergy interactions
          const medicationNames = (prescription.items || []).map((item: any) => String(item.medicineName || ''))
          const conflicts = getMedicationAllergyConflicts(medicationNames, data.allergies)
          setAllergyConflicts(conflicts)
          if (conflicts.length > 0) {
            setShowAllergyWarning(true)
          }
        }
      } catch (err) {
        console.error('❌ Failed to load allergies:', err)
      } finally {
        setIsLoadingAllergies(false)
      }
    }

    loadAllergies()
  }, [prescription])

  const handleDispenseInternal = async () => {
    if (!user) return

    // Pharmacy-only hard stop on allergy conflicts
    if (allergyConflicts.length > 0) {
      setShowAllergyWarning(true)
      alert('Cannot dispense. Verify with doctor.')
      return
    }

    setIsProcessing(true)

    try {
      // Get medication prices from inventory
      const medicationPrices = prescription.items.map((item: any) => {
        const medicine = findMedicineByName(item.medicineName)
        return {
          medicineName: item.medicineName,
          price: medicine?.price || 10000, // Default 10,000 IQD
        }
      })

      // Call API to dispense
      const res = await fetch(`/api/pharmacy/prescription/${prescription.visitId}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationPrices }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to dispense medications')
      }

      // Deduct stock from inventory (if available)
      for (const item of prescription.items) {
        const medicine = findMedicineByName(item.medicineName)
        if (medicine && medicine.currentStock > 0) {
          deductStock(medicine.id, 1, `Dispensed for ${prescription.patientName}`, user.id)
        }
      }

      alert('✅ Medications dispensed and added to invoice successfully!\n\nStatus updated: Ready for Pickup')
      onBack()
    } catch (err: any) {
      console.error('❌ Failed to dispense:', err)
      alert(`❌ Failed to dispense medications: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDispenseExternal = () => {
    if (!user) return

    // External prescription - just print, no billing
    window.print()
    alert('Prescription printed. No charges added to invoice.')
    onBack()
  }

  const handleDispenseAndComplete = async () => {
    if (!user || !prescription) return

    // Pharmacy-only hard stop on allergy conflicts
    if (allergyConflicts.length > 0) {
      setShowAllergyWarning(true)
      alert('Cannot dispense. Verify with doctor.')
      return
    }

    setIsProcessing(true)

    try {
      // Call API to dispense and complete visit
      const res = await fetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: prescription.visitId,
          patientId: prescription.patientId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to dispense and complete visit')
      }

      // Prepare medication items with prices from inventory
      const medicationItems = prescription.items.map((item: any) => {
        const medicine = findMedicineByName(item.medicineName)
        return {
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          price: medicine?.price || 10000, // Use inventory price or default
          quantity: 1,
        }
      })

      // Send medication items to API for billing (locks the final cost)
      const medRes = await fetch('/api/billing/invoice/add-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: prescription.visitId,
          patientId: prescription.patientId,
          medications: medicationItems,
          addedBy: user.id,
        }),
      })

      if (!medRes.ok) {
        const errorData = await medRes.json()
        throw new Error(errorData.error || 'Failed to add medications to invoice')
      }

      // Deduct stock from inventory (if available)
      for (const item of prescription.items) {
        const medicine = findMedicineByName(item.medicineName)
        if (medicine && medicine.currentStock > 0) {
          deductStock(medicine.id, 1, `Dispensed for ${prescription.patientName}`, user.id)
        }
      }

      alert('✅ Prescription dispensed and visit completed successfully!\n\nPatient status: COMPLETED')
      // Refresh to update the queue
      window.location.reload()
    } catch (err: any) {
      console.error('❌ Failed to dispense and complete:', err)
      alert(`❌ Error: ${err?.message || 'Failed to dispense and complete visit. Please try again.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOrderDispense = async () => {
    if (!prescription?.id || isProcessing) return
    const cost = parseFloat(dispenseCost) || 0
    try {
      setIsProcessing(true)
      const res = await fetch(`/api/pharmacy/orders/${prescription.id}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalCost: cost }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to dispense')
      }
      alert('Dispensed. Cost added to visit invoice.')
      onBack()
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Failed to dispense')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOrderOutOfStock = async () => {
    if (!prescription?.id || isProcessing) return
    if (!window.confirm('Mark this order as Out of Stock? Doctor and Nurse will see an alert.')) return
    try {
      setIsProcessing(true)
      const res = await fetch(`/api/pharmacy/orders/${prescription.id}/out-of-stock`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed')
      }
      alert('Marked Out of Stock. Doctor & Nurse dashboards will show the alert.')
      onBack()
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelDispensing = async () => {
    if (!user || !prescription) return

    // Confirmation popup
    const confirmed = window.confirm(
      'Are you sure the patient doesn\'t want to buy the medication?\n\nThis will:\n- Complete the visit without dispensing\n- Remove medication charges from the bill\n- Keep only the consultation fee'
    )

    if (!confirmed) {
      return
    }

    setIsProcessing(true)

    try {
      // Call API to cancel dispensing
      const res = await fetch('/api/pharmacy/cancel-dispensing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: prescription.visitId,
          patientId: prescription.patientId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to cancel dispensing')
      }

      alert('✅ Dispensing cancelled. Visit completed without medication charges.\n\nPatient will be charged only for consultation.')
      // Refresh to update the queue
      window.location.reload()
    } catch (err: any) {
      console.error('❌ Failed to cancel dispensing:', err)
      alert(`❌ Error: ${err?.message || 'Failed to cancel dispensing. Please try again.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to find medicine by name (fuzzy match)
  const findMedicineByName = (name: string) => {
    const lowerName = name.toLowerCase()
    
    // Try exact match first
    let medicine = medicines.find((m) => m.name.toLowerCase() === lowerName)
    
    // Try partial match
    if (!medicine) {
      medicine = medicines.find((m) => 
        m.name.toLowerCase().includes(lowerName) || 
        lowerName.includes(m.name.toLowerCase())
      )
    }
    
    return medicine
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f172a]">
      {/* Professional Header with Doctor's Name */}
      <div className="bg-[#1e293b] border-b border-slate-800/50 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-lg text-base font-bold transition-all shadow-sm"
            style={{ borderRadius: '8px' }}
          >
            <ArrowLeft size={18} />
            <span>Back to Queue</span>
          </button>

          {/* Doctor's Name - Prominent Badge */}
          <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30 rounded-2xl">
            <Stethoscope size={24} className="text-cyan-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium mb-0.5">Prescribed By</p>
              <p className="text-xl font-bold text-cyan-300">Dr. {prescription.doctorName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Allergy Safety Alert - Full Width */}
      {showAllergyWarning && allergyConflicts.length > 0 && (
        <div className="bg-red-600/20 border-2 border-red-500/70 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">
                ⚠️ ALLERGY ALERT: Patient allergic to <span className="font-semibold">{patientAllergies}</span>
              </p>
              <p className="text-xs text-red-200 mt-1">
                Conflicting medications: {allergyConflicts.join(', ')}
              </p>
            </div>
            <button
              onClick={() => setShowAllergyWarning(false)}
              className="text-xs text-red-300 hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content - 3 Column Grid - No Scroll */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full grid grid-cols-3 gap-6">
          {/* Column 1: Patient Card + Chief Complaint */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Patient Information Card - Large, Clear */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-6 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-100 mb-5">Patient Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-2">Patient Name</p>
                  <p className="text-xl font-bold text-slate-100">{prescription.patientName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Visit ID</p>
                    <p className="text-sm font-mono text-slate-300 break-all">{prescription.visitId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Date</p>
                    <p className="text-sm text-slate-300">
                      {new Date(prescription.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chief Complaint Card - Compact */}
            {prescription.chiefComplaint && (
              <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-4 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-slate-400" />
                  Chief Complaint
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">{prescription.chiefComplaint}</p>
              </div>
            )}
          </div>

          {/* Column 2: Prescription Card - Main Focus, Wide */}
          <div className="flex flex-col overflow-hidden">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Pill size={24} className="text-emerald-400" />
                  <h3 className="text-xl font-bold text-slate-100">Prescription</h3>
                </div>
                <button
                  onClick={() => {
                    printPharmacyDispensing(
                      prescription.items.map((item: any) => ({
                        medicineName: item.medicineName,
                        dosage: item.dosage,
                        frequency: item.frequency,
                      })),
                      {
                        title: 'Pharmacy Dispensing Note',
                        patientName: prescription.patientName,
                        patientId: prescription.patientId,
                        visitId: prescription.visitId,
                        date: new Date(prescription.createdAt).toISOString(),
                      }
                    )
                  }}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-sm font-semibold text-cyan-300 flex items-center gap-2 transition-all"
                  title="Print Dispensing Note"
                >
                  <Printer size={16} />
                  <span>Print</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {prescription.items.map((item: any, index: number) => {
                  const medicine = findMedicineByName(item.medicineName)
                  const isLowStock = medicine && medicine.currentStock <= medicine.minimumStock
                  const isOutOfStock = medicine && medicine.currentStock === 0

                  return (
                    <div
                      key={item.id || index}
                      className={`p-5 rounded-xl border ${
                        isOutOfStock
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : isLowStock
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-lg font-bold text-slate-100">{item.medicineName}</p>
                            {isOutOfStock && (
                              <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs text-rose-400 font-medium">
                                Out of Stock
                              </span>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-medium">
                                Low Stock
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 text-sm text-slate-400">
                            <p><span className="font-semibold text-slate-300">Dosage:</span> {item.dosage}</p>
                            <p><span className="font-semibold text-slate-300">Frequency:</span> {item.frequency}</p>
                            {medicine && (
                              <p className="text-slate-500 text-xs">
                                Stock: {medicine.currentStock} {medicine.unit} | {medicine.price.toLocaleString('en-US')} IQD
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Column 3: Diagnosis + Action Card */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Diagnosis Card */}
            {prescription.diagnosis && (
              <div className="bg-[#1e293b] rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 flex-1 overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-blue-400" />
                  Diagnosis
                </h3>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {prescription.diagnosis}
                </p>
              </div>
            )}

            {/* Action Card - Visit-based order (Dispense / Out of Stock) or legacy Complete Visit */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 p-6 flex-shrink-0 flex flex-col gap-4">
              {isVisitBasedOrder ? (
                <>
                  <div className="rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-2">
                    <p className="text-xs text-slate-400 mb-1">Order status</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {prescription.status === 'DISPENSED' ? '✓ Dispensed' : prescription.status === 'OUT_OF_STOCK' ? '⚠️ Out of Stock' : 'Pending'}
                    </p>
                  </div>
                  {(prescription.status === 'PENDING' || prescription.status === 'OUT_OF_STOCK') && (
                    <>
                      {allergyConflicts.length > 0 ? (
                        <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3">
                          <p className="text-sm font-bold text-red-300">Status: Cannot dispense</p>
                          <p className="mt-1 text-xs text-red-200">Verify with doctor</p>
                        </div>
                      ) : null}
                      <label className="text-xs text-slate-400">Total cost (IQD) — added to visit invoice</label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={dispenseCost}
                        onChange={(e) => setDispenseCost(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100"
                      />
                      <button
                        onClick={handleOrderDispense}
                        disabled={isProcessing || allergyConflicts.length > 0}
                        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <CheckCircle size={20} />}
                        <span>Dispense</span>
                      </button>
                      <button
                        onClick={handleOrderOutOfStock}
                        disabled={isProcessing || prescription.status === 'OUT_OF_STOCK'}
                        className="w-full px-6 py-3 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-2xl font-semibold hover:bg-rose-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <AlertTriangle size={18} />
                        <span>Out of Stock</span>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleDispenseAndComplete}
                    disabled={isProcessing || allergyConflicts.length > 0}
                    className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-2 border-emerald-400/50 rounded-2xl font-bold hover:from-emerald-600 hover:to-emerald-700 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <CheckCircle size={20} />}
                    <span>Complete Visit</span>
                  </button>
                  <button
                    onClick={handleCancelDispensing}
                    disabled={isProcessing}
                    className="w-full px-6 py-3 bg-transparent text-slate-300 border-2 border-slate-600 rounded-2xl font-semibold hover:bg-slate-800/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X size={18} />
                    <span>External Purchase</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

