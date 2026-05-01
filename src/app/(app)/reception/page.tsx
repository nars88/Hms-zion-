'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import StatsCards from '@/components/reception/StatsCards'
import QuickActions from '@/components/reception/QuickActions'
import PatientSearch from '@/components/reception/PatientSearch'
import PatientRegistrationModal from '@/components/reception/PatientRegistrationModal'
import PatientQueue from '@/components/reception/PatientQueue'
import BackButton from '@/components/BackButton'

import PatientBadgeQRModal from '@/components/reception/PatientBadgeQRModal'

export default function ReceptionDashboard() {
  const router = useRouter()
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showWaitingListModal, setShowWaitingListModal] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  const badgeMeta = useMemo(() => {
    if (!selectedPatient) return null
    const patientId = selectedPatient.id || selectedPatient.patientId
    const name =
      selectedPatient.name ||
      `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim()
    const visitId = selectedPatient.visitId || selectedPatient.currentVisitId || null
    if (!patientId) return null
    return { patientId: String(patientId), patientName: name || 'Patient', visitId: visitId ? String(visitId) : null }
  }, [selectedPatient])

  return (
    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content - Fixed Height, No Scroll */}
        <main className="flex-1 overflow-hidden p-6 pb-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col gap-3">
            {/* Patient Search - Full Width at Top */}
            <div className="flex-shrink-0">
              <div className="flex items-stretch gap-3">
                <div className="min-w-0 flex-1">
                  <PatientSearch
                    onPatientSelected={(p) => setSelectedPatient(p)}
                    onPatientCleared={() => setSelectedPatient(null)}
                  />
                </div>
                <button
                  type="button"
                  disabled={!badgeMeta}
                  onClick={() => setShowBadgeModal(true)}
                  className={`h-[56px] shrink-0 rounded-xl border bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] px-5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    badgeMeta
                      ? 'border-cyan-500/30 shadow-[0_0_24px_rgba(14,165,233,0.22)] hover:shadow-[0_0_32px_rgba(14,165,233,0.34)]'
                      : 'border-slate-700/50 shadow-none'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <QrCode className="h-5 w-5" aria-hidden />
                    Print Patient QR
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex-shrink-0">
              <QuickActions
                onNewPatient={() => setShowRegistrationModal(true)}
                onERQuick={() => router.push('/reception/er-quick')}
              />
            </div>

            {/* Stats Cards - 4 Cards in One Row - Final Element */}
            <div className="flex-shrink-0">
              <StatsCards onWaitingPatientsClick={() => setShowWaitingListModal(true)} />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {showRegistrationModal && (
        <PatientRegistrationModal 
          onClose={() => setShowRegistrationModal(false)} 
        />
      )}
      {showWaitingListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWaitingListModal(false)}>
          <div className="glass rounded-xl border border-slate-800/50 w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary">Waiting Patients Queue</h2>
                <p className="text-xs text-secondary mt-1">All patients currently waiting for consultation</p>
              </div>
              <button
                onClick={() => setShowWaitingListModal(false)}
                className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PatientQueue />
            </div>
          </div>
        </div>
      )}
      {showBadgeModal && badgeMeta ? (
        <PatientBadgeQRModal
          patientId={badgeMeta.patientId}
          patientName={badgeMeta.patientName}
          visitId={badgeMeta.visitId}
          initialPayload={selectedPatient?.qrPayload ?? null}
          caseType={selectedPatient?.caseType === 'ER' ? 'ER' : 'CLINIC'}
          onClose={() => setShowBadgeModal(false)}
        />
      ) : null}
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

