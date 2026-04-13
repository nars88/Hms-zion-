'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import ZionMedLogo from '@/components/ZionMedLogo'
import { usePharmacy } from '@/contexts/PharmacyContext'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, Search, Calendar, User, Pill } from 'lucide-react'

export default function DoctorPrescriptionsPage() {
  const { prescriptions, getPrescriptionsByPatientId } = usePharmacy()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)

  // Filter prescriptions created by current doctor
  const doctorPrescriptions = prescriptions.filter(
    (pres) => pres.doctorId === user?.id
  )

  // Filter by search query
  const filteredPrescriptions = doctorPrescriptions.filter((pres) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      pres.patientName.toLowerCase().includes(query) ||
      pres.visitId.toLowerCase().includes(query) ||
      pres.items.some((item: any) =>
        item.medicineName.toLowerCase().includes(query)
      )
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'Dispensed_Internal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'Dispensed_External':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Search Bar */}
              <div className="glass rounded-xl border border-slate-800/50 p-4">
                <div className="flex items-center gap-3">
                  <Search className="text-secondary" size={20} />
                  <input
                    type="text"
                    placeholder="Search by patient name, visit ID, or medication..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-primary placeholder:text-secondary"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass rounded-xl border border-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary mb-1">Total Prescriptions</p>
                      <p className="text-2xl font-semibold text-primary">{doctorPrescriptions.length}</p>
                    </div>
                    <FileText className="text-cyan-400" size={24} />
                  </div>
                </div>
                <div className="glass rounded-xl border border-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary mb-1">Pending</p>
                      <p className="text-2xl font-semibold text-amber-400">
                        {doctorPrescriptions.filter((p) => p.status === 'Pending').length}
                      </p>
                    </div>
                    <Calendar className="text-amber-400" size={24} />
                  </div>
                </div>
                <div className="glass rounded-xl border border-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary mb-1">Dispensed</p>
                      <p className="text-2xl font-semibold text-emerald-400">
                        {doctorPrescriptions.filter((p) => p.status.includes('Dispensed')).length}
                      </p>
                    </div>
                    <Pill className="text-emerald-400" size={24} />
                  </div>
                </div>
              </div>

              {/* Prescriptions List */}
              <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
                <div className="p-4 border-b border-slate-800/50">
                  <h2 className="text-lg font-semibold text-primary">My Prescriptions</h2>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {filteredPrescriptions.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="mx-auto mb-4 text-slate-600" size={48} />
                      <p className="text-secondary">No prescriptions found</p>
                      {searchQuery && (
                        <p className="text-sm text-slate-600 mt-2">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredPrescriptions.map((prescription) => (
                      <div
                        key={prescription.id}
                        className="p-4 hover:bg-slate-800/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedPrescription(prescription)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="text-secondary" size={18} />
                              <h3 className="text-base font-semibold text-primary">
                                {prescription.patientName}
                              </h3>
                              <span className="text-xs text-secondary font-mono">
                                {prescription.visitId}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-secondary ml-7">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(prescription.createdAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Pill size={14} />
                                {prescription.items.length} medication(s)
                              </span>
                            </div>
                            <div className="mt-2 ml-7 flex flex-wrap gap-2">
                              {prescription.items.slice(0, 3).map((item: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-slate-800/50 rounded text-secondary"
                                >
                                  {item.medicineName}
                                </span>
                              ))}
                              {prescription.items.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-slate-800/50 rounded text-secondary">
                                  +{prescription.items.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(
                                prescription.status
                              )}`}
                            >
                              {prescription.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

