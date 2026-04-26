'use client'

import { useState } from 'react'
import StatsCards from '@/components/reception/StatsCards'
import QuickActions from '@/components/reception/QuickActions'
import PatientSearch from '@/components/reception/PatientSearch'
import PatientRegistrationModal from '@/components/reception/PatientRegistrationModal'
import ERRegistrationModal from '@/components/reception/ERRegistrationModal'
import CheckInModal from '@/components/reception/CheckInModal'
import PatientQueue from '@/components/reception/PatientQueue'
import AppointmentBookingModal from '@/components/reception/AppointmentBookingModal'
import VisitQRModal from '@/components/reception/VisitQRModal'

export default function AdminReceptionPage() {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showERRegistrationModal, setShowERRegistrationModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showWaitingListModal, setShowWaitingListModal] = useState(false)
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

  // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
  const handleRegistrationSuccess = (patientId: string, patientName: string) => {
    setShowRegistrationModal(false)
    setWorkflowPatient({ patientId, patientName })
    setWorkflowMessage('Success! Redirecting to Doctor Selection...')
    window.setTimeout(() => {
      setWorkflowMessage(null)
      setShowAppointmentModal(true)
    }, 500)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden p-6 pb-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col gap-3">
          <div className="flex-shrink-0">
            <PatientSearch />
          </div>
          <div className="flex-shrink-0">
            <QuickActions
              onNewPatient={() => setShowRegistrationModal(true)}
              onERRegistration={() => setShowERRegistrationModal(true)}
            />
          </div>
          <div className="flex-shrink-0">
            <StatsCards onWaitingPatientsClick={() => setShowWaitingListModal(true)} />
          </div>
        </div>
      </main>
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
          onRegister={() => setShowERRegistrationModal(false)}
        />
      )}
      {showCheckInModal && (
        <CheckInModal onClose={() => setShowCheckInModal(false)} />
      )}
      {showWaitingListModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowWaitingListModal(false)}
        >
          <div
            className="glass rounded-xl border border-slate-800/50 w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
  )
}
