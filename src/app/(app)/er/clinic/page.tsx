'use client'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ERRoleSidebar from '@/components/emergency/ERRoleSidebar'
import { ERDoctorClinicShell } from '@/components/emergency/ERDoctorClinicView'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'

export default function ERClinicPage() {
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.DOCTOR, USER_ROLES.ADMIN]} redirectTo="/login">
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <ERRoleSidebar />
        <ERDoctorClinicShell />
        <BackButton />
      </div>
    </ProtectedRoute>
  )
}
