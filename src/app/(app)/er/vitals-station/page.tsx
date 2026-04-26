'use client'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { ERVitalsStationClient } from '@/components/emergency/ERVitalsStationClient'
import { USER_ROLES } from '@/contexts/AuthContext'

const BASE = '/er/vitals-station'

/** Dedicated ER vitals-room terminal — ER_INTAKE_NURSE only (plus Admin). */
export default function ERVitalsStationPage() {
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ER_INTAKE_NURSE, USER_ROLES.ADMIN]} redirectTo="/login">
      <ERVitalsStationClient basePath={BASE} />
    </ProtectedRoute>
  )
}
