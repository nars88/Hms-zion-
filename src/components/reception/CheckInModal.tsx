'use client'

import { useState } from 'react'

interface CheckInModalProps {
  onClose: () => void
}

export default function CheckInModal({ onClose }: CheckInModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    priority: 'Medium',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle check-in submission here
    console.log('Check-in submitted:', { selectedPatient, formData })
    onClose()
  }

  // Mock patient search results
  const searchResults = searchQuery
    ? [
        { id: '1', name: 'John Doe', phone: '+1234567890' },
        { id: '2', name: 'Jane Smith', phone: '+0987654321' },
      ]
    : []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl border border-slate-800/50 w-full max-w-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Patient Check-In</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-secondary mb-2">
              Search Patient *
            </label>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />

            {searchQuery && searchResults.length > 0 && (
              <div className="mt-2 space-y-2">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient)
                      setSearchQuery(patient.name)
                    }}
                    className={`p-3 glass rounded-lg cursor-pointer hover:bg-slate-800/30 transition-colors border ${
                      selectedPatient?.id === patient.id 
                        ? 'border-cyan-500/50 bg-cyan-500/10' 
                        : 'border-slate-800/30'
                    }`}
                  >
                    <p className="text-sm text-primary font-medium">{patient.name}</p>
                    <p className="text-xs text-secondary mt-0.5">{patient.phone}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedPatient && (
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-sm text-cyan-400 font-medium">Selected: {selectedPatient.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-2">
              Chief Complaint *
            </label>
            <textarea
              name="chiefComplaint"
              required
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              rows={3}
              placeholder="Brief description of the patient's complaint..."
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-2">
              Priority Level *
            </label>
            <select
              name="priority"
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
              className="px-5 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPatient}
              className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check In Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

