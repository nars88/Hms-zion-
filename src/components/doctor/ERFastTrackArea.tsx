'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useInventory } from '@/contexts/InventoryContext'
import { useLabResults } from '@/contexts/LabResultsContext'
import { generateERVisitId, isERVisitId } from '@/lib/visitIdGenerator'
import { 
  AlertTriangle, 
  Heart, 
  Wind, 
  Bone, 
  Droplet, 
  Syringe, 
  Scissors, 
  Stethoscope,
  ArrowLeft,
  CheckCircle,
  Activity,
  Package,
  HeartPulse,
  Siren,
  Pill,
  Plus,
  Trash2,
  Microscope,
  Scan
} from 'lucide-react'
import { useStats } from '@/contexts/StatsContext'
import { formatNumber } from '@/lib/locale'

interface ERFastTrackAreaProps {
  patient: any
  onCompleteVisit: () => void
  onBackToQueue?: () => void
}

// Quick-action diagnosis buttons
const QUICK_ACTIONS = [
  { id: 'trauma', label: 'Trauma', icon: Bone, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  { id: 'cardiac', label: 'Cardiac', icon: Heart, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  { id: 'respiratory', label: 'Respiratory', icon: Wind, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
  { id: 'bleeding', label: 'Bleeding', icon: Droplet, color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  { id: 'pain', label: 'Acute Pain', icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { id: 'fever', label: 'High Fever', icon: Stethoscope, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
]

// Quick Meds - common ER medications (appear in Pharmacy as Urgent ER Order)
const QUICK_MEDS_OPTIONS = [
  { id: 'paracetamol', name: 'Paracetamol', defaultPrice: 2000 },
  { id: 'ibuprofen', name: 'Ibuprofen', defaultPrice: 2500 },
  { id: 'ondansetron', name: 'Ondansetron', defaultPrice: 5000 },
  { id: 'diazepam', name: 'Diazepam', defaultPrice: 3000 },
  { id: 'amoxicillin', name: 'Amoxicillin', defaultPrice: 4000 },
  { id: 'metoclopramide', name: 'Metoclopramide', defaultPrice: 2500 },
]

// Quick procedure buttons - Large, clickable ER action buttons
const QUICK_PROCEDURES = [
  { id: 'iv-fluid', label: 'IV Fluid', icon: Droplet, price: 25000, inventoryItem: 'IV Set' },
  { id: 'injection', label: 'Injection', icon: Syringe, price: 15000, inventoryItem: 'Syringe' },
  { id: 'wound-dressing', label: 'Wound Dressing', icon: Package, price: 5000, inventoryItem: 'Bandage' },
  { id: 'stitching', label: 'Stitching', icon: Scissors, price: 35000, inventoryItem: 'Suture Kit' },
  { id: 'oxygen', label: 'Oxygen', icon: Activity, price: 20000, inventoryItem: 'Oxygen Mask' },
]

export default function ERFastTrackArea({ patient, onCompleteVisit, onBackToQueue }: ERFastTrackAreaProps) {
  const { user } = useAuth()
  const { updatePatientStatus } = useWaitingList()
  const { saveVisitData } = useVisitData()
  const { getInvoice, getInvoiceByPatientId, createInvoice, addInvoiceItem } = useCentralizedBilling()
  const { deductStock, findMedicineByName } = useInventory()
  const { addLabRequest } = useLabResults()
  const { recordProcedureClick } = useStats()
  
  const [diagnosis, setDiagnosis] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [selectedQuickActions, setSelectedQuickActions] = useState<string[]>([])
  const [appliedProcedures, setAppliedProcedures] = useState<string[]>([])
  const [quickMeds, setQuickMeds] = useState<Array<{ medicineName: string; dosage: string; frequency: string; price: number }>>([])
  const [isCompleting, setIsCompleting] = useState(false)
  const diagnosisInputRef = useRef<HTMLTextAreaElement>(null)
  const clinicalNotesRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus diagnosis input when patient is selected
  useEffect(() => {
    if (patient && diagnosisInputRef.current) {
      setTimeout(() => {
        diagnosisInputRef.current?.focus()
      }, 100)
    }
  }, [patient])

  // Safety check: ensure patient exists
  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-secondary font-medium">No patient selected</p>
        </div>
      </div>
    )
  }

  // Verify this is an ER visit
  const visitId = patient?.visitId || generateERVisitId()
  const isER = visitId ? isERVisitId(visitId) : false
  
  // Debug logging
  console.log('[ERFastTrackArea] Rendering:', {
    patientId: patient?.id,
    visitId,
    isER,
    patientName: patient?.name
  })

  const handleQuickAction = (actionId: string) => {
    setSelectedQuickActions((prev) => {
      if (prev.includes(actionId)) {
        return prev.filter((id) => id !== actionId)
      } else {
        return [...prev, actionId]
      }
    })
    
    // Add to diagnosis text
    const action = QUICK_ACTIONS.find((a) => a.id === actionId)
    if (action) {
      const currentText = diagnosis.trim()
      const newText = currentText ? `${currentText}, ${action.label}` : action.label
      setDiagnosis(newText)
    }
  }

  const handleReferToLab = async () => {
    if (!user || !patient) return
    const patientId = patient.id
    const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown'
    let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
    if (!invoice) invoice = createInvoice(patientId, patientName, visitId)
    const serviceName = 'Lab Referral (CBC)'
    const price = 25000
    try {
      const res = await fetch('/api/billing/invoice/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          patientId,
          department: 'Laboratory',
          description: `Lab Fee: ${serviceName}`,
          quantity: 1,
          unitPrice: price,
          total: price,
          addedBy: user.id,
        }),
      })
      if (!res.ok) throw new Error('Failed to add to invoice')
      addInvoiceItem(visitId, { department: 'Laboratory', description: `Lab Fee: ${serviceName}`, quantity: 1, unitPrice: price, total: price, addedBy: user.id })
      addLabRequest({ patientId, patientName, visitId, testType: serviceName, category: 'Laboratory', specificTestName: serviceName, department: 'Lab', requestedBy: user.id })
    } catch (e: any) {
      alert(e?.message || 'Failed to refer to Lab')
    }
  }

  const handleReferToRadiology = async () => {
    if (!user || !patient) return
    const patientId = patient.id
    const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown'
    let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
    if (!invoice) invoice = createInvoice(patientId, patientName, visitId)
    const serviceName = 'Radiology Referral (X-Ray)'
    const price = 50000
    try {
      const res = await fetch('/api/billing/invoice/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          patientId,
          department: 'Radiology',
          description: `Radiology Fee: ${serviceName}`,
          quantity: 1,
          unitPrice: price,
          total: price,
          addedBy: user.id,
        }),
      })
      if (!res.ok) throw new Error('Failed to add to invoice')
      addInvoiceItem(visitId, { department: 'Radiology', description: `Radiology Fee: ${serviceName}`, quantity: 1, unitPrice: price, total: price, addedBy: user.id })
      addLabRequest({ patientId, patientName, visitId, testType: serviceName, category: 'X-Ray', specificTestName: serviceName, department: 'Radiology', requestedBy: user.id })
    } catch (e: any) {
      alert(e?.message || 'Failed to refer to Radiology')
    }
  }

  const handleQuickProcedure = (procedureId: string) => {
    if (!user || appliedProcedures.includes(procedureId)) return

    const procedure = QUICK_PROCEDURES.find((p) => p.id === procedureId)
    if (!procedure) return

    // Get or create invoice
    const patientId = patient.id
    const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient'
    let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
    if (!invoice) {
      invoice = createInvoice(patientId, patientName, visitId)
    }

    // Try to deduct from inventory (if item exists)
    let inventoryDeducted = false
    if (procedure.inventoryItem) {
      const inventoryItem = findMedicineByName(procedure.inventoryItem)
      if (inventoryItem && inventoryItem.currentStock > 0) {
        const deducted = deductStock(inventoryItem.id, 1, `ER Procedure: ${procedure.label} for ${patientName}`, user.id)
        if (deducted) {
          inventoryDeducted = true
        }
      }
    }

    // Add to invoice
    addInvoiceItem(visitId, {
      department: 'Doctor',
      description: `ER Procedure: ${procedure.label}${inventoryDeducted ? ' (Inventory deducted)' : ''}`,
      quantity: 1,
      unitPrice: procedure.price,
      total: procedure.price,
      addedBy: user.id,
    })

    // Record procedure click for stats
    recordProcedureClick(procedureId, procedure.label)

    setAppliedProcedures((prev) => [...prev, procedureId])
    
    // Add to visit notes (diagnosis field for tracking)
    const procedureNote = `[${new Date().toLocaleTimeString()}] ${procedure.label} - ${procedure.price.toLocaleString()} IQD`
    setDiagnosis((prev) => {
      const current = prev.trim()
      return current ? `${current}\n${procedureNote}` : procedureNote
    })
    
    // Show feedback
    console.log(`[ER Procedure] ${procedure.label} added to invoice: ${procedure.price.toLocaleString()} IQD`)
  }

  const handleCompleteVisit = async () => {
    if (!patient || !user) return
    setIsCompleting(true)

    const patientId = patient.id
    const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient'
    
    let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
    if (!invoice) {
      invoice = createInvoice(patientId, patientName, visitId)
    }

    const erConsultationFee = 75000
    const hasConsultationFee = invoice.items.some((item: any) => item.department === 'Doctor' && item.description && item.description.includes('ER Consultation'))
    if (!hasConsultationFee) {
      addInvoiceItem(visitId, {
        department: 'Doctor',
        description: 'ER Consultation (Fast Track)',
        quantity: 1,
        unitPrice: erConsultationFee,
        total: erConsultationFee,
        addedBy: user.id,
      })
    }

    // Add Quick Meds to invoice (cost added to Finance)
    quickMeds.forEach((med) => {
      addInvoiceItem(visitId, {
        department: 'Pharmacy',
        description: `ER Med: ${med.medicineName} ${med.dosage} - ${med.frequency}`,
        quantity: 1,
        unitPrice: med.price,
        total: med.price,
        addedBy: user.id,
      })
    })

    // Re-read invoice after adding items
    const updatedInvoice = getInvoice(visitId) || getInvoiceByPatientId(patientId)
    const items = (updatedInvoice?.items || []) as Array<{ department: string; description: string; quantity: number; unitPrice: number; total: number }>

    try {
      // 1) Sync invoice to DB (patientID, caseType: Emergency via visit.chiefComplaint)
      const syncRes = await fetch('/api/billing/invoice/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          patientId,
          items,
          subtotal: updatedInvoice?.subtotal ?? 0,
          tax: updatedInvoice?.tax ?? 0,
          discount: updatedInvoice?.discount ?? 0,
          total: updatedInvoice?.total ?? 0,
          generatedBy: user.id,
          completeVisit: false,
        }),
      })
      if (!syncRes.ok) {
        const err = await syncRes.json()
        throw new Error(err.error || 'Failed to sync invoice')
      }

      // 2) If Quick Meds prescribed, send to Pharmacy as Urgent ER Order (appears in Pharmacy Dashboard)
      if (quickMeds.length > 0) {
        const prescriptionItems = quickMeds.map((m) => ({
          medicineName: m.medicineName,
          medicine: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
        }))
        const pharmacyRes = await fetch('/api/doctor/visit/send-to-pharmacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitId,
            patientId,
            doctorId: user.id,
            prescriptionItems,
            diagnosis: diagnosis || 'ER',
          }),
        })
        if (!pharmacyRes.ok) {
          const err = await pharmacyRes.json()
          throw new Error(err.error || 'Failed to send to pharmacy')
        }
      }

      // 3) Mark visit COMPLETED so it appears in Accountant Dashboard
      await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
    } catch (err: any) {
      console.error('ER complete error:', err)
      alert(err?.message || 'Failed to save. Check console.')
      setIsCompleting(false)
      return
    }

    saveVisitData({
      patientId,
      patientName,
      diagnosis: diagnosis || 'ER Visit',
      prescription: quickMeds.map((m) => `${m.medicineName} ${m.dosage} - ${m.frequency}`).join('\n'),
      notes: `Clinical Notes: ${clinicalNotes}\n\nQuick Actions: ${selectedQuickActions.join(', ')}`,
      labTests: [],
      completedAt: new Date().toISOString(),
    })
    updatePatientStatus(patientId, 'Pending Payment')

    // Trigger print preview for invoice
    const printInvoice = () => {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ER Invoice - ${patientName}</title>
          <style>
            @media print {
              @page { size: A5; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .hospital-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
            .emergency-badge { background-color: #EF4444; color: white; padding: 5px 15px; border-radius: 5px; display: inline-block; margin: 10px 0; }
            .patient-info { margin: 15px 0; }
            .invoice-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .invoice-items th, .invoice-items td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .invoice-items th { background-color: #1E40AF; color: white; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-name">ZION HOSPITAL</div>
            <div class="emergency-badge">EMERGENCY VISIT</div>
            <div style="margin-top: 5px;">Medical Invoice</div>
          </div>
          <div class="patient-info">
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Patient ID:</strong> ${patientId}</p>
            <p><strong>Visit ID:</strong> ${visitId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('en-US')}</p>
          </div>
          <table class="invoice-items">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice.toLocaleString()} IQD</td>
                  <td>${item.total.toLocaleString()} IQD</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Grand Total: ${invoice.total.toLocaleString('en-US')} IQD</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing NARS Hospital</p>
            <p>Generated on ${new Date().toLocaleString('en-US')}</p>
          </div>
        </body>
        </html>
      `
      
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }

    setTimeout(() => {
      printInvoice()
    }, 500)

    setIsCompleting(false)
    onCompleteVisit()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen" style={{ backgroundColor: '#F1F5F9' }}>
      {/* Sticky Header - Patient Name & Back Button with Emergency Indicator */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex-shrink-0 flex items-center justify-between shadow-sm relative">
        {/* Emergency Red Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
        <div className="flex items-center gap-4 ml-2">
          <AlertTriangle className="text-red-500" size={22} />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
            <span className="text-base text-red-600 font-bold uppercase tracking-wide">Emergency Room</span>
          </div>
          <span className="text-base font-medium text-slate-600">
            {formatNumber(patient.age)} years, {patient.gender} • ID: {patient.id}
          </span>
        </div>
      {onBackToQueue && (
          <button
            onClick={onBackToQueue}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-lg text-base font-bold transition-all shadow-sm"
            style={{ borderRadius: '8px' }}
          >
            <ArrowLeft size={18} />
            <span>Back to Queue</span>
          </button>
        )}
        </div>

      {/* Main Content - Compact Layout */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Left Column: Patient Info & Vitals */}
        <div className="w-1/3 flex flex-col gap-2 overflow-y-auto">
          {/* Patient Info - Bold Typography with Emergency Indicator */}
          <div className="bg-white rounded-lg border-2 border-red-200 p-3 flex-shrink-0 shadow-sm relative">
            {/* Emergency Red Border Indicator */}
            <div className="absolute -left-1 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg"></div>
            <div className="space-y-2">
              <div>
                <p className="text-base font-bold text-slate-700 mb-1">Chief Complaint</p>
                <p className="text-lg font-bold text-slate-900">{patient?.chiefComplaint || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-base font-bold text-slate-700">Age</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(patient.age)} years</p>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-700">Gender</p>
                  <p className="text-lg font-bold text-slate-900">{patient.gender || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vital Signs - Bold Large Values with Heartbeat Icon */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse size={20} className="text-red-500" />
              <h3 className="text-base font-bold text-slate-700 uppercase tracking-wide">Vital Signs</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-base font-bold text-slate-700 mb-1">BP</p>
                <p className="text-xl font-bold text-slate-900">{patient?.triage?.vitalSigns?.bp || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-700 mb-1">Temp</p>
                <p className="text-xl font-bold text-slate-900">{patient?.triage?.vitalSigns?.temperature || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-700 mb-1">Pulse</p>
                <p className="text-xl font-bold text-slate-900">{patient?.triage?.vitalSigns?.pulse || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-700 mb-1">Weight</p>
                <p className="text-xl font-bold text-slate-900">{patient?.weight || patient?.triage?.vitalSigns?.weight || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Clinical Notes */}
        <div className="w-1/3 flex flex-col gap-2 overflow-hidden">
          {/* Final Diagnosis - Prominent */}
          <div className="bg-white rounded-lg border-2 border-[#1E40AF]/30 p-3 flex-1 flex flex-col shadow-md">
            <label className="block text-lg font-bold text-[#1E40AF] mb-2 flex items-center gap-2">
              <Stethoscope size={20} className="text-[#1E40AF]" />
              <span>Final Diagnosis *</span>
            </label>
            <textarea
              ref={diagnosisInputRef}
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value)
                if (e.target instanceof HTMLTextAreaElement) {
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
                }
              }}
              placeholder="Enter final diagnosis..."
              className="flex-1 w-full px-4 py-3 bg-slate-50 border-2 border-[#1E40AF]/20 rounded-lg text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF] resize-none"
              style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: '700' }}
            />
          </div>
        </div>

        {/* Right Column: Actions & Billing */}
        <div className="w-1/3 flex flex-col gap-2 overflow-y-auto">
          {/* ER Procedure Buttons - Square Large Buttons */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex-shrink-0 shadow-sm">
            <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Siren size={22} className="text-red-500" />
              <span>Emergency Procedures</span>
            </h3>
            
            {/* ER Procedure Buttons - Square Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* IV Fluid Button - Square */}
              <button
                onClick={() => handleQuickProcedure('iv-fluid')}
                disabled={appliedProcedures.includes('iv-fluid')}
                className={`relative aspect-square p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center shadow-md hover:shadow-lg ${
                  appliedProcedures.includes('iv-fluid')
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white cursor-not-allowed'
                    : 'bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] hover:border-[#1E3A8A] active:scale-[0.97]'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Droplet size={32} className="mb-2" />
                <span className="text-base font-bold text-center mb-1">IV Fluid</span>
                <span className="text-sm font-bold">{formatNumber(25000)} IQD</span>
                {appliedProcedures.includes('iv-fluid') && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                )}
              </button>

              {/* Injection Button - Square */}
              <button
                onClick={() => handleQuickProcedure('injection')}
                disabled={appliedProcedures.includes('injection')}
                className={`relative aspect-square p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center shadow-md hover:shadow-lg ${
                  appliedProcedures.includes('injection')
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white cursor-not-allowed'
                    : 'bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] hover:border-[#1E3A8A] active:scale-[0.97]'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Syringe size={32} className="mb-2" />
                <span className="text-base font-bold text-center mb-1">Injection</span>
                <span className="text-sm font-bold">{formatNumber(15000)} IQD</span>
                {appliedProcedures.includes('injection') && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                )}
              </button>

              {/* Wound Dressing Button - Square */}
              <button
                onClick={() => handleQuickProcedure('wound-dressing')}
                disabled={appliedProcedures.includes('wound-dressing')}
                className={`relative aspect-square p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center shadow-md hover:shadow-lg ${
                  appliedProcedures.includes('wound-dressing')
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white cursor-not-allowed'
                    : 'bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] hover:border-[#1E3A8A] active:scale-[0.97]'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Package size={32} className="mb-2" />
                <span className="text-base font-bold text-center mb-1">Wound Dressing</span>
                <span className="text-sm font-bold">{formatNumber(5000)} IQD</span>
                {appliedProcedures.includes('wound-dressing') && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                )}
              </button>

              {/* Stitching Button - Square */}
              <button
                onClick={() => handleQuickProcedure('stitching')}
                disabled={appliedProcedures.includes('stitching')}
                className={`relative aspect-square p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center shadow-md hover:shadow-lg ${
                  appliedProcedures.includes('stitching')
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white cursor-not-allowed'
                    : 'bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] hover:border-[#1E3A8A] active:scale-[0.97]'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Scissors size={32} className="mb-2" />
                <span className="text-base font-bold text-center mb-1">Stitching</span>
                <span className="text-sm font-bold">{formatNumber(35000)} IQD</span>
                {appliedProcedures.includes('stitching') && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                )}
              </button>

              {/* Oxygen Button - Square */}
              <button
                onClick={() => handleQuickProcedure('oxygen')}
                disabled={appliedProcedures.includes('oxygen')}
                className={`relative aspect-square p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center shadow-md hover:shadow-lg ${
                  appliedProcedures.includes('oxygen')
                    ? 'bg-[#1E40AF] border-[#1E40AF] text-white cursor-not-allowed'
                    : 'bg-[#1E40AF] border-[#1E40AF] text-white hover:bg-[#1E3A8A] hover:border-[#1E3A8A] active:scale-[0.97]'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <Activity size={32} className="mb-2" />
                <span className="text-base font-bold text-center mb-1">Oxygen</span>
                <span className="text-sm font-bold">{formatNumber(20000)} IQD</span>
                {appliedProcedures.includes('oxygen') && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Applied Procedures Summary - Bold Typography */}
          {appliedProcedures.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex-shrink-0 shadow-sm">
              <h3 className="text-base font-bold text-slate-700 mb-2">Applied Procedures</h3>
              <div className="space-y-2">
                {appliedProcedures.map((procId) => {
                  const procedure = QUICK_PROCEDURES.find((p) => p.id === procId)
                  return procedure ? (
                    <div key={procId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-base font-bold text-slate-900">{procedure.label}</span>
                      <span className="text-lg font-bold text-[#1E40AF]">{formatNumber(procedure.price)} IQD</span>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Quick Meds - ER prescriptions (appear in Pharmacy as Urgent ER Order, cost added to invoice) */}
          <div className="bg-white rounded-lg border-2 border-amber-200 p-3 flex-shrink-0 shadow-sm">
            <h3 className="text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Pill size={18} className="text-amber-500" />
              Quick Meds
            </h3>
            <p className="text-xs text-slate-500 mb-2">Added to Pharmacy as Urgent ER Order and to invoice</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_MEDS_OPTIONS.filter((m) => !quickMeds.some((q) => q.medicineName === m.name)).map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    setQuickMeds((prev) => [
                      ...prev,
                      { medicineName: m.name, dosage: '1 tab', frequency: 'As needed', price: m.defaultPrice },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-500/20"
                >
                  <Plus size={14} />
                  {m.name}
                </button>
              ))}
            </div>
            {quickMeds.length > 0 && (
              <div className="space-y-1.5">
                {quickMeds.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-800">
                      {med.medicineName} – {med.dosage}, {med.frequency}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1E40AF]">{formatNumber(med.price)} IQD</span>
                      <button
                        type="button"
                        onClick={() => setQuickMeds((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refer to Lab / Radiology - adds to department queue and invoice */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-3 flex-shrink-0 shadow-sm">
            <h3 className="text-base font-bold text-slate-700 mb-2 flex items-center gap-2">Refer to</h3>
            <div className="flex gap-2">
              <button
                onClick={handleReferToLab}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-sm font-semibold text-cyan-700 hover:bg-cyan-500/20 transition-colors"
              >
                <Microscope size={18} />
                Lab
              </button>
              <button
                onClick={handleReferToRadiology}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm font-semibold text-violet-700 hover:bg-violet-500/20 transition-colors"
              >
                <Scan size={18} />
                Radiology
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Current Invoice Total - Fixed at Bottom */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex-shrink-0 shadow-sm">
            <p className="text-base font-bold text-slate-700 mb-1">Current Total</p>
            <p className="text-2xl font-bold text-[#1E40AF]">
              {(() => {
                const patientId = patient.id
                const visitId = patient.visitId || generateERVisitId()
                const invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
                return invoice ? formatNumber(invoice.total) : '0'
              })()} IQD
            </p>
          </div>
        </div>
      </div>

      {/* Confirm: syncs Finance + Pharmacy + marks visit complete */}
      <div className="bg-white border-t border-[#E2E8F0] p-3 flex-shrink-0 shadow-sm">
        <button
          onClick={() => handleCompleteVisit()}
          disabled={isCompleting}
          className="w-full py-3 bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-70 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
          style={{ borderRadius: '8px', fontSize: '18px' }}
        >
          {isCompleting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Updating Finance & Pharmacy...</span>
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              <span>Confirm</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

