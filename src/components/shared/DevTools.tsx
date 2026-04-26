'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, USER_ROLES, UserRole, getRoleColor } from '@/contexts/AuthContext'
import { Shield, ChevronDown } from 'lucide-react'

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  INTAKE_NURSE: 'Intake Nurse',
  ER_INTAKE_NURSE: 'ER Vitals Station',
  ER_NURSE: 'ER Nurse',
  SECRETARY: 'Secretary',
  PHARMACIST: 'Pharmacist',
  ACCOUNTANT: 'Accountant',
  SECURITY: 'Security',
  LAB_TECH: 'Lab Technician',
  RADIOLOGY_TECH: 'Radiology Tech',
}

const ROLE_REDIRECT: Partial<Record<UserRole, string>> = {
  ADMIN: '/admin',
  DOCTOR: '/doctor/queue',
  RECEPTIONIST: '/reception',
  LAB_TECH: '/diagnostics',
  PHARMACIST: '/pharmacy/dispense',
  ACCOUNTANT: '/accountant?view=all',
  INTAKE_NURSE: '/intake',
  ER_INTAKE_NURSE: '/er/vitals-station',
  ER_NURSE: '/er/mobile-tasks',
  SECRETARY: '/doctor/queue',
  SECURITY: '/gatekeeper',
  RADIOLOGY_TECH: '/radiology',
}

const ROLE_PROFILE: Partial<Record<UserRole, { name: string; title: string }>> = {
  ADMIN: { name: 'Admin User', title: 'System Administrator' },
  DOCTOR: { name: 'Dr. Sarah Smith', title: 'Head Surgeon' },
  RECEPTIONIST: { name: 'Jane Doe', title: 'Reception Staff' },
  LAB_TECH: { name: 'Robert Johnson', title: 'Senior Lab Technician' },
  PHARMACIST: { name: 'Emily Williams', title: 'Senior Pharmacist' },
  INTAKE_NURSE: { name: 'Nurse Intake', title: 'Intake Nurse' },
  ER_INTAKE_NURSE: { name: 'ER Intake', title: 'ER Vitals Station' },
  ER_NURSE: { name: 'Nurse ER', title: 'ER Nurse' },
  SECRETARY: { name: 'Secretary', title: 'Secretary' },
  ACCOUNTANT: { name: 'Accountant', title: 'Finance' },
  SECURITY: { name: 'Security', title: 'Security' },
  RADIOLOGY_TECH: { name: 'Rad Tech', title: 'Radiology' },
}

export default function DevTools() {
  const { user, login } = useAuth()
  const router = useRouter()
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  if (!user) return null

  const handleRoleSwitch = (newRole: UserRole) => {
    const data = ROLE_PROFILE[newRole] ?? {
      name: `${newRole} User`,
      title: 'Staff',
    }
    login({
      id: newRole.toLowerCase(),
      name: data.name,
      email: `${newRole.toLowerCase()}@zionmed.com`,
      role: newRole,
      roleTitle: data.title,
    })

    router.push(ROLE_REDIRECT[newRole] ?? '/')
    setShowRoleSwitcher(false)
  }

  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return null
  }

  return (
    <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
      <div className={`mb-3 px-3 py-2 rounded-lg border text-center ${getRoleColor(user.role)}`}>
        <div className="flex items-center justify-center gap-2">
          <Shield size={12} />
          <span className="text-xs font-semibold">Current Role: {user.role}</span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-secondary group-hover:text-primary">
              Switch Role (Dev)
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-secondary transition-transform duration-200 ${showRoleSwitcher ? 'rotate-180' : ''}`}
          />
        </button>

        {showRoleSwitcher && (
          <div className="absolute bottom-full left-0 right-0 mb-2 glass border border-slate-800/50 rounded-lg overflow-hidden z-50 shadow-xl max-h-64 overflow-y-auto">
            {Object.values(USER_ROLES).map((role) => {
              const isActive = user.role === role
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800/50 transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <span>{ROLE_LABELS[role] ?? role}</span>
                  {isActive && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
