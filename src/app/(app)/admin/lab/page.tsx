'use client'

import { useState, useEffect } from 'react'
import { BedDouble } from 'lucide-react'

const TOTAL_BEDS = 12
type DiagnosticDept = 'Lab'

interface LabRequest {
  at: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
}

interface BedRow {
  bedNumber: number
  visitId: string | null
  patientId: string | null
  patientName: string | null
  patientAge?: number | null
  triageLevel?: number | null
  visitStatus?: string
  labRequests: LabRequest[]
}

export default function AdminLabPage() {
  const [beds, setBeds] = useState<BedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBed, setSelectedBed] = useState<BedRow | null>(null)
  const [showBedModal, setShowBedModal] = useState(false)

  const fetchBeds = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/lab/er-beds?department=${'Lab' as DiagnosticDept}`)
      if (res.ok) {
        const data = await res.json()
        const next = Array.isArray(data) ? data : []
        // Silent background refresh: keep grid mounted, only swap data.
        setBeds(next)
      }
    } catch (_) {
      if (!silent) setBeds([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchBeds(false)
    const interval = setInterval(() => fetchBeds(true), 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => i + 1).map((num) => {
              const bed = beds.find((b) => b.bedNumber === num)
              const isSelected = selectedBed?.bedNumber === num
              return (
                <button
                  key={num}
                  onClick={() => {
                    setSelectedBed(
                      bed || {
                        bedNumber: num,
                        visitId: null,
                        patientId: null,
                        patientName: null,
                        patientAge: null,
                        triageLevel: null,
                        visitStatus: '',
                        labRequests: [],
                      }
                    )
                    setShowBedModal(true)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <BedDouble size={20} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">Bed {num}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 truncate">
                    {bed?.patientName || '—'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {showBedModal && selectedBed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowBedModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700/70 bg-slate-900/95 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Bed {selectedBed.bedNumber} Details</h3>
              <button
                type="button"
                onClick={() => setShowBedModal(false)}
                className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Patient Name</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{selectedBed.patientName || '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Age</p>
                <p className="mt-1 text-sm font-medium text-slate-100">
                  {typeof selectedBed.patientAge === 'number' ? selectedBed.patientAge : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 sm:col-span-2">
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{selectedBed.visitStatus || '—'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="text-xs text-slate-400 mb-2">Lab Requests</p>
              {selectedBed.labRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No lab requests for this bed.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {selectedBed.labRequests.map((req) => (
                    <div key={`${req.at}-${req.testType}`} className="rounded border border-slate-700/60 bg-slate-900/40 p-2.5">
                      <p className="text-sm text-slate-100">{req.testType}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {req.status} • {new Date(req.at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
