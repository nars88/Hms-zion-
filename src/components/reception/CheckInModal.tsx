'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

interface CheckInModalProps {
  onClose: () => void
}

type PatientHit = {
  id: string
  firstName: string
  lastName: string
  phone: string
  gender: string
}

async function searchPatients(q: string): Promise<PatientHit[]> {
  const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
  const data = (await res.json().catch(() => ({}))) as { patients?: PatientHit[] }
  if (!res.ok || !Array.isArray(data.patients)) return []
  return data.patients
}

export default function CheckInModal({ onClose }: CheckInModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<PatientHit[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null)
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    priority: 'Medium',
  })
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      ;(async () => {
        try {
          setSearching(true)
          setSearchError(null)
          const rows = await searchPatients(q)
          if (!cancelled) setSearchResults(rows)
        } catch {
          if (!cancelled) {
            setSearchResults([])
            setSearchError('Search failed')
          }
        } finally {
          if (!cancelled) setSearching(false)
        }
      })()
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [searchQuery])

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error('Select a patient')
      const fullName = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim()
      const gender =
        selectedPatient.gender === 'Female' || selectedPatient.gender === 'Male'
          ? selectedPatient.gender
          : 'Other'
      const res = await fetch('/api/reception/register-visit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientType: 'CLINIC',
          fullName,
          phone: selectedPatient.phone,
          gender,
          chiefComplaint: formData.chiefComplaint.trim() || 'Returning patient check-in',
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Check-in failed')
      return data
    },
    onSuccess: () => {
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return
    checkInMutation.mutate()
  }

  const optimisticBusy = checkInMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl border border-slate-800/50 w-full max-w-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Patient Check-In</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {optimisticBusy ? (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
              Registering visit — updating queue…
            </div>
          ) : null}
          {checkInMutation.isError ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {(checkInMutation.error as Error)?.message || 'Check-in failed'}
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-secondary mb-2">Search Patient *</label>
            <input
              type="text"
              placeholder="Name, phone, or ID (min 2 characters)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={optimisticBusy}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />
            {searching ? <p className="mt-1 text-[11px] text-slate-500">Searching…</p> : null}
            {searchError ? <p className="mt-1 text-[11px] text-rose-400">{searchError}</p> : null}

            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((patient) => {
                  const label = `${patient.firstName} ${patient.lastName}`.trim()
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      disabled={optimisticBusy}
                      onClick={() => {
                        setSelectedPatient(patient)
                        setSearchQuery(label)
                      }}
                      className={`w-full text-left p-3 glass rounded-lg border transition-colors ${
                        selectedPatient?.id === patient.id
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-slate-800/30 hover:bg-slate-800/30'
                      }`}
                    >
                      <p className="text-sm text-primary font-medium">{label}</p>
                      <p className="text-xs text-secondary mt-0.5">{patient.phone}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedPatient && (
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-sm text-cyan-400 font-medium">
                  Selected: {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-2">Chief Complaint *</label>
            <textarea
              name="chiefComplaint"
              required
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              disabled={optimisticBusy}
              rows={3}
              placeholder="Brief description of the patient's complaint..."
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-2">Priority Level *</label>
            <select
              name="priority"
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              disabled={optimisticBusy}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={optimisticBusy}
              className="px-5 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPatient || optimisticBusy}
              className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {optimisticBusy ? 'Check-in…' : 'Check In Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
