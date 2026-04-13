'use client'

import { useWaitingList } from '@/contexts/WaitingListContext'
import { usePatientRegistry } from '@/contexts/PatientRegistryContext'

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'Medium':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Low':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
  }
}

export default function PatientQueue() {
  const { waitingPatients } = useWaitingList()
  const { getPatientById } = usePatientRegistry()

  // Convert waiting patients to queue format, enriched with registry data
  const queuePatients = waitingPatients
    .filter(p => p.status === 'Waiting')
    .map((patient, index) => {
      // Try to get full patient data from registry
      const fullPatient = getPatientById(patient.id)
      
      return {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        visitId: patient.visitId,
        priority: patient.chiefComplaint === 'Emergency' ? 'High' : 'Medium',
        status: patient.status,
        checkInTime: new Date(patient.registeredAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        chiefComplaint: patient.chiefComplaint || 'New patient registration',
        // Additional data from registry if available
        bloodGroup: fullPatient?.bloodGroup || '',
        email: fullPatient?.email || '',
      }
    })

  const selectPatientForQr = (p: (typeof queuePatients)[number]) => {
    window.dispatchEvent(
      new CustomEvent('patientSelected', {
        detail: {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          name: p.name,
          phone: p.phone,
          age: p.age,
          gender: p.gender,
          visitId: p.visitId,
        },
      })
    )
  }
  return (
    <div className="glass rounded-xl border border-slate-800/50">
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Patient Queue</h2>
            <p className="text-xs text-secondary mt-1">Current waiting patients</p>
          </div>
          <button className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all text-sm font-medium">
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/30 border-b border-slate-800/50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Queue #
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Patient Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Chief Complaint
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Check-in Time
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {queuePatients.map((patient, index) => (
              <tr
                key={patient.id}
                className="hover:bg-slate-800/20 transition-colors cursor-pointer"
                onClick={() => selectPatientForQr(patient)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectPatientForQr(patient)
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-primary font-medium">#{index + 1}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-primary font-medium">{patient.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{patient.age} years</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                      patient.priority
                    )}`}
                  >
                    {patient.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">{patient.chiefComplaint}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{patient.checkInTime}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs font-medium hover:bg-cyan-500/15 transition-all">
                      Assign
                    </button>
                    <button className="px-3 py-1.5 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded text-xs font-medium hover:bg-slate-700/50 transition-all">
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {queuePatients.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-sm text-secondary">No patients in queue</p>
        </div>
      )}
    </div>
  )
}

