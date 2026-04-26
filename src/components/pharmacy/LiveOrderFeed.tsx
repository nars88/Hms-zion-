'use client'

import { Clock, AlertCircle } from 'lucide-react'

export interface PharmacyOrder {
  id: string
  patientName: string
  patientId: string
  visitId: string
  status: 'READY_FOR_PHARMACY'
  diagnosis: string
  prescription: Array<{
    medication: string
    dosage: string
    frequency: string
    duration: string
    notes?: string
  }>
  diagnosticResults?: {
    lab?: Array<{ testName: string; value: string; status: string }>
    ecg?: { heartRate: number; rhythm: string; status: string }
    imaging?: Array<{ studyType: string; findings: string; status: string }>
  }
  allergies?: string[]
  createdAt: string
  waitTime: string
}

interface LiveOrderFeedProps {
  orders: PharmacyOrder[]
  onSelectOrder: (order: PharmacyOrder) => void
  selectedOrderId?: string
}

export default function LiveOrderFeed({ orders, onSelectOrder, selectedOrderId }: LiveOrderFeedProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <h2 className="text-lg font-semibold text-primary mb-1">Live Order Feed</h2>
        <p className="text-xs text-secondary">{orders.length} orders pending</p>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {orders.map((order) => {
            const hasAllergies = order.allergies && order.allergies.length > 0
            return (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedOrderId === order.id
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'glass border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{order.patientName}</h3>
                    <p className="text-xs text-secondary mt-0.5">{order.patientId}</p>
                  </div>
                  {hasAllergies && (
                    <div className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs flex items-center gap-1">
                      <AlertCircle size={10} />
                      Allergies
                    </div>
                  )}
                </div>

                <p className="text-xs text-secondary mb-2 line-clamp-1">{order.diagnosis}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/30">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Clock size={12} />
                    <span>{order.waitTime}</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-medium">
                    {order.prescription.length} medication{order.prescription.length > 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

