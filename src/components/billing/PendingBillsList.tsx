'use client'

import { useState, useEffect } from 'react'
import { Clock, User, DollarSign } from 'lucide-react'

interface PendingBill {
  id: string
  visitId: string
  patientId: string
  patientName: string
  visitDate: string
  diagnosis: string
  status: 'Billing' | 'AWAITING_BILLING'
}

interface PendingBillsListProps {
  selectedPatientId?: string
  onSelectPatient: (patient: PendingBill) => void
}

// Mock data - In production, fetch from database where visit.status = 'Billing' or 'AWAITING_BILLING'
const MOCK_PENDING_BILLS: PendingBill[] = [
  {
    id: 'p1',
    visitId: 'v1',
    patientId: 'pt1',
    patientName: 'John Doe',
    visitDate: new Date().toISOString(),
    diagnosis: 'Upper Respiratory Infection',
    status: 'Billing',
  },
  {
    id: 'p2',
    visitId: 'v2',
    patientId: 'pt2',
    patientName: 'Jane Smith',
    visitDate: new Date(Date.now() - 3600000).toISOString(),
    diagnosis: 'Hypertension Check-up',
    status: 'Billing',
  },
  {
    id: 'p3',
    visitId: 'v3',
    patientId: 'pt3',
    patientName: 'Robert Johnson',
    visitDate: new Date(Date.now() - 7200000).toISOString(),
    diagnosis: 'Diabetes Management',
    status: 'Billing',
  },
]

export default function PendingBillsList({ selectedPatientId, onSelectPatient }: PendingBillsListProps) {
  const [pendingBills, setPendingBills] = useState<PendingBill[]>(MOCK_PENDING_BILLS)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <h2 className="text-lg font-semibold text-primary mb-1">Pending Bills</h2>
        <p className="text-xs text-secondary">
          {pendingBills.length} patient{pendingBills.length !== 1 ? 's' : ''} awaiting payment
        </p>
      </div>

      {/* Bills List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingBills.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-sm text-secondary">No pending bills</p>
            <p className="text-xs text-slate-600 mt-1">All patients have been billed</p>
          </div>
        ) : (
          pendingBills.map((bill) => {
            const isSelected = selectedPatientId === bill.id
            const visitDate = new Date(bill.visitDate)
            const timeAgo = Math.floor((Date.now() - visitDate.getTime()) / 60000) // minutes ago

            return (
              <button
                key={bill.id}
                onClick={() => onSelectPatient(bill)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                    : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <User size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? 'text-cyan-400' : 'text-primary'}`}>
                        {bill.patientName}
                      </p>
                      <p className="text-xs text-secondary">{bill.visitId}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 font-medium">
                    Pending
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Clock size={12} />
                    <span>{timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}</span>
                  </div>
                  <p className="text-xs text-secondary line-clamp-1">{bill.diagnosis}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

