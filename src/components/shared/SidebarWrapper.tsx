'use client'

import { useAuth, USER_ROLES } from '@/contexts/AuthContext'
import AdminSidebar from './AdminSidebar'
import StaffSidebar from './StaffSidebar'

// COMPONENT ISOLATION: Switch based on user role
export default function SidebarWrapper() {
  const { user } = useAuth()

  // CRITICAL: Hard separation - Admin gets AdminSidebar, everyone else gets StaffSidebar
  if (!user) {
    return null
  }

  if (user.role === USER_ROLES.ADMIN) {
    return <AdminSidebar />
  }

  return <StaffSidebar />
}

