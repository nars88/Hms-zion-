'use client'

import { useState, useEffect } from 'react'
import { Search, Clock, User, DollarSign } from 'lucide-react'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useLabResults } from '@/contexts/LabResultsContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'

interface PaymentPatient {
  id: string
  visitId: string
  patientId: string
  patientName: string
  visitDate: string
  diagnosis: string
  totalAmount: number
  status: 'READY_FOR_BILLING' | 'AWAITING_BILLING' | 'Billing' | 'Pending Payment'
}

interface LivePaymentFeedProps {
  selectedPatientId?: string
  onSelectPatient: (patient: PaymentPatient) => void
}

export default function LivePaymentFeed({ selectedPatientId, onSelectPatient }: LivePaymentFeedProps) {
  const { waitingPatients } = useWaitingList()
  const { getVisitData } = useVisitData()
  const { getLabResultsForPatient } = useLabResults()
  const { getInvoice } = useCentralizedBilling()
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate total amount for a patient based on invoice (source of truth)
  const calculateTotalAmount = (patientId: string, visitId?: string): number => {
    // Try to get invoice using Visit ID first (this is the source of truth)
    const invoiceVisitId = visitId || `VISIT-${patientId}`
    const invoice = getInvoice(invoiceVisitId)
    
    if (invoice) {
      console.log(`[LivePaymentFeed] Invoice found for Visit ID: ${invoiceVisitId}, Total: ${invoice.total} IQD`)
      return invoice.total
    }
    
    // Fallback to old calculation if invoice not found
    const visitData = getVisitData(patientId)
    if (!visitData) return 0

    // Base consultation fee
    const consultationFee = 50000 // IQD

    // Lab test fees (25,000 IQD per test)
    const labTestFee = (visitData.labTests?.length || 0) * 25000

    // Mock pharmacy fee (in production, calculate from prescription)
    const pharmacyFee = visitData.prescription ? 15000 : 0

    return consultationFee + labTestFee + pharmacyFee
  }


  // Get current payment patients from waiting list
  const currentPaymentPatients: PaymentPatient[] = waitingPatients
    .filter((p) => p.status === 'Pending Payment')
    .map((p) => {
      const visitData = getVisitData(p.id)
      const patientName = `${p.firstName} ${p.lastName}`
      
      // Use Visit ID from patient if available, otherwise generate consistent pattern
      const visitId = p.visitId || `VISIT-${p.id}`
      
      return {
        id: p.id,
        visitId, // Use consistent Visit ID
        patientId: p.id,
        patientName,
        visitDate: visitData?.completedAt || p.registeredAt,
        diagnosis: visitData?.diagnosis || p.chiefComplaint || 'No diagnosis',
        totalAmount: calculateTotalAmount(p.id, visitId), // Pass Visit ID to calculation
        status: 'Pending Payment' as const,
      }
    })

  // Filter patients based on search query
  const filteredPatients = currentPaymentPatients.filter((patient) => {
    const query = searchQuery.toLowerCase()
    return (
      patient.patientName.toLowerCase().includes(query) ||
      patient.patientId.toLowerCase().includes(query) ||
      patient.visitId.toLowerCase().includes(query)
    )
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header - Simple QUEUE Label */}
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <h2 className="text-xs font-medium text-secondary uppercase tracking-widest">QUEUE</h2>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name or ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-sm text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* Patients List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-sm text-secondary">
              {searchQuery ? 'No patients found' : 'No patients ready for payment'}
            </p>
            {searchQuery && (
              <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = selectedPatientId === patient.id
            const visitDate = new Date(patient.visitDate)
            const timeAgo = Math.floor((Date.now() - visitDate.getTime()) / 60000) // minutes ago

            return (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <User size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? 'text-blue-400' : 'text-primary'}`}>
                        {patient.patientName}
                      </p>
                      <p className="text-xs text-secondary">{patient.visitId}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 font-medium">
                    {patient.totalAmount.toLocaleString('en-US')} IQD
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Clock size={12} />
                    <span>{timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}</span>
                  </div>
                  <p className="text-xs text-secondary line-clamp-1">{patient.diagnosis}</p>
                  <p className="text-xs text-slate-600">ID: {patient.patientId}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

