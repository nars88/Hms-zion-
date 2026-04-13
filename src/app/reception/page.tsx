'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { QrCode } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import StatsCards from '@/components/reception/StatsCards'
import QuickActions from '@/components/reception/QuickActions'
import PatientSearch from '@/components/reception/PatientSearch'
import PatientRegistrationModal from '@/components/reception/PatientRegistrationModal'
import ERRegistrationModal from '@/components/reception/ERRegistrationModal'
import PatientQueue from '@/components/reception/PatientQueue'
import BackButton from '@/components/BackButton'

import AppointmentNotifications from '@/components/reception/AppointmentNotifications'
import PatientBadgeQRModal from '@/components/reception/PatientBadgeQRModal'
import AppointmentBookingModal from '@/components/reception/AppointmentBookingModal'
import VisitQRModal from '@/components/reception/VisitQRModal'
import { generateVisitId } from '@/lib/visitIdGenerator'

export default function ReceptionDashboard() {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showERRegistrationModal, setShowERRegistrationModal] = useState(false)
  const [showWaitingListModal, setShowWaitingListModal] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showVisitQRModal, setShowVisitQRModal] = useState(false)
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null)
  const [workflowPatient, setWorkflowPatient] = useState<{ patientId: string; patientName: string } | null>(null)
  const [visitQrData, setVisitQrData] = useState<{
    visitId: string
    patientId: string
    patientName: string
    doctorName: string
    department: string
    appointmentDate: string
    appointmentTime: string
    queueNumber: number
  } | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const { user } = useAuth()

  // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
  // Handle successful registration - redirect to appointment booking
  const handleRegistrationSuccess = (patientId: string, patientName: string) => {
    // Step 1: close registration + open doctor selection automatically
    setShowRegistrationModal(false)
    setWorkflowPatient({ patientId, patientName })
    setWorkflowMessage('Success! Redirecting to Doctor Selection...')
    window.setTimeout(() => {
      setWorkflowMessage(null)
      setShowAppointmentModal(true)
    }, 500)
  }

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
                onERRegistration={() => setShowERRegistrationModal(true)}
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
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
      {/* CORE WORKFLOW: REGISTER -> ASSIGN -> QR */}
      {showAppointmentModal && workflowPatient ? (
        <AppointmentBookingModal
          onClose={() => {
            setShowAppointmentModal(false)
            setWorkflowPatient(null)
          }}
          patientId={workflowPatient.patientId}
          patientName={workflowPatient.patientName}
          onBookingSuccess={(data) => {
            // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
            // Step 2: immediately open QR generation after doctor assignment
            setShowAppointmentModal(false)
            setVisitQrData(data)
            setShowVisitQRModal(true)
          }}
        />
      ) : null}
      {showVisitQRModal && visitQrData ? (
        <VisitQRModal
          visitId={visitQrData.visitId}
          patientName={visitQrData.patientName}
          patientId={visitQrData.patientId}
          doctorName={visitQrData.doctorName}
          department={visitQrData.department}
          appointmentDate={visitQrData.appointmentDate}
          appointmentTime={visitQrData.appointmentTime}
          queueNumber={visitQrData.queueNumber}
          onClose={() => setShowVisitQRModal(false)}
          onDone={() => {
            setShowVisitQRModal(false)
            setVisitQrData(null)
            setWorkflowPatient(null)
          }}
        />
      ) : null}
      {showERRegistrationModal && (
        <ERRegistrationModal
          onClose={() => setShowERRegistrationModal(false)}
          onRegister={({ fullName, age, phone }) => {
            const tmpVisitId = generateVisitId()
            const tmpPatientId = `ER-PENDING-${Date.now().toString(36).toUpperCase()}`

            // Bullet flow: close ER modal + open QR immediately (no spinner)
            setShowERRegistrationModal(false)
            setSelectedPatient({ id: tmpPatientId, name: fullName, visitId: tmpVisitId, caseType: 'ER' })
            setShowBadgeModal(true)

            // Backend work runs in the background and upgrades the QR to real ids
            fetch('/api/reception/er-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fullName, age, phone }),
            })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data?.error || 'ER registration failed')
                return data as { patient: { id: string; name?: string }; visit: { id: string } }
              })
              .then(({ patient, visit }) => {
                const patientId = patient.id
                const visitId = visit.id
                const patientName = patient.name || fullName
                setSelectedPatient({ id: patientId, name: patientName, visitId, caseType: 'ER' })

                // Keep non-blocking, never freezes UI
                fetch('/api/er/create-case', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ visitId, patientId, patientName }),
                }).catch(() => null)
              })
              .catch((err) => {
                console.error('ER registration background error:', err)
              })
          }}
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
          caseType={selectedPatient?.caseType === 'ER' ? 'ER' : 'CLINIC'}
          onClose={() => setShowBadgeModal(false)}
        />
      ) : null}
      {workflowMessage ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 px-5 py-3 text-sm text-emerald-300 shadow-xl">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {workflowMessage}
            </span>
          </div>
        </div>
      ) : null}
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

