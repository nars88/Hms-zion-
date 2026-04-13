'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES, useAuth } from '@/contexts/AuthContext'
import { CheckCircle, XCircle, Search, Scan } from 'lucide-react'

interface QRCheckResult {
  patientId: string
  patientName: string
  visitId: string
  qrStatus: 'LOCKED' | 'CLEARED'
  paymentStatus: string
  total: number
}

export default function SecurityGuardView() {
  const { user } = useAuth()
  const [patientId, setPatientId] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<QRCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId.trim()) return

    try {
      setIsChecking(true)
      setError(null)
      setResult(null)

      const res = await fetch(`/api/security/check/${patientId.trim()}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to check patient status')
      }

      const data: QRCheckResult = await res.json()
      setResult(data)
    } catch (err: any) {
      console.error('❌ Failed to check patient:', err)
      setError(err?.message || 'Patient not found or error occurred')
      setResult(null)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <ProtectedRoute
      allowedRoles={[USER_ROLES.SECURITY, USER_ROLES.ADMIN]}
      redirectTo="/"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Security Check</h1>
            <p className="text-sm text-slate-400">
              Scan or enter Patient ID to verify exit clearance
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleCheck} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  placeholder="Enter Patient ID or Scan QR Code"
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/70 border-2 border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-lg font-medium"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isChecking || !patientId.trim()}
                className="px-8 py-4 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 active:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Scan size={20} />
                    <span>Check</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500/50 rounded-xl">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-300 font-semibold">Error</p>
                  <p className="text-red-200 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div
              className={`p-8 rounded-2xl border-4 shadow-2xl transition-all ${
                result.qrStatus === 'CLEARED'
                  ? 'bg-emerald-500/10 border-emerald-500/70 shadow-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/70 shadow-red-500/20'
              }`}
            >
              {/* Large Status Icon */}
              <div className="text-center mb-6">
                {result.qrStatus === 'CLEARED' ? (
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-500/50 mb-4">
                    <CheckCircle className="h-20 w-20 text-emerald-400" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/50 mb-4">
                    <XCircle className="h-20 w-20 text-red-400" />
                  </div>
                )}
                <h2
                  className={`text-4xl font-bold mb-2 ${
                    result.qrStatus === 'CLEARED'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {result.qrStatus === 'CLEARED' ? 'CLEARED FOR EXIT' : 'EXIT BLOCKED'}
                </h2>
                <p
                  className={`text-lg font-medium ${
                    result.qrStatus === 'CLEARED'
                      ? 'text-emerald-300'
                      : 'text-red-300'
                  }`}
                >
                  {result.qrStatus === 'CLEARED'
                    ? 'Patient has paid. Gate may open.'
                    : 'Payment pending. Do not allow exit.'}
                </p>
              </div>

              {/* Patient Details */}
              <div className="bg-slate-900/50 rounded-xl p-6 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Patient Name</p>
                  <p className="text-lg font-semibold text-white">
                    {result.patientName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Patient ID</p>
                    <p className="text-sm font-mono text-slate-200">
                      {result.patientId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Visit ID</p>
                    <p className="text-sm font-mono text-slate-200">
                      {result.visitId}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/50">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Payment Status</p>
                    <p
                      className={`text-sm font-semibold ${
                        result.paymentStatus === 'Paid'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {result.paymentStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Invoice Total</p>
                    <p className="text-sm font-semibold text-white">
                      {Number(result.total).toLocaleString()} IQD
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setResult(null)
                    setPatientId('')
                    setError(null)
                  }}
                  className="flex-1 px-6 py-3 bg-slate-800/70 text-slate-200 rounded-xl font-semibold hover:bg-slate-700/70 transition-colors"
                >
                  Check Another
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!result && !error && (
            <div className="text-center mt-8">
              <p className="text-sm text-slate-500">
                Enter a Patient ID or scan their QR code to verify exit clearance
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

