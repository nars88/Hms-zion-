'use client'

import { useState } from 'react'

interface PrescriptionToolProps {
  prescription: any[]
  onPrescriptionChange: (prescription: any[]) => void
}

export default function PrescriptionTool({ prescription, onPrescriptionChange }: PrescriptionToolProps) {
  const [medication, setMedication] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')

  const handleAddMedication = () => {
    if (medication.trim() && dosage.trim() && frequency.trim()) {
      const newMed = {
        id: Date.now().toString(),
        medication,
        dosage,
        frequency,
        duration: duration || 'As needed',
        notes: notes || '',
      }
      onPrescriptionChange([...prescription, newMed])
      // Reset form
      setMedication('')
      setDosage('')
      setFrequency('')
      setDuration('')
      setNotes('')
    }
  }

  const handleRemoveMedication = (id: string) => {
    onPrescriptionChange(prescription.filter((med) => med.id !== id))
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-5">
      <h3 className="text-sm font-semibold text-primary mb-4">Prescription</h3>

      {/* Add Medication Form */}
      <div className="mb-5 p-4 bg-slate-900/30 rounded-lg border border-slate-800/30">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Medication *</label>
            <input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g., Paracetamol"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">Dosage *</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500mg"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">Frequency *</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="e.g., Twice daily"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">Duration</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 5 days"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-secondary mb-1.5">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional instructions..."
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleAddMedication}
          disabled={!medication.trim() || !dosage.trim() || !frequency.trim()}
          className="w-full py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Medication
        </button>
      </div>

      {/* Prescription List */}
      {prescription.length > 0 ? (
        <div className="space-y-2">
          {prescription.map((med) => (
            <div
              key={med.id}
              className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/30 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary">{med.medication}</span>
                  <span className="text-xs text-secondary">•</span>
                  <span className="text-xs text-secondary">{med.dosage}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-secondary">
                  <span>{med.frequency}</span>
                  {med.duration && (
                    <>
                      <span>•</span>
                      <span>{med.duration}</span>
                    </>
                  )}
                </div>
                {med.notes && (
                  <p className="text-xs text-secondary mt-1 italic">{med.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveMedication(med.id)}
                className="ml-3 px-2 py-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500">No medications added yet</p>
        </div>
      )}
    </div>
  )
}

