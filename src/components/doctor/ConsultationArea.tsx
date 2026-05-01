'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { usePharmacy } from '@/contexts/PharmacyContext'
import { useLabResults, type LabRequest } from '@/contexts/LabResultsContext'
import { generateVisitId } from '@/lib/visitIdGenerator'
import { printPrescription } from '@/lib/printUtils'
import { getServicePrice, mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'
import { printMedicalReport } from '@/lib/medicalReportPrint'
import { 
  ArrowLeft,
  CheckCircle,
  HeartPulse,
  Stethoscope,
  Microscope,
  Scan,
  Pill,
  ChevronDown,
  Plus,
  Trash2,
  Printer,
  AlertTriangle,
} from 'lucide-react'
import { STANDARD_TEST_PRICES, COMMON_MEDICATIONS, QUICK_TAGS } from '@/constants'

interface ConsultationAreaProps {
  patient: any
  onCompleteVisit: () => void
  onBackToQueue?: () => void
}

interface PrescriptionItem {
  id: string
  medicine: string
  dosage: string
  frequency: string
}

export default function ConsultationArea({ patient, onCompleteVisit, onBackToQueue }: ConsultationAreaProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { updatePatientStatus } = useWaitingList()
  const { saveVisitData } = useVisitData()
  const { getInvoice, getInvoiceByPatientId, createInvoice, addInvoiceItem } = useCentralizedBilling()
  const { createPrescription } = usePharmacy()
  const { labRequests, addLabRequest, deleteLabRequest, getLabResultsForPatient } = useLabResults()

  const [diagnosis, setDiagnosis] = useState('')
  const [finalDisposition, setFinalDisposition] = useState<string>('')
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [isSendingToPharmacy, setIsSendingToPharmacy] = useState(false)
  const [pharmacySuccess, setPharmacySuccess] = useState(false)
  
  // Laboratory section
  const [activeLaboratorySection, setActiveLaboratorySection] = useState(false)
  const [laboratorySearchInput, setLaboratorySearchInput] = useState('')
  const [laboratoryPrice, setLaboratoryPrice] = useState<number | null>(null)
  const [laboratoryManualPrice, setLaboratoryManualPrice] = useState('')
  const [showLaboratoryDropdown, setShowLaboratoryDropdown] = useState(false)
  const [filteredLaboratoryTests, setFilteredLaboratoryTests] = useState<string[]>([])
  const laboratorySearchInputRef = useRef<HTMLInputElement>(null)
  
  // Radiology section
  const [activeRadiologySection, setActiveRadiologySection] = useState(false)
  const [radiologySearchInput, setRadiologySearchInput] = useState('')
  const [radiologyPrice, setRadiologyPrice] = useState<number | null>(null)
  const [radiologyManualPrice, setRadiologyManualPrice] = useState('')
  const [showRadiologyDropdown, setShowRadiologyDropdown] = useState(false)
  const [filteredRadiologyTests, setFilteredRadiologyTests] = useState<string[]>([])
  const radiologySearchInputRef = useRef<HTMLInputElement>(null)
  
  // Medication section
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false)
  const [medicationSearchInput, setMedicationSearchInput] = useState('')
  const [medicationPrice, setMedicationPrice] = useState<number | null>(null)
  const [medicationManualPrice, setMedicationManualPrice] = useState('')
  const [filteredMedications, setFilteredMedications] = useState<string[]>([])
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const medicationSearchInputRef = useRef<HTMLInputElement>(null)
  
  const diagnosisInputRef = useRef<HTMLTextAreaElement>(null)

  // Get laboratory tests
  const getLaboratoryTests = (): string[] => {
    const labTests: string[] = []
    for (const testName of Object.keys(STANDARD_TEST_PRICES)) {
      const testLower = testName.toLowerCase()
      if (!testLower.includes('x-ray') && 
          !testLower.includes('x ray') && 
          !testLower.includes('ultrasound') && 
          !testLower.includes('us') && 
          !testLower.includes('echocardiogram') &&
          !testLower.startsWith('ct ') &&
          !testLower.startsWith('mri ')) {
        labTests.push(testName)
      }
    }
    return Array.from(new Set(labTests)).sort((a, b) => a.localeCompare(b))
  }

  // Get radiology tests
  const getRadiologyTests = (): string[] => {
    const radTests: string[] = []
    for (const testName of Object.keys(STANDARD_TEST_PRICES)) {
      const testLower = testName.toLowerCase()
      if (testLower.includes('x-ray') || 
          testLower.includes('x ray') || 
          testLower.includes('ultrasound') || 
          testLower.includes('us') || 
          testLower.includes('echocardiogram') ||
          testLower.startsWith('ct ') ||
          testLower.startsWith('mri ')) {
        radTests.push(testName)
      }
    }
    return Array.from(new Set(radTests)).sort((a, b) => a.localeCompare(b))
  }

  // Update invoice total
  useEffect(() => {
    if (!patient) {
      setInvoiceTotal(0)
      return
    }
    
    const getCurrentInvoiceTotal = (): number => {
      const patientId = patient.id
      const visitId = patient.visitId || ('VISIT-' + patientId)
      const invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
      return invoice?.total || 0
    }
    
    setInvoiceTotal(getCurrentInvoiceTotal())
    const interval = setInterval(() => {
      setInvoiceTotal(getCurrentInvoiceTotal())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [patient, getInvoice, getInvoiceByPatientId])

  // Auto-focus diagnosis input
  useEffect(() => {
    if (patient && diagnosisInputRef.current) {
      setTimeout(() => {
        diagnosisInputRef.current?.focus()
      }, 100)
    }
  }, [patient])

  // Smart Re-entry: when opening a Ready-for-Review patient, mark as In_Consultation (no extra fee)
  useEffect(() => {
    if (!patient?.isReadyForReview || !patient?.visitId || !user?.id) return
    const visitId = patient.visitId
    const patientId = patient.id
    fetch('/api/doctor/visit/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitId,
        patientId,
        doctorId: user.id,
        isFollowUp: true,
      }),
    }).catch(err => console.error('Failed to start review visit:', err))
  }, [patient?.isReadyForReview, patient?.visitId, patient?.id, user?.id])

  const handleCompleteVisit = async () => {
    if (!patient || !user) return

    // Decision Locking: require final disposition
    if (!finalDisposition) {
      setCompletionError('Please select a Final Disposition before closing.')
      alert('Please select a Final Disposition before closing.')
      return
    }

    setCompletionError(null)

    const patientId = patient.id
    const firstName = patient.firstName || ''
    const lastName = patient.lastName || ''
    const fullName = (firstName + ' ' + lastName).trim()
    const patientName = patient.name || fullName || 'Unknown Patient'
    
    const visitId = patient.visitId || generateVisitId()
    
    let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
    if (!invoice) {
      invoice = createInvoice(patientId, patientName, visitId)
    }

    // Add consultation fee to database bill and update visit status
    const visitRes = await fetch(`/api/visits/${invoice.visitId}`).catch(() => null)
    const visitData = visitRes?.ok ? await visitRes.json() : null
    const isFollowUpVisit = !!patient?.isReadyForReview || !!visitData?.visit?.isFollowUp
    const consultationFee = isFollowUpVisit ? 0 : 50000
    const hasConsultationFee = invoice.items.some(item => item.department === 'Doctor' && item.description.includes('Consultation'))
    
    if (!hasConsultationFee) {
      // Sync to database
      try {
        await fetch('/api/billing/invoice/add-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitId: invoice.visitId,
            patientId: patientId,
            department: 'Doctor',
            description: isFollowUpVisit ? 'Follow-up Consultation (Free)' : 'Doctor Consultation',
            quantity: 1,
            unitPrice: consultationFee,
            total: consultationFee,
            addedBy: user.id,
          }),
        })

        // Update visit status to In_Consultation
        await fetch('/api/doctor/visit/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitId: invoice.visitId,
            patientId: patientId,
            doctorId: user.id,
            isFollowUp: isFollowUpVisit,
          }),
        })
        // (isFollowUpVisit already set above from patient.isReadyForReview or visit.isFollowUp)
      } catch (err) {
        console.error('Failed to sync consultation fee to database:', err)
      }

      // Also add to local invoice for UI
      addInvoiceItem(invoice.visitId, {
        department: 'Doctor',
        description: 'Doctor Consultation',
        quantity: 1,
        unitPrice: consultationFee,
        total: consultationFee,
        addedBy: user.id,
      })
    }

    // Get all lab tests
    const completedLabs = getLabResultsForPatient(patientId)
    const allLabTests = [
      ...completedLabs.map((result: LabRequest) => ({
        testType: result.testType,
        category: result.category,
        specificTestName: result.specificTestName,
        department: result.department,
      })),
      ...labRequests
        .filter((req) => req.patientId === patientId && req.status === 'Pending')
        .map((req) => ({
          testType: req.testType,
          category: req.category,
          specificTestName: req.specificTestName,
          department: req.department,
        })),
    ]

    // Convert prescription list to text
    const prescriptionText = prescriptionList
      .map((item) => item.medicine + ' ' + item.dosage + ' - ' + item.frequency)
      .join('\n')

    // Save visit data (local context)
    saveVisitData({
      patientId,
      patientName,
      diagnosis,
      prescription: prescriptionText,
      notes: '',
      labTests: allLabTests,
      completedAt: new Date().toISOString(),
    })

    // Send prescription to Pharmacy
    if (prescriptionList.length > 0) {
      const prescriptionItems = prescriptionList.map((item) => ({
        id: item.id,
        medicineName: item.medicine,
        dosage: item.dosage,
        frequency: item.frequency,
      }))

      createPrescription({
        visitId,
        patientId,
        patientName,
        doctorId: user.id,
        doctorName: user.name || 'Dr. Unknown',
        items: prescriptionItems,
      })
    }

    // Update patient status (local queue / legacy)
    updatePatientStatus(patientId, 'Pending Payment')

    // Decision Locking + Automated Billing Sync in database
    try {
      await fetch('/api/doctor/visit/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          patientId,
          doctorId: user.id,
          finalDisposition,
          diagnosis,
          prescription: prescriptionText,
        }),
      })
    } catch (err) {
      console.error('❌ Failed to sync visit closure to backend:', err)
    }

    // Trigger print preview
    const printInvoice = () => {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      
      const itemsHTML = invoice.items.map((item) => {
        return '<tr>' +
          '<td>' + item.description + '</td>' +
          '<td>' + item.quantity + '</td>' +
          '<td>' + item.unitPrice.toLocaleString() + ' IQD</td>' +
          '<td>' + item.total.toLocaleString() + ' IQD</td>' +
        '</tr>'
      }).join('')
      
      const invoiceHTML = '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
          '<title>Invoice - ' + patientName + '</title>' +
          '<style>' +
            '@media print { @page { size: A5; margin: 10mm; } }' +
            'body { font-family: Arial, sans-serif; padding: 20px; }' +
            '.header { text-align: center; margin-bottom: 20px; }' +
            '.hospital-name { font-size: 24px; font-weight: bold; color: #1E40AF; }' +
            '.patient-info { margin: 15px 0; }' +
            '.invoice-items { width: 100%; border-collapse: collapse; margin: 20px 0; }' +
            '.invoice-items th, .invoice-items td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }' +
            '.invoice-items th { background-color: #1E40AF; color: white; }' +
            '.total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }' +
            '.footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div class="header">' +
            '<div class="hospital-name">ZION HOSPITAL</div>' +
            '<div style="margin-top: 5px;">Medical Invoice</div>' +
          '</div>' +
          '<div class="patient-info">' +
            '<p><strong>Patient:</strong> ' + patientName + '</p>' +
            '<p><strong>Patient ID:</strong> ' + patientId + '</p>' +
            '<p><strong>Visit ID:</strong> ' + visitId + '</p>' +
            '<p><strong>Date:</strong> ' + new Date().toLocaleString('en-US') + '</p>' +
          '</div>' +
          '<table class="invoice-items">' +
            '<thead>' +
              '<tr>' +
                '<th>Description</th>' +
                '<th>Qty</th>' +
                '<th>Price</th>' +
                '<th>Total</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + itemsHTML + '</tbody>' +
          '</table>' +
          '<div class="total">' +
            '<p>Grand Total: ' + invoice.total.toLocaleString('en-US') + ' IQD</p>' +
          '</div>' +
          '<div class="footer">' +
            '<p>Thank you for choosing NARS Hospital</p>' +
            '<p>Generated on ' + new Date().toLocaleString('en-US') + '</p>' +
          '</div>' +
        '</body>' +
        '</html>'
      
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

    onCompleteVisit()
  }

  const handleSendToPharmacy = async () => {
    if (!patient || !user) return

    if (prescriptionList.length === 0) {
      alert('Please add at least one medication to the prescription before sending to pharmacy.')
      return
    }

    setIsSendingToPharmacy(true)
    setPharmacySuccess(false)
    setCompletionError(null)

    try {
      const patientId = patient.id
      if (!patientId) {
        throw new Error('Patient ID is missing. Please select a valid patient.')
      }

      // Get the actual visit ID from the patient object or find it
      // The visitId might be in patient.visitId or we need to find it from the database
      const visitId = patient.visitId || null
      
      // Prepare prescription items with all required fields
      const prescriptionItems = prescriptionList.map((item) => ({
        id: item.id,
        medicineName: item.medicine,
        medicine: item.medicine, // Include both for compatibility
        dosage: item.dosage || 'As prescribed',
        frequency: item.frequency || 'As needed',
      }))

      // Update visit status in database first (this will find or create the visit)
      const response = await fetch('/api/doctor/visit/send-to-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: visitId, // May be null, API will find/create visit
          patientId: patientId,
          doctorId: user.id,
          prescriptionItems: prescriptionItems,
          diagnosis: diagnosis || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send prescription to pharmacy')
      }

      const responseData = await response.json()
      const actualVisitId = responseData.visit?.id || visitId

      // Save prescription to local context (for Pharmacy dashboard) using the actual visit ID
      createPrescription({
        visitId: actualVisitId,
        patientId: patientId,
        patientName: patient.name || `${patient.firstName} ${patient.lastName}`,
        doctorId: user.id,
        doctorName: user.name || 'Dr. Unknown',
        items: prescriptionItems,
      })

      // Update patient status in waiting list (remove from doctor's queue)
      updatePatientStatus(patientId, 'Pending Payment')

      setPharmacySuccess(true)
      
      // Show success message
      alert('✅ Prescription sent to pharmacy successfully! Patient has been moved to pharmacy queue.')

      // Refresh the page to update the queue immediately
      router.refresh()

      // Navigate back to queue after a short delay
      setTimeout(() => {
        if (onBackToQueue) {
          onBackToQueue()
        }
      }, 500)
    } catch (error: any) {
      console.error('❌ Failed to send prescription to pharmacy:', error)
      setCompletionError(error?.message || 'Failed to send prescription to pharmacy. Please try again.')
      alert(`❌ Error: ${error?.message || 'Failed to send prescription to pharmacy. Please try again.'}`)
    } finally {
      setIsSendingToPharmacy(false)
    }
  }

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-secondary font-medium">No patient selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen bg-[#0B1120] max-h-screen">
      {/* Sticky Header */}
      <div className="bg-[#161F32] border-b border-slate-700 px-4 py-3 flex-shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[#F1F5F9]">{patient?.name || 'Patient'}</h2>
          <span className="text-base font-medium text-[#94A3B8]">
            {patient?.age || 'N/A'} years, {patient?.gender || 'N/A'} • ID: {patient?.id}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToQueue && (
            <button
              onClick={onBackToQueue}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded-lg text-base font-bold transition-all"
            >
              <ArrowLeft size={18} />
              <span>Back to Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Left Column: Patient Info, Allergy Alert & Vitals */}
        <div className="w-1/3 flex flex-col gap-2 overflow-hidden">
          {/* Allergy Alert */}
          {patient?.allergies &&
            patient.allergies.trim() !== '' &&
            patient.allergies.trim().toLowerCase() !== 'none' && (
              <div className="bg-amber-500/20 border border-amber-400/70 rounded-lg p-3 text-xs text-amber-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={16} className="text-amber-200" />
                  <span className="font-semibold uppercase tracking-wide">
                    Allergy Alert
                  </span>
                </div>
                <p className="text-[11px] leading-snug">
                  This patient has documented allergies:{' '}
                  <span className="font-semibold">
                    {patient.allergies}
                  </span>
                </p>
              </div>
            )}
          {/* Patient Info */}
          <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-3 flex-shrink-0 shadow-sm">
            <div className="space-y-2">
              <div>
                <p className="text-base font-bold text-[#94A3B8] mb-1">Chief Complaint</p>
                <p className="text-lg font-bold text-[#F1F5F9]">{patient?.chiefComplaint || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-base font-bold text-[#94A3B8]">Age</p>
                  <p className="text-lg font-bold text-[#F1F5F9]">{patient?.age || 'N/A'} years</p>
                </div>
                <div>
                  <p className="text-base font-bold text-[#94A3B8]">Gender</p>
                  <p className="text-lg font-bold text-[#F1F5F9]">{patient?.gender || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-3 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse size={20} className="text-red-500" />
              <h3 className="text-base font-bold text-[#94A3B8] uppercase tracking-wide">Vital Signs</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-base font-bold text-[#94A3B8] mb-1">BP</p>
                <p className="text-xl font-bold text-[#F1F5F9]">{patient?.vitalSigns?.bp || patient?.triage?.vitalSigns?.bp || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#94A3B8] mb-1">Temp</p>
                <p className="text-xl font-bold text-[#F1F5F9]">{patient?.vitalSigns?.temperature || patient?.triage?.vitalSigns?.temperature || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#94A3B8] mb-1">Pulse</p>
                <p className="text-xl font-bold text-[#F1F5F9]">{patient?.vitalSigns?.heartRate || patient?.triage?.vitalSigns?.pulse || 'N/A'}</p>
              </div>
              <div>
                <p className="text-base font-bold text-[#94A3B8] mb-1">Weight</p>
                <p className="text-xl font-bold text-[#F1F5F9]">{patient?.weight || patient?.vitalSigns?.weight || patient?.triage?.vitalSigns?.weight || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Diagnosis */}
        <div className="w-1/3 flex flex-col gap-2 overflow-hidden">
          <div className="bg-[#1E293B] rounded-lg border-2 border-slate-700 p-3 flex-1 flex flex-col shadow-md">
            <label className="block text-lg font-bold text-[#3B82F6] mb-2 flex items-center gap-2">
              <Stethoscope size={20} className="text-[#3B82F6]" />
              <span>Final Diagnosis *</span>
            </label>
            <textarea
              ref={diagnosisInputRef}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter final diagnosis..."
              className="flex-1 w-full px-4 py-3 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] resize-none"
              style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: '700' }}
            />
          </div>
        </div>

        {/* Right Column: Actions & Final Disposition - NO SCROLL */}
        <div className="w-1/3 flex flex-col overflow-hidden max-h-screen gap-3" style={{ paddingTop: '2px', paddingBottom: '2px', height: '100%' }}>
          {/* Final Disposition (Decision Locking) */}
          <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-3 flex-shrink-0 shadow-sm">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Final Disposition <span className="text-rose-400">*</span>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Discharge', 'Admit to Ward', 'Refer to Specialist'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFinalDisposition(option)}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${
                    finalDisposition === option
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {completionError && (
              <p className="text-[11px] text-rose-400 mt-2">
                {completionError}
              </p>
            )}
          </div>
          {/* Refer: Laboratory & Radiology — large buttons only */}
          <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-2 flex-shrink-0 shadow-sm flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Laboratory Button - Wide */}
              <button
                onClick={() => {
                  const newState = !activeLaboratorySection
                  setActiveLaboratorySection(newState)
                  setActiveRadiologySection(false)
                  setShowMedicationDropdown(false)
                  
                  if (newState) {
                    setLaboratorySearchInput('')
                    setLaboratoryPrice(null)
                    setLaboratoryManualPrice('')
                    const labTests = getLaboratoryTests()
                    setFilteredLaboratoryTests(labTests)
                    setShowLaboratoryDropdown(false)
                    setTimeout(() => {
                      laboratorySearchInputRef.current?.focus()
                    }, 100)
                  } else {
                    setLaboratorySearchInput('')
                    setShowLaboratoryDropdown(false)
                  }
                }}
                className={activeLaboratorySection
                  ? 'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all shadow-md hover:shadow-lg bg-[#1E40AF] text-white border-2 border-[#1E40AF]'
                  : 'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all shadow-md hover:shadow-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border-2 border-slate-600'}
                style={{ borderRadius: '8px' }}
              >
                <Microscope 
                  size={18} 
                  className={activeLaboratorySection ? 'text-white' : 'text-slate-400'}
                  strokeWidth={2.5}
                />
                <span className="text-sm font-bold">Laboratory</span>
              </button>
              
              {/* Radiology Button - Wide */}
              <button
                onClick={() => {
                  const newState = !activeRadiologySection
                  setActiveRadiologySection(newState)
                  setActiveLaboratorySection(false)
                  setShowMedicationDropdown(false)
                  
                  if (newState) {
                    setRadiologySearchInput('')
                    setRadiologyPrice(null)
                    setRadiologyManualPrice('')
                    const radTests = getRadiologyTests()
                    setFilteredRadiologyTests(radTests)
                    setShowRadiologyDropdown(false)
                    setTimeout(() => {
                      radiologySearchInputRef.current?.focus()
                    }, 100)
                  } else {
                    setRadiologySearchInput('')
                    setShowRadiologyDropdown(false)
                  }
                }}
                className={activeRadiologySection
                  ? 'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all shadow-md hover:shadow-lg bg-[#1E40AF] text-white border-2 border-[#1E40AF]'
                  : 'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all shadow-md hover:shadow-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border-2 border-slate-600'}
                style={{ borderRadius: '8px' }}
              >
                <Scan 
                  size={18} 
                  className={activeRadiologySection ? 'text-white' : 'text-slate-400'}
                  strokeWidth={2.5}
                />
                <span className="text-sm font-bold">Radiology</span>
              </button>
            </div>
            
            {/* Row 2: Tests Search Bar - Height 36px */}
            {(activeLaboratorySection || activeRadiologySection) && (
              <div className="space-y-1">
                {/* Laboratory Search Section */}
                {activeLaboratorySection && (
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <Microscope size={22} className="text-[#3B82F6]" strokeWidth={2.5} />
                    </div>
                    
                    <input
                      ref={laboratorySearchInputRef}
                      type="text"
                      value={laboratorySearchInput}
                      onChange={(e) => {
                        setLaboratorySearchInput(e.target.value)
                        if (showLaboratoryDropdown) {
                          setFilteredLaboratoryTests(getLaboratoryTests().filter(test =>
                            test.toLowerCase().includes(e.target.value.toLowerCase())
                          ))
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowLaboratoryDropdown(false), 200)}
                      placeholder="Search laboratory test..."
                      className="w-full pl-14 pr-12 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all"
                      style={{ borderRadius: '8px', fontSize: '16px', height: '50px', lineHeight: '50px', paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
                    />
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const newState = !showLaboratoryDropdown
                        setShowLaboratoryDropdown(newState)
                        if (newState && filteredLaboratoryTests.length === 0) {
                          setFilteredLaboratoryTests(getLaboratoryTests())
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 hover:bg-slate-700/50 rounded transition-all flex items-center justify-center"
                      style={{ width: '32px', height: '32px' }}
                    >
                      <ChevronDown 
                        size={20} 
                        className={'text-slate-400 transition-transform duration-200 ' + (showLaboratoryDropdown ? 'rotate-180' : '')}
                      />
                    </button>
                    
                    {showLaboratoryDropdown && filteredLaboratoryTests.length > 0 && (
                      <div 
                        className="absolute w-full mt-1 bg-[#1E293B] border-2 border-slate-600 rounded-lg shadow-2xl overflow-hidden"
                        style={{ 
                          zIndex: 9999,
                          maxHeight: '120px',
                          overflowY: 'auto',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                          top: '100%'
                        }}
                      >
                        <div className="max-h-[120px] overflow-y-auto">
                          {filteredLaboratoryTests.map((test) => (
                            <button
                              key={test}
                              type="button"
                              onClick={() => {
                                setLaboratorySearchInput(test)
                                setShowLaboratoryDropdown(false)
                                const price = STANDARD_TEST_PRICES[test] || null
                                setLaboratoryPrice(price)
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors border-b border-slate-600 last:border-b-0 font-bold text-[#F1F5F9] flex items-center justify-between"
                              style={{ fontSize: '12px' }}
                            >
                              <span className="flex-1">{test}</span>
                              {STANDARD_TEST_PRICES[test] && (
                                <span className="ml-2 text-xs font-bold text-emerald-400 whitespace-nowrap">
                                  {STANDARD_TEST_PRICES[test].toLocaleString()} IQD
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Radiology Search Section */}
                {activeRadiologySection && (
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <Scan size={22} className="text-[#3B82F6]" strokeWidth={2.5} />
                    </div>
                    
                    <input
                      ref={radiologySearchInputRef}
                      type="text"
                      value={radiologySearchInput}
                      onChange={(e) => {
                        setRadiologySearchInput(e.target.value)
                        if (showRadiologyDropdown) {
                          setFilteredRadiologyTests(getRadiologyTests().filter(test =>
                            test.toLowerCase().includes(e.target.value.toLowerCase())
                          ))
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowRadiologyDropdown(false), 200)}
                      placeholder="Search radiology test..."
                      className="w-full pl-14 pr-12 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all"
                      style={{ borderRadius: '8px', fontSize: '16px', height: '50px', lineHeight: '50px', paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
                    />
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const newState = !showRadiologyDropdown
                        setShowRadiologyDropdown(newState)
                        if (newState && filteredRadiologyTests.length === 0) {
                          setFilteredRadiologyTests(getRadiologyTests())
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 hover:bg-slate-700/50 rounded transition-all flex items-center justify-center"
                      style={{ width: '32px', height: '32px' }}
                    >
                      <ChevronDown 
                        size={20} 
                        className={'text-slate-400 transition-transform duration-200 ' + (showRadiologyDropdown ? 'rotate-180' : '')}
                      />
                    </button>
                    
                    {showRadiologyDropdown && filteredRadiologyTests.length > 0 && (
                      <div 
                        className="absolute w-full mt-1 bg-[#1E293B] border-2 border-slate-600 rounded-lg shadow-2xl overflow-hidden"
                        style={{ 
                          zIndex: 9999,
                          maxHeight: '120px',
                          overflowY: 'auto',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                          top: '100%'
                        }}
                      >
                        <div className="max-h-[120px] overflow-y-auto">
                          {filteredRadiologyTests.map((test) => (
                            <button
                              key={test}
                              type="button"
                              onClick={() => {
                                setRadiologySearchInput(test)
                                setShowRadiologyDropdown(false)
                                const price = STANDARD_TEST_PRICES[test] || null
                                setRadiologyPrice(price)
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors border-b border-slate-600 last:border-b-0 font-bold text-[#F1F5F9] flex items-center justify-between"
                              style={{ fontSize: '12px' }}
                            >
                              <span className="flex-1">{test}</span>
                              {STANDARD_TEST_PRICES[test] && (
                                <span className="ml-2 text-xs font-bold text-emerald-400 whitespace-nowrap">
                                  {STANDARD_TEST_PRICES[test].toLocaleString()} IQD
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Price Field and Add Button */}
                {(laboratorySearchInput.trim() || radiologySearchInput.trim()) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={activeLaboratorySection ? laboratoryManualPrice : radiologyManualPrice}
                      onChange={(e) => {
                        if (activeLaboratorySection) {
                          setLaboratoryManualPrice(e.target.value)
                          const numValue = parseFloat(e.target.value)
                          setLaboratoryPrice(isNaN(numValue) ? null : numValue)
                        } else {
                          setRadiologyManualPrice(e.target.value)
                          const numValue = parseFloat(e.target.value)
                          setRadiologyPrice(isNaN(numValue) ? null : numValue)
                        }
                      }}
                      placeholder="Price (IQD)"
                      min="0"
                      step="1000"
                      className="flex-1 px-3 py-1.5 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                      style={{ borderRadius: '8px', fontSize: '12px', height: '32px', lineHeight: '32px' }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (activeLaboratorySection && laboratorySearchInput.trim() && patient && user) {
                          const patientId = patient.id
                          const visitId = patient.visitId || ('VISIT-' + patientId)
                          
                          let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
                          if (!invoice) {
                            const patientName = patient.name || 'Unknown Patient'
                            invoice = createInvoice(patientId, patientName, visitId)
                          }
                          
                          try {
                            // Get price from Admin Price Settings
                            const serviceType = mapTestToServiceType(laboratorySearchInput.trim(), 'Lab')
                            const priceInfo = await getServicePrice(serviceType)
                            const finalPrice = priceInfo?.price || laboratoryPrice || getDefaultPrice(serviceType)
                            const serviceName = priceInfo?.serviceName || laboratorySearchInput.trim()
                            
                            // Add to database invoice
                            const res = await fetch('/api/billing/invoice/add-item', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                visitId: invoice.visitId,
                                patientId: patientId,
                                department: 'Laboratory',
                                description: `Lab Fee: ${serviceName}`,
                                quantity: 1,
                                unitPrice: finalPrice,
                                total: finalPrice,
                                addedBy: user.id,
                              }),
                            })

                            if (!res.ok) {
                              const errorData = await res.json()
                              throw new Error(errorData.error || 'Failed to add to invoice')
                            }
                            
                            // Also add to local invoice for UI
                            addInvoiceItem(invoice.visitId, {
                              department: 'Laboratory',
                              description: `Lab Fee: ${serviceName}`,
                              quantity: 1,
                              unitPrice: finalPrice,
                              total: finalPrice,
                              addedBy: user.id,
                            })
                            
                            addLabRequest({
                              patientId: patient.id,
                              patientName: patient.name,
                              visitId: patient.id,
                              testType: laboratorySearchInput.trim(),
                              category: 'Laboratory',
                              specificTestName: laboratorySearchInput.trim(),
                              department: 'Lab',
                              requestedBy: user.id,
                            })
                            
                            setLaboratorySearchInput('')
                            setLaboratoryPrice(null)
                            setLaboratoryManualPrice('')
                          } catch (error: any) {
                            console.error('Error adding lab test:', error)
                            alert(`Error: ${error.message || 'Failed to add lab test'}`)
                          }
                        } else if (activeRadiologySection && radiologySearchInput.trim() && patient && user) {
                          const patientId = patient.id
                          const visitId = patient.visitId || ('VISIT-' + patientId)
                          
                          let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
                          if (!invoice) {
                            const patientName = patient.name || 'Unknown Patient'
                            invoice = createInvoice(patientId, patientName, visitId)
                          }
                          
                          try {
                            // Get price from Admin Price Settings
                            const serviceType = mapTestToServiceType(radiologySearchInput.trim(), 'Radiology')
                            const priceInfo = await getServicePrice(serviceType)
                            const finalPrice = priceInfo?.price || radiologyPrice || getDefaultPrice(serviceType)
                            const serviceName = priceInfo?.serviceName || radiologySearchInput.trim()
                            
                            // Add to database invoice
                            const res = await fetch('/api/billing/invoice/add-item', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                visitId: invoice.visitId,
                                patientId: patientId,
                                department: 'Radiology',
                                description: `Radiology Fee: ${serviceName}`,
                                quantity: 1,
                                unitPrice: finalPrice,
                                total: finalPrice,
                                addedBy: user.id,
                              }),
                            })

                            if (!res.ok) {
                              const errorData = await res.json()
                              throw new Error(errorData.error || 'Failed to add to invoice')
                            }
                            
                            // Also add to local invoice for UI
                            addInvoiceItem(invoice.visitId, {
                              department: 'Radiology',
                              description: `Radiology Fee: ${serviceName}`,
                              quantity: 1,
                              unitPrice: finalPrice,
                              total: finalPrice,
                              addedBy: user.id,
                            })
                            
                            addLabRequest({
                              patientId: patient.id,
                              patientName: patient.name,
                              visitId: patient.id,
                              testType: radiologySearchInput.trim(),
                              category: 'X-Ray',
                              specificTestName: radiologySearchInput.trim(),
                              department: 'Radiology',
                              requestedBy: user.id,
                            })
                            
                            setRadiologySearchInput('')
                            setRadiologyPrice(null)
                            setRadiologyManualPrice('')
                          } catch (error: any) {
                            console.error('Error adding radiology test:', error)
                            alert(`Error: ${error.message || 'Failed to add radiology test'}`)
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                      style={{ borderRadius: '8px', fontSize: '12px', height: '32px' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Medication Card (Middle) - Teal/Green Border */}
          <div className="bg-[#1E293B] rounded-lg border border-[#0D9488] p-2 flex-shrink-0 shadow-sm flex flex-col gap-2">
            {/* Prescription List - Always Visible (Above Button) */}
            {prescriptionList.length > 0 && (
              <div className="bg-[#1E293B] rounded-lg border border-slate-700/50 p-2 flex-shrink-0 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-bold text-[#94A3B8]">Prescribed Medications</h4>
                  <button
                    onClick={() => {
                      const patientName = patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Unknown Patient'
                      const visitId = patient?.visitId || generateVisitId()
                      printPrescription(
                        prescriptionList.map(item => ({
                          medicine: item.medicine,
                          dosage: item.dosage,
                          frequency: item.frequency,
                        })),
                        {
                          title: 'Medical Prescription',
                          patientName,
                          patientId: patient?.id,
                          visitId,
                          date: new Date().toISOString(),
                        }
                      )
                    }}
                    className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-[9px] font-semibold text-cyan-300 flex items-center gap-1 transition-all"
                    title="Print Prescription"
                  >
                    <Printer size={10} />
                    <span>Print</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prescriptionList.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0F172A] border border-slate-700/50 rounded-lg group hover:border-slate-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F1F5F9] font-bold text-[11px] truncate">{item.medicine}</p>
                        <p className="text-[9px] font-medium text-slate-400">{item.dosage} • {item.frequency}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPrescriptionList(prescriptionList.filter((i) => i.id !== item.id))
                        }}
                        className="p-0.5 hover:bg-red-900/50 rounded text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove medication"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Row 1: Medication Button - Large Horizontal */}
            <button
              onClick={() => {
                const newState = !showMedicationDropdown
                setShowMedicationDropdown(newState)
                setActiveLaboratorySection(false)
                setActiveRadiologySection(false)
                setShowLaboratoryDropdown(false)
                setShowRadiologyDropdown(false)
                
                if (newState) {
                  setMedicationSearchInput('')
                  setMedicationPrice(null)
                  setMedicationManualPrice('')
                  setFilteredMedications([...COMMON_MEDICATIONS])
                  setTimeout(() => {
                    medicationSearchInputRef.current?.focus()
                  }, 100)
                } else {
                  setMedicationSearchInput('')
                }
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all shadow-md hover:shadow-lg bg-[#0D9488] text-white border-2 border-[#0D9488] w-full"
              style={{ borderRadius: '8px' }}
            >
              <Pill 
                size={18} 
                className="text-white"
                strokeWidth={2.5}
              />
              <span className="text-sm font-bold">Medication</span>
            </button>
            
            {/* Row 2: Medication Search Bar */}
            {showMedicationDropdown && (
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Pill size={22} className="text-[#14B8A6]" strokeWidth={2.5} />
                  </div>
                  <input
                    ref={medicationSearchInputRef}
                    type="text"
                    value={medicationSearchInput}
                    onChange={(e) => {
                      setMedicationSearchInput(e.target.value)
                      if (showMedicationDropdown) {
                        setFilteredMedications(COMMON_MEDICATIONS.filter(med =>
                          med.toLowerCase().includes(e.target.value.toLowerCase())
                        ))
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        // Add medication to list
                        if (medicationSearchInput.trim()) {
                          const newItem: PrescriptionItem = {
                            id: Date.now().toString(),
                            medicine: medicationSearchInput.trim(),
                            dosage: dosage || 'As prescribed',
                            frequency: frequency || 'As needed',
                          }
                          setPrescriptionList([...prescriptionList, newItem])
                          // Clear input only after successful addition
                          setMedicationSearchInput('')
                          setDosage('')
                          setFrequency('')
                          setMedicationPrice(null)
                          setMedicationManualPrice('')
                          // Keep dropdown open and refocus
                          setTimeout(() => {
                            medicationSearchInputRef.current?.focus()
                          }, 50)
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Don't close if clicking on dropdown items or add button
                      const relatedTarget = e.relatedTarget as HTMLElement
                      if (relatedTarget && (
                        relatedTarget.closest('.medication-dropdown') ||
                        relatedTarget.closest('.add-medication-btn')
                      )) {
                        return
                      }
                      setTimeout(() => setShowMedicationDropdown(false), 200)
                    }}
                    placeholder="Search medication... (Press Enter to add)"
                    className="w-full pl-14 pr-12 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all"
                    style={{ borderRadius: '8px', fontSize: '16px', height: '50px', lineHeight: '50px', paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
                  />
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      const newState = !showMedicationDropdown
                      setShowMedicationDropdown(newState)
                      if (newState && filteredMedications.length === 0) {
                        setFilteredMedications([...COMMON_MEDICATIONS])
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 hover:bg-slate-700/50 rounded transition-all flex items-center justify-center"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <ChevronDown 
                      size={20} 
                      className={'text-slate-400 transition-transform duration-200 ' + (showMedicationDropdown ? 'rotate-180' : '')}
                    />
                  </button>
                  
                  {showMedicationDropdown && filteredMedications.length > 0 && (
                    <div 
                      className="medication-dropdown absolute w-full mt-1 bg-[#1E293B] border-2 border-slate-600 rounded-lg shadow-2xl overflow-hidden"
                      style={{ 
                        zIndex: 9999,
                        maxHeight: '120px',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                        top: '100%'
                      }}
                    >
                      <div className="max-h-[120px] overflow-y-auto">
                        {filteredMedications.map((med) => (
                          <button
                            key={med}
                            type="button"
                            onClick={() => {
                              setMedicationSearchInput(med)
                              // Don't close dropdown, just set the input value
                            }}
                            onMouseDown={(e) => {
                              // Prevent blur event when clicking dropdown item
                              e.preventDefault()
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors border-b border-slate-600 last:border-b-0 font-bold text-[#F1F5F9]"
                            style={{ fontSize: '12px' }}
                          >
                            {med}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Quick Tags */}
                {medicationSearchInput && (
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setDosage(tag.dosage || dosage)
                          setFrequency(tag.frequency)
                        }}
                        className="px-2.5 py-1 bg-teal-900/50 border-2 border-teal-700 text-teal-300 font-bold rounded-lg hover:bg-teal-800/50 transition-colors shadow-sm"
                        style={{ borderRadius: '6px', fontSize: '11px' }}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Price Field and Add Button */}
                {medicationSearchInput.trim() && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={medicationManualPrice}
                      onChange={(e) => {
                        setMedicationManualPrice(e.target.value)
                        const numValue = parseFloat(e.target.value)
                        setMedicationPrice(isNaN(numValue) ? null : numValue)
                      }}
                      placeholder="Price (IQD)"
                      min="0"
                      step="1000"
                      className="flex-1 px-3 py-1.5 bg-[#0F172A] border-2 border-slate-600 rounded-lg text-[#F1F5F9] font-bold focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
                      style={{ borderRadius: '8px', fontSize: '12px', height: '32px', lineHeight: '32px' }}
                    />
                    <button
                      type="button"
                      className="add-medication-btn px-3 py-1.5 bg-[#0D9488] text-white font-bold rounded-lg hover:bg-[#0F766E] transition-colors shadow-md flex items-center justify-center"
                      style={{ borderRadius: '8px', fontSize: '12px', height: '32px' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (medicationSearchInput.trim()) {
                          const newItem: PrescriptionItem = {
                            id: Date.now().toString(),
                            medicine: medicationSearchInput.trim(),
                            dosage: dosage || 'As prescribed',
                            frequency: frequency || 'As needed',
                          }
                          setPrescriptionList([...prescriptionList, newItem])
                          // Clear input only after successful addition
                          setMedicationSearchInput('')
                          setDosage('')
                          setFrequency('')
                          setMedicationPrice(null)
                          setMedicationManualPrice('')
                          // Refocus search input
                          setTimeout(() => {
                            medicationSearchInputRef.current?.focus()
                          }, 50)
                        }
                      }}
                      onMouseDown={(e) => {
                        // Prevent blur event when clicking add button
                        e.preventDefault()
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          
          {/* Pending Lab Requests - Editable before completion */}
          {labRequests.filter((req) => req.patientId === patient?.id && req.status === 'Pending').length > 0 && (
            <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-1 flex-shrink-0 shadow-sm mt-0.5">
              <h4 className="text-[10px] font-bold text-[#94A3B8] mb-0.5">Pending Tests (Can be edited/deleted)</h4>
              <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                {labRequests
                  .filter((req) => req.patientId === patient?.id && req.status === 'Pending')
                  .map((req) => (
                    <div key={req.id} className="p-1 bg-[#0F172A] rounded-lg group hover:bg-[#1E293B] transition-colors flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F1F5F9] font-bold text-[10px] truncate">{req.testType}</p>
                        <p className="text-[9px] font-medium text-slate-400">{req.category}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete ${req.testType}? This will also remove the charge from the invoice.`)) {
                            return
                          }
                          
                          // Remove from invoice
                          const visitId = patient.visitId || generateVisitId()
                          const invoice = getInvoice(visitId)
                          if (invoice) {
                            // Find and remove the invoice item
                            const department = req.department === 'Radiology' ? 'Radiology' : 'Laboratory'
                            const description = `${department === 'Radiology' ? 'Radiology' : 'Lab'} Fee: ${req.testType}`
                            
                            // Remove from database invoice
                            try {
                              await fetch('/api/billing/invoice/remove-item', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  visitId,
                                  description,
                                }),
                              })
                            } catch (err) {
                              console.error('Error removing item from invoice:', err)
                            }
                          }
                          
                          // Delete the lab request
                          deleteLabRequest(req.id)
                        }}
                        className="ml-2 p-0.5 text-rose-400 hover:bg-rose-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete test"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Current Invoice Total - Fixed at Bottom - ALWAYS VISIBLE */}
          <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-1 flex-shrink-0 shadow-sm mt-0.5">
            <p className="text-[9px] font-bold text-[#94A3B8] mb-0">Current Total</p>
            <p className="text-sm font-bold text-[#3B82F6]">
              {invoiceTotal.toLocaleString('en-US')} IQD
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-[#161F32] border-t border-slate-700 p-3 flex-shrink-0 shadow-sm">
        {prescriptionList.length > 0 ? (
          <button
            onClick={handleSendToPharmacy}
            disabled={isSendingToPharmacy || pharmacySuccess}
            className="w-full py-3 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#0D9488]/50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
            style={{ borderRadius: '8px', fontSize: '18px' }}
          >
            {isSendingToPharmacy ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Sending...</span>
              </>
            ) : pharmacySuccess ? (
              <>
                <CheckCircle size={20} />
                <span>Sent to Pharmacy</span>
              </>
            ) : (
              <>
                <Pill size={20} />
                <span>Send to Pharmacy</span>
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-3 text-center text-sm text-slate-400">
            Add medications to send prescription to pharmacy
          </div>
        )}
      </div>
    </div>
  )
}

