'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronDown,
  ClipboardList,
  Edit2,
  ExternalLink,
  FlaskConical,
  LayoutGrid,
  Pill,
  Plus,
  Radiation,
  Shield,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

type Department = {
  id: string
  name: string
  headEmployeeId: string
  headOfDepartmentName: string
  hodTag: string
  assignedEmployeeIds: string[]
  description: string
  color: string
  employeeCount: number
}

type Employee = {
  id: string
  name: string
  role?: string
  employeeTag?: string
  specialization?: string
  departmentName?: string
  searchableText?: string
}

type DepartmentForm = {
  name: string
  headEmployeeId: string
  description: string
  color: string
  assignedEmployeeIds: string[]
}

type DepartmentFilterKey = 'laboratory' | 'radiology' | 'sonar' | 'any'

const EMPTY_FORM: DepartmentForm = {
  name: '',
  headEmployeeId: '',
  description: '',
  color: '#7c3aed',
  assignedEmployeeIds: [],
}

function formatEmployeeTag(role?: string): string {
  const raw = String(role || '').trim()
  if (!raw) return 'Staff'
  const pretty = raw
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
  if (pretty.includes('Tech')) return `${pretty} Technician`
  return pretty
}

/** Keep low so employee assignments from Settings sync show up quickly when navigating here. */
const DEPARTMENTS_STALE_MS = 0
const EMPLOYEES_STALE_MS = 300000
let departmentsCache: { data: Department[]; ts: number } | null = null
let employeesCache: { data: Employee[]; ts: number } | null = null
const OPERATIONAL_DEPARTMENT_NAMES = new Set<string>([
  'accounting',
  'laboratory',
  'radiology',
  'pharmacy',
  'reception',
  'emergency',
  'intake',
  'security',
])

function normalizeDepartmentKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function isOperationalDepartment(name: string): boolean {
  const key = normalizeDepartmentKey(name)
  if (OPERATIONAL_DEPARTMENT_NAMES.has(key)) return true

  // Keep the operational grid stable even if naming format changes
  // (e.g. "Lab", "X Ray", "Emergency Unit", etc.).
  if (key.includes('lab')) return true
  if (key.includes('radiology') || key.includes('x ray') || key.includes('xray')) return true
  if (key.includes('pharmacy')) return true
  if (key.includes('reception')) return true
  if (key.includes('emergency')) return true
  if (key.includes('intake') || key.includes('inpatient')) return true
  if (key.includes('security') || key.includes('gate')) return true
  if (key.includes('account')) return true

  return false
}

function normalizeRole(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferDepartmentFilter(name: string): DepartmentFilterKey {
  const key = normalizeRole(name)
  if (key.includes('radiology') || key.includes('x ray') || key.includes('xray')) return 'radiology'
  if (key.includes('sonar') || key.includes('ultrasound')) return 'sonar'
  if (key.includes('lab') || key.includes('laboratory')) return 'laboratory'
  return 'any'
}

function toDepartmentType(filterKey: DepartmentFilterKey): string {
  if (filterKey === 'laboratory') return 'laboratory'
  if (filterKey === 'radiology') return 'radiology'
  if (filterKey === 'sonar') return 'sonar'
  return ''
}

function getDepartmentIcon(name: string) {
  const key = name.trim().toLowerCase()
  if (key.includes('emergency')) return AlertTriangle
  if (key.includes('reception')) return Users
  if (key.includes('pharmacy')) return Pill
  if (key.includes('lab')) return FlaskConical
  if (key.includes('radiology')) return Radiation
  if (key.includes('intake')) return ClipboardList
  if (key.includes('security')) return Shield
  if (key.includes('account')) return Calculator
  if (key.includes('physical')) return Stethoscope
  return LayoutGrid
}

export default function AdminDepartmentsPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [hoveredEditId, setHoveredEditId] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)

  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pickerDirection, setPickerDirection] = useState<'up' | 'down'>('down')
  const [pickerRect, setPickerRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM)
  const pickerAnchorRef = useRef<HTMLDivElement | null>(null)

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === selectedDepartmentId) || null,
    [departments, selectedDepartmentId]
  )
  const activeDepartmentName = useMemo(
    () => form.name.trim() || selectedDepartment?.name || '',
    [form.name, selectedDepartment]
  )

  const employeeNameById = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e.name]))
  }, [employees])

  const filteredEmployees = useMemo(() => employees, [employees])
  const operationalDepartments = useMemo(() => {
    return departments.filter((dept) => isOperationalDepartment(dept.name))
  }, [departments])

  const loadDepartments = async () => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 6000)
    try {
      const res = await fetch('/api/departments', { cache: 'no-store', signal: controller.signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load departments')
      const rows = Array.isArray(data?.departments) ? data.departments : []
      const mapped = rows.map((r: any) => ({
        id: String(r.id),
        name: String(r.name || ''),
        headEmployeeId: String(r.headEmployeeId || ''),
        headOfDepartmentName: String(r.headOfDepartmentName || ''),
        hodTag: String(r.hodTag || 'Department Lead'),
        assignedEmployeeIds: Array.isArray(r.assignedEmployeeIds) ? r.assignedEmployeeIds.map(String) : [],
        description: String(r.description || ''),
        color: String(r.color || '#7c3aed'),
        employeeCount: Number(r.employeeCount || 0),
      }))
      departmentsCache = { data: mapped, ts: Date.now() }
      setDepartments(mapped)
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const loadEmployees = async (departmentName?: string) => {
    const filter = inferDepartmentFilter(departmentName || '')
    const departmentType = toDepartmentType(filter)
    const endpoint = departmentType ? `/api/employees?departmentType=${encodeURIComponent(departmentType)}` : '/api/employees'
    const res = await fetch(endpoint, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load employees')
    const rows = Array.isArray(data?.employees) ? data.employees : Array.isArray(data) ? data : []
    const mapped = rows.map((e: any) => {
      const role = String(e.role || e.role_tag || '')
      const departmentName = String(e.department_name || e.departmentName || '')
      const specialization = String(e.specialization || '')
      const employeeTag = String(e.employeeTag || e.roleTag || specialization || formatEmployeeTag(role))
      const aliases = [
        role,
        employeeTag,
        specialization,
        departmentName,
        employeeTag.replace(/\s+/g, ''),
        employeeTag.replace(/technician/i, 'tech'),
        employeeTag.replace(/tech/i, 'technician'),
      ].join(' ')
      return {
        id: String(e.id || e.userId || ''),
        name: String(e.name || ''),
        role,
        employeeTag,
        specialization,
        departmentName,
        searchableText: `${String(e.name || '')} ${aliases}`.toLowerCase(),
      }
    })
    if (!departmentType) {
      employeesCache = { data: mapped, ts: Date.now() }
    }
    setEmployees(mapped)
  }

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      const now = Date.now()
      const hasFreshDepartments = !!departmentsCache && now - departmentsCache.ts < DEPARTMENTS_STALE_MS

      // Instant paint from cache on back-navigation
      if (hasFreshDepartments && !cancelled) setDepartments(departmentsCache!.data)
      if (hasFreshDepartments && !cancelled) setLoading(false)

      try {
        if (!hasFreshDepartments && !cancelled) setLoading(true)
        // Departments are required for page paint; employees are lazy-loaded on modal open.
        if (hasFreshDepartments) {
          void loadDepartments().catch(() => null)
        } else {
          await loadDepartments()
        }
      } catch (e: any) {
        if (!cancelled) alert(e?.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const ensureEmployeesLoaded = async (departmentName?: string) => {
    const filter = inferDepartmentFilter(departmentName || '')
    const allowCache = filter === 'any'
    const now = Date.now()
    const hasFreshEmployees = !!employeesCache && now - employeesCache.ts < EMPLOYEES_STALE_MS
    if (allowCache && hasFreshEmployees) {
      setEmployees(employeesCache!.data)
      return
    }
    await loadEmployees(departmentName)
  }

  const validate = (requireHead = true) => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Department Name is required'
    if (requireHead && !form.headEmployeeId.trim()) next.head = 'Head of Department is required'
    if (!form.assignedEmployeeIds.length) next.staff = 'Select at least one employee'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setShowEmployeePicker(false)
  }

  const toggleEmployee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.includes(id)
        ? prev.assignedEmployeeIds.filter((x) => x !== id)
        : [...prev.assignedEmployeeIds, id],
    }))
  }

  const setHeadFromEmployee = (employeeId: string) => {
    setForm((prev) => ({
      ...prev,
      headEmployeeId: employeeId,
    }))
  }

  const handleCreateDepartment = async () => {
    if (!validate(false)) return
    const headEmployee = employees.find((e) => e.id === form.headEmployeeId)
    const payload = {
      name: form.name,
      headEmployeeId: form.headEmployeeId,
      headOfDepartmentName: headEmployee?.name ?? '',
      hodTag: headEmployee?.employeeTag ?? 'Department Lead',
      description: form.description,
      color: form.color,
      assignedEmployeeIds: form.assignedEmployeeIds,
    }
    try {
      setSavingCreate(true)
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create department')
      await loadDepartments()
      setShowAddModal(false)
      resetForm()
    } catch (e: any) {
      alert(e?.message || 'Failed to create department')
    } finally {
      setSavingCreate(false)
    }
  }

  const openDepartmentDetail = (dept: Department) => {
    setSelectedDepartmentId(dept.id)
    setDetailEditMode(false)
    setShowDetailModal(true)
    setForm({
      name: dept.name,
      headEmployeeId: dept.headEmployeeId || '',
      description: dept.description,
      color: dept.color,
      assignedEmployeeIds: dept.assignedEmployeeIds,
    })
    setErrors({})
    setShowEmployeePicker(false)
    void ensureEmployeesLoaded(dept.name)
  }

  const handleSaveDepartmentChanges = async () => {
    if (!selectedDepartment || !validate()) return
    const headEmployee = employees.find((e) => e.id === form.headEmployeeId)
    const payload = {
      name: form.name,
      headEmployeeId: form.headEmployeeId,
      headOfDepartmentName: headEmployee?.name ?? '',
      hodTag: headEmployee?.employeeTag ?? 'Department Lead',
      description: form.description,
      color: form.color,
      assignedEmployeeIds: form.assignedEmployeeIds,
    }
    try {
      setSavingEdit(true)
      const res = await fetch(`/api/departments/${encodeURIComponent(selectedDepartment.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to save changes')
      await loadDepartments()
      setDetailEditMode(false)
      setShowDetailModal(false)
      setSelectedDepartmentId(null)
      resetForm()
    } catch (e: any) {
      alert(e?.message || 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  const getDepartmentHref = (name: string) => {
    const key = name.trim().toLowerCase()
    if (key.includes('emergency')) return '/admin/emergency'
    if (key.includes('reception')) return '/admin/reception'
    if (key.includes('pharmacy')) return '/admin/pharmacy'
    if (key.includes('laboratory') || key === 'lab') return '/admin/lab'
    if (key.includes('sonar') || key.includes('ultrasound')) return '/radiology?tab=sonar'
    if (key.includes('radiology') || key.includes('x-ray') || key.includes('xray')) return '/radiology'
    if (key.includes('account')) return '/accountant'
    if (key.includes('gate') || key.includes('security')) return '/gatekeeper'
    if (key.includes('inpatient') || key.includes('intake')) return '/intake'
    return '/admin'
  }

  const handleEnterDepartment = (name: string) => {
    const href = getDepartmentHref(name)
    sessionStorage.setItem('adminOverride', 'true')
    sessionStorage.setItem('adminReturnPath', '/admin/departments')
    router.push(href)
  }

  const renderEmployeePicker = () => (
    <div className="relative" ref={pickerAnchorRef}>
      <button
        type="button"
        onClick={async () => {
          const next = !showEmployeePicker
          if (next) await ensureEmployeesLoaded(activeDepartmentName)
          setShowEmployeePicker(next)
        }}
        className="flex h-14 w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-left text-slate-200"
      >
        <span className="text-sm">
          {form.assignedEmployeeIds.length ? `${form.assignedEmployeeIds.length} employee(s) selected` : 'Select employees'}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {showEmployeePicker && pickerRect
        ? createPortal(
            <div
              className="fixed z-[120] rounded-xl border border-emerald-500/40 bg-[#081112] p-2 shadow-[0_0_28px_rgba(16,185,129,0.25)]"
              style={{
                left: pickerRect.left,
                width: pickerRect.width,
                top: pickerDirection === 'down' ? pickerRect.top + 8 : undefined,
                bottom: pickerDirection === 'up' ? window.innerHeight - pickerRect.top + 8 : undefined,
              }}
            >
              <div className="sticky top-0 z-10 mb-2 rounded-lg border border-emerald-500/30 bg-[#081112] p-1">
                <div className="rounded-lg border border-emerald-500/25 bg-[#0b1818]/90 px-3 py-2">
                  <p className="text-xs text-emerald-300">
                    Available staff for {activeDepartmentName || 'this department'}
                  </p>
                </div>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {filteredEmployees.map((employee) => {
                  const checked = form.assignedEmployeeIds.includes(employee.id)
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => toggleEmployee(employee.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left hover:border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <span>
                        <span className="block text-sm text-slate-100">{employee.name}</span>
                        <span className="block text-xs text-slate-400">{employee.employeeTag || employee.role || 'Staff'}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-emerald-400 bg-emerald-500/30 text-emerald-100' : 'border-slate-600 text-transparent'}`}>
                        <Check size={13} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {!filteredEmployees.length ? (
                <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                  No technicians registered for this department yet
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
      {errors.staff ? <p className="mt-1 text-xs text-rose-400">{errors.staff}</p> : null}
    </div>
  )

  useEffect(() => {
    if (!showEmployeePicker) return

    const updatePickerPosition = () => {
      const anchor = pickerAnchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const estimatedHeight = 260
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < estimatedHeight && r.top > estimatedHeight
      setPickerDirection(openUp ? 'up' : 'down')
      setPickerRect({
        left: r.left,
        width: r.width,
        top: openUp ? r.top : r.bottom,
      })
    }

    updatePickerPosition()
    window.addEventListener('resize', updatePickerPosition)
    window.addEventListener('scroll', updatePickerPosition, true)
    return () => {
      window.removeEventListener('resize', updatePickerPosition)
      window.removeEventListener('scroll', updatePickerPosition, true)
    }
  }, [showEmployeePicker])

  return (
    <div className="min-h-full bg-slate-950">
      <main className="p-8">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => {
              resetForm()
              void ensureEmployeesLoaded(form.name)
              setShowAddModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/35 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.35)] transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-[0_0_40px_rgba(99,102,241,0.45)]"
          >
            <Plus size={18} />
            Add New Department
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="mb-4 h-16 w-16 animate-pulse rounded-xl bg-slate-800/80" />
                <div className="mb-6 h-7 w-2/3 animate-pulse rounded bg-slate-800/80" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800/80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {operationalDepartments.map((dept) => (
              <article
                key={dept.id}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-slate-700/60"
              >
                <div className="absolute right-14 top-4 rounded-lg border border-teal-500/40 bg-teal-500/20 px-2.5 py-1">
                  <span className="text-xs font-medium text-teal-300">Admin Access</span>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${dept.name}`}
                  onClick={() => openDepartmentDetail(dept)}
                  onMouseEnter={() => setHoveredEditId(dept.id)}
                  onMouseLeave={() => setHoveredEditId(null)}
                  className="absolute right-4 top-4 rounded-lg border border-slate-700/60 bg-slate-900/70 p-2 text-slate-400 transition-all"
                  style={
                    hoveredEditId === dept.id
                      ? {
                          color: dept.color,
                          borderColor: `${dept.color}88`,
                          boxShadow: `0 0 14px ${dept.color}44`,
                        }
                      : undefined
                  }
                >
                  <Edit2 size={14} />
                </button>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${dept.color}, ${dept.color}CC)` }}>
                  {(() => { const Icon = getDepartmentIcon(dept.name); return <Icon size={30} className="text-white" strokeWidth={1.6} /> })()}
                </div>
                <h2 className="mb-6 text-3xl font-bold text-white sm:text-2xl">{dept.name}</h2>
                <button
                  type="button"
                  onClick={() => handleEnterDepartment(dept.name)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-95"
                  style={{ background: `linear-gradient(90deg, ${dept.color}, ${dept.color}DD)` }}
                >
                  <ExternalLink size={18} />
                  Enter Department
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-2xl border border-slate-800/60 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Create New Department - Zion Med</h3>
              <button type="button" onClick={() => { setShowAddModal(false); resetForm() }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Department Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-14 w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Theme Color</label>
                <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3">
                  <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-slate-700/50 bg-transparent p-0" />
                  <span className="text-sm text-slate-300">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Add Employees</label>
                {renderEmployeePicker()}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-800/50 pt-4">
              <button type="button" onClick={() => { setShowAddModal(false); resetForm() }} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Cancel</button>
              <button type="button" disabled={savingCreate} onClick={handleCreateDepartment} className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {savingCreate ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedDepartment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-2xl border p-6" style={{ borderColor: `${(detailEditMode ? form.color : selectedDepartment.color) || '#7c3aed'}66` }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Department Detail - Zion Med</h3>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false)
                  setDetailEditMode(false)
                  setSelectedDepartmentId(null)
                  resetForm()
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {!detailEditMode ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Department Name</p>
                  <p className="mt-1 text-lg font-bold text-white">{selectedDepartment.name}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Lead: <span className="text-slate-100">{selectedDepartment.headOfDepartmentName || 'Not assigned'}</span>{' '}
                    <span className="text-indigo-300">({selectedDepartment.hodTag})</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedDepartment.description || 'No description'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Assigned Employees</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedDepartment.assignedEmployeeIds.length ? selectedDepartment.assignedEmployeeIds.map((id) => (
                      <span key={id} className="rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-xs text-slate-200">
                        {employeeNameById.get(id) || id}
                      </span>
                    )) : <span className="text-sm text-slate-400">No assigned employees.</span>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-800/50 pt-4">
                  <button type="button" onClick={() => setShowDetailModal(false)} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Close</button>
                  <button
                    type="button"
                    onClick={() => setDetailEditMode(true)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: `linear-gradient(90deg, ${selectedDepartment.color}, ${selectedDepartment.color}DD)` }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Department Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-14 w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Head of Department</label>
                    <select
                      value={form.headEmployeeId}
                      onChange={(e) => setHeadFromEmployee(e.target.value)}
                      className="h-14 w-full rounded-xl border border-emerald-500/30 bg-[#0d1718] px-4 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/25"
                    >
                      <option value="">Select Head of Department</option>
                      {filteredEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.employeeTag || employee.role || 'Staff'}
                        </option>
                      ))}
                    </select>
                    {errors.head ? <p className="mt-1 text-xs text-rose-400">{errors.head}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Theme Color</label>
                    <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3">
                      <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-slate-700/50 bg-transparent p-0" />
                      <span className="text-sm text-slate-300">{form.color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Add Employees</label>
                    {renderEmployeePicker()}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-800/50 pt-4">
                  <button type="button" onClick={() => setDetailEditMode(false)} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Cancel</button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={handleSaveDepartmentChanges}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${form.color}, ${form.color}DD)` }}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

