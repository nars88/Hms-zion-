'use client'

import { useState, useEffect } from 'react'
import { useLabResults } from '@/contexts/LabResultsContext'
import { Clock, User, FlaskConical, CheckCircle } from 'lucide-react'

interface LabRequestsListProps {
  selectedRequestId?: string
  onSelectRequest: (request: any) => void
}

export default function LabRequestsList({ selectedRequestId, onSelectRequest }: LabRequestsListProps) {
  const { labRequests } = useLabResults()
  const [pendingRequests, setPendingRequests] = useState<any[]>([])

  useEffect(() => {
    // Filter only pending requests
    const pending = labRequests.filter((req) => req.status === 'Pending')
    setPendingRequests(pending)
  }, [labRequests])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <h2 className="text-lg font-semibold text-primary mb-1">Lab Requests</h2>
        <p className="text-xs text-secondary">
          {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-sm text-secondary">No pending lab requests</p>
            <p className="text-xs text-slate-600 mt-1">All requests have been processed</p>
          </div>
        ) : (
          pendingRequests.map((request) => {
            const isSelected = selectedRequestId === request.id
            const requestedDate = new Date(request.requestedAt)
            const timeAgo = Math.floor((Date.now() - requestedDate.getTime()) / 60000) // minutes ago

            return (
              <button
                key={request.id}
                onClick={() => onSelectRequest(request)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <FlaskConical size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? 'text-amber-400' : 'text-primary'}`}>
                        {request.patientName}
                      </p>
                      <p className="text-xs text-secondary">{request.testType}</p>
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
                  <p className="text-xs text-slate-600">Visit ID: {request.visitId}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

