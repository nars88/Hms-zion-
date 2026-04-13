'use client'

import { useState } from 'react'
import { Unlock, Lock, AlertTriangle } from 'lucide-react'

interface SecurityOverrideProps {
  onOverrideComplete?: () => void
}

export default function SecurityOverride({ onOverrideComplete }: SecurityOverrideProps) {
  const [patientId, setPatientId] = useState('')
  const [visitId, setVisitId] = useState('')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId.trim() || !visitId.trim() || !reason.trim()) {
      setError('Please fill all fields including reason for override')
      return
    }

    try {
      setIsProcessing(true)
      setError(null)
      setMessage(null)

      const res = await fetch('/api/admin/security/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId.trim(),
          visitId: visitId.trim(),
          reason: reason.trim(),
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to perform manual override')
      }

      const data = await res.json()
      setMessage('✅ QR Status manually cleared. Audit log created.')
      setPatientId('')
      setVisitId('')
      setReason('')

      if (onOverrideComplete) {
        onOverrideComplete()
      }
    } catch (err: any) {
      console.error('❌ Manual override failed:', err)
      setError(err?.message || 'Failed to perform manual override')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-primary">
            Manual QR Override
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Emergency clearance for system outages or special cases
          </p>
        </div>
      </div>

      <form onSubmit={handleOverride} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Patient ID <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            placeholder="e.g. clx..."
            className="w-full rounded-lg bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Visit ID <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={visitId}
            onChange={e => setVisitId(e.target.value)}
            placeholder="e.g. clx..."
            className="w-full rounded-lg bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Reason for Override <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. System outage, emergency case, payment verified manually..."
            rows={3}
            className="w-full rounded-lg bg-slate-900/70 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
            <p className="text-xs text-emerald-400">{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full px-4 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              <span>Clear QR Status (Manual Override)</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-500 text-center">
          ⚠️ This action is logged and requires Admin privileges
        </p>
      </form>
    </div>
  )
}

