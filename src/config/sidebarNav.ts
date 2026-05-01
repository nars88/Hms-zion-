/**
 * Single source of truth for sidebar navigation.
 * Admin: Dashboard, Departments, Reports, Settings.
 * Department mirroring: when Admin is in a department, show only that department's nav (same as staff).
 */

export const ADMIN_MASTER_HREF = '/admin'
export const ADMIN_DASHBOARD_HREF = '/admin'
export const ADMIN_DEPARTMENTS_HREF = '/admin/departments'
export const ADMIN_REPORTS_HREF = '/admin/reports'
export const ADMIN_SETTINGS_HREF = '/admin/settings'

export const ROLE_DASHBOARD_HREF: Record<string, string> = {
  ADMIN: ADMIN_DASHBOARD_HREF,
  ACCOUNTANT: '/accountant?view=all',
  DOCTOR: '/doctor/queue',
  PHARMACIST: '/pharmacy/dispense',
  RECEPTIONIST: '/er-reception',
  ER_INTAKE_NURSE: '/er/vitals-station',
  ER_NURSE: '/er/mobile-tasks',
  INTAKE_NURSE: '/intake',
  SECURITY: '/gatekeeper',
  SECRETARY: '/secretary/clinic-queue',
  LAB_TECH: '/lab',
  RADIOLOGY_TECH: '/radiology',
}

export function getDashboardHref(role: string): string {
  return ROLE_DASHBOARD_HREF[role] ?? ADMIN_DASHBOARD_HREF
}

/** Nav item for department/staff sidebars */
export interface DepartmentNavItem {
  href: string
  label: string
}

/**
 * Department path prefix -> nav items shown when staff (or admin mirroring) is in that department.
 * Only links that exist in the app; no placeholder or cross-department links.
 */
export const DEPARTMENT_NAV: Record<string, { roleLabel: string; items: DepartmentNavItem[] }> = {
  '/er-reception': {
    roleLabel: 'ER Reception',
    items: [{ href: '/er-reception', label: 'Register Patient' }],
  },
  '/reception': {
    roleLabel: 'Reception',
    items: [
      { href: '/reception', label: 'Dashboard' },
      { href: '/reception/er-quick', label: 'ER Quick Reception' },
    ],
  },
  '/pharmacy': {
    roleLabel: 'Pharmacy',
    items: [
      { href: '/pharmacy/dispense', label: 'Orders Queue' },
      { href: '/pharmacy/inventory', label: 'Inventory' },
    ],
  },
  '/lab': {
    roleLabel: 'Lab',
    items: [{ href: '/lab', label: 'Dashboard' }],
  },
  '/radiology': {
    roleLabel: 'Radiology',
    items: [{ href: '/radiology', label: 'Dashboard' }],
  },
  '/accountant': {
    roleLabel: 'Finance',
    items: [
      { href: '/accountant?view=all', label: 'Dashboard' },
      { href: '/accountant/archive', label: 'Archive' },
    ],
  },
  '/gatekeeper': {
    roleLabel: 'Gatekeeper',
    items: [{ href: '/gatekeeper', label: 'Dashboard' }],
  },
  '/intake': {
    roleLabel: 'Intake',
    items: [{ href: '/intake', label: 'Dashboard' }],
  },
  '/doctor': {
    roleLabel: 'Doctor',
    items: [{ href: '/doctor/queue', label: 'Queue' }],
  },
  '/secretary': {
    roleLabel: 'Secretary',
    items: [{ href: '/secretary/clinic-queue', label: 'Clinic Queue' }],
  },
  '/diagnostics': {
    roleLabel: 'Diagnostics',
    items: [{ href: '/diagnostics', label: 'Dashboard' }],
  },
  '/cashier': {
    roleLabel: 'Finance',
    items: [{ href: '/cashier', label: 'Dashboard' }],
  },
  '/billing': {
    roleLabel: 'Billing',
    items: [{ href: '/billing', label: 'Dashboard' }],
  },
  '/inventory': {
    roleLabel: 'Inventory',
    items: [{ href: '/inventory', label: 'Dashboard' }],
  },
}

export function getDepartmentForPath(pathname: string): keyof typeof DEPARTMENT_NAV | null {
  // Match longest key first so /pharmacy/inventory resolves to /pharmacy config
  const keys = Object.keys(DEPARTMENT_NAV) as (keyof typeof DEPARTMENT_NAV)[]
  const sorted = keys.sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname === key || pathname.startsWith(key + '/') || pathname.startsWith(key + '?')) {
      return key
    }
  }
  return null
}
