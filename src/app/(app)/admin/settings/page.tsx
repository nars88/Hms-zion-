'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth, USER_ROLES, type UserRole } from '@/contexts/AuthContext'
import { SPECIALTY_LABEL_BY_NAME } from '@/lib/departmentSpecialties'

type EmployeeRow = {
  id: string
  name: string
  email: string
  role: string
  education?: string | null
  departmentId?: string | null
  departmentName?: string | null
}

type DepartmentOption = { id: string; name: string }

type Toast = {
  id: number
  type: 'success' | 'error'
  message: string
}

function formatRoleLabel(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

function formatDepartmentLabel(name: string): string {
  const key = String(name || '').trim().toLowerCase()
  return SPECIALTY_LABEL_BY_NAME.get(key) || name
}

/** Employee modals: readable size, still fits viewport without inner scroll */
const modalInputClass =
  'h-10 w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25'

const modalLabelClass =
  'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400'

const modalShellClass =
  'flex max-h-[min(94dvh,920px)] w-full max-w-2xl flex-col gap-3 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/95 p-5 shadow-2xl sm:max-w-3xl sm:gap-4 sm:p-6'

const modalGridClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3'

const modalBtnSecondary =
  'rounded-lg border border-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800/60'

const modalBtnPrimary =
  'rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-violet-500 hover:to-indigo-500 disabled:pointer-events-none disabled:opacity-40'

export default function SettingsPage() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [savingAdd, setSavingAdd] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const filteredEmployees = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const name = e.name.toLowerCase()
      const roleRaw = e.role.toLowerCase()
      const roleLabel = formatRoleLabel(e.role).toLowerCase()
      const spec = (e.education || '').toLowerCase()
      const dept = (e.departmentName || '').toLowerCase()
      return (
        name.includes(q) ||
        roleRaw.includes(q) ||
        roleLabel.includes(q) ||
        spec.includes(q) ||
        dept.includes(q)
      )
    })
  }, [employees, debouncedSearch])

  const [addForm, setAddForm] = useState({
    name: '',
    departmentId: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLES.DOCTOR as UserRole,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    role: USER_ROLES.DOCTOR as UserRole,
    departmentId: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const roleOptions = useMemo(() => Object.values(USER_ROLES), [])

  const isAddFormValid = useMemo(
    () =>
      !loadingDepartments &&
      addForm.name.trim().length > 0 &&
      addForm.departmentId.trim().length > 0 &&
      addForm.email.trim().length > 0 &&
      addForm.password.length >= 6 &&
      addForm.password === addForm.confirmPassword &&
      Boolean(addForm.role),
    [addForm, loadingDepartments]
  )

  const isEditFormValid = useMemo(() => {
    if (loadingDepartments) return false
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.departmentId.trim()) return false
    if (editForm.password !== editForm.confirmPassword) return false
    if (editForm.password.length > 0 && editForm.password.length < 6) return false
    return true
  }, [editForm, loadingDepartments])

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true)
      const res = await fetch('/api/employees', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load employees')
      const rows = Array.isArray(data?.employees) ? data.employees : []
      setEmployees(
        rows.map((e: any) => ({
          id: String(e.id || ''),
          name: String(e.name || ''),
          email: String(e.email || ''),
          role: String(e.role || ''),
          education: e.education != null && e.education !== '' ? String(e.education) : null,
          departmentId: e.departmentId != null ? String(e.departmentId) : null,
          departmentName:
            e.departmentName != null && e.departmentName !== '' ? String(e.departmentName) : null,
        }))
      )
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to load employees')
    } finally {
      setLoadingEmployees(false)
    }
  }, [showToast])

  const loadDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true)
      const res = await fetch('/api/departments', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load departments')
      const rows = Array.isArray(data?.departments) ? data.departments : []
      const mapped = rows
        .map((d: any) => ({ id: String(d.id), name: String(d.name || '') }))
        .filter((d: DepartmentOption) => d.id && d.name)
        .sort((a: DepartmentOption, b: DepartmentOption) => a.name.localeCompare(b.name))
      setDepartments(mapped)
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to load departments')
      setDepartments([])
    } finally {
      setLoadingDepartments(false)
    }
  }, [showToast])

  useEffect(() => {
    loadEmployees()
    loadDepartments()
  }, [loadDepartments, loadEmployees])

  const openEditModal = (employee: EmployeeRow) => {
    setEditingEmployee(employee)
    setEditForm({
      name: employee.name,
      role: employee.role as UserRole,
      departmentId: employee.departmentId?.trim() ?? '',
      email: employee.email,
      password: '',
      confirmPassword: '',
    })
  }

  const resetAddForm = () => {
    setAddForm({
      name: '',
      departmentId: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: USER_ROLES.DOCTOR as UserRole,
    })
  }

  const handleAddEmployee = async () => {
    if (!isAddFormValid) {
      showToast('error', 'Please fill all required fields correctly')
      return
    }

    const prevEmployees = employees

    const name = addForm.name.trim()
    const email = addForm.email.trim()
    const password = addForm.password
    const role = addForm.role
    const departmentId = addForm.departmentId.trim()
    const departmentName =
      departments.find((d) => d.id === departmentId)?.name ?? null

    const tempId = `temp-${Date.now()}`
    const optimisticEmployee: EmployeeRow = {
      id: tempId,
      name,
      email,
      role,
      education: null,
      departmentId,
      departmentName,
    }

    // Instant feedback
    setEmployees((prev) => [optimisticEmployee, ...prev])
    setShowAddModal(false)
    resetAddForm()

    try {
      setSavingAdd(true)
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          departmentId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to add employee')

      const realId = data?.employee?.id ? String(data.employee.id) : null
      if (realId) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === tempId ? { ...e, id: realId } : e))
        )
      }
      showToast('success', 'Employee added successfully')
    } catch (e: any) {
      // Rollback on error
      setEmployees(prevEmployees)
      showToast('error', e?.message || 'Failed to add employee')
    } finally {
      setSavingAdd(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEmployee) return
    if (!isEditFormValid) {
      showToast('error', 'Please fix validation errors before saving')
      return
    }

    const prevEmployees = employees
    const prevEditing = editingEmployee

    const name = editForm.name.trim()
    const role = editForm.role
    const email = editForm.email.trim()
    const departmentId = editForm.departmentId.trim()
    const departmentName =
      departments.find((d) => d.id === departmentId)?.name ?? null

    // Instant feedback
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === prevEditing.id
          ? {
              ...e,
              name,
              role,
              email,
              departmentId,
              departmentName,
            }
          : e
      )
    )
    setEditingEmployee(null)

    try {
      setSavingEdit(true)
      const payload: Record<string, string | undefined> = {
        name,
        role,
        email,
        departmentId,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }

      const res = await fetch(
        `/api/employees/${encodeURIComponent(prevEditing.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update employee')
      showToast('success', 'Employee updated successfully')

      // Clear form on success (modal already closed)
      setEditForm({
        name: '',
        role: USER_ROLES.DOCTOR,
        departmentId: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    } catch (e: any) {
      // Rollback on error + reopen modal
      setEmployees(prevEmployees)
      setEditingEmployee(prevEditing)
      showToast('error', e?.message || 'Failed to update employee')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (employee: EmployeeRow) => {
    if (employee.id === user?.id) {
      showToast('error', 'You cannot delete your own account')
      return
    }
    const ok = confirm(`Delete employee "${employee.name}"?`)
    if (!ok) return

    const prevEmployees = employees

    // Instant remove
    setDeletingId(employee.id)
    setEmployees((prev) => prev.filter((e) => e.id !== employee.id))

    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(employee.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete employee')
      showToast('success', 'Employee deleted successfully')
    } catch (e: any) {
      // Rollback on error
      setEmployees(prevEmployees)
      showToast('error', e?.message || 'Failed to delete employee')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-full bg-slate-950">
      <main className="flex-1 overflow-y-auto p-8">
        <section className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
          <div className="mb-6 flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-h-[44px] min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-400/90"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Name, Role, or Department..."
                autoComplete="off"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-600/70 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex shrink-0 items-stretch gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-indigo-500"
              >
                Add Employee
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loadingEmployees ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-300">
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-300">
                      No employees found.
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-300">
                      No employees match your search.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-slate-800/70 transition-colors hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-100">{employee.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{employee.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{formatRoleLabel(employee.role)}</td>
                      <td className="max-w-[220px] px-4 py-3 text-sm text-emerald-200/90">
                        <span
                          className="line-clamp-2"
                          title={employee.departmentName || employee.education || undefined}
                        >
                          {employee.departmentName?.trim()
                            ? employee.departmentName
                            : employee.education?.trim()
                              ? employee.education
                              : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(employee)}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === employee.id}
                            onClick={() => handleDelete(employee)}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-60"
                          >
                            {deletingId === employee.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className={modalShellClass} role="dialog" aria-labelledby="add-employee-title">
            <h3 id="add-employee-title" className="shrink-0 text-lg font-semibold tracking-tight text-slate-100">
              Add New Employee
            </h3>
            <div className={`${modalGridClass} min-h-0`}>
              <div className="sm:col-span-2">
                <label className={modalLabelClass}>Full name</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Department</label>
                <select
                  value={addForm.departmentId}
                  onChange={(e) => setAddForm((p) => ({ ...p, departmentId: e.target.value }))}
                  disabled={loadingDepartments}
                  className={modalInputClass}
                >
                  <option value="">
                    {loadingDepartments ? 'Loading…' : 'Select department'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDepartmentLabel(d.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={modalLabelClass}>Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className={modalInputClass}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={modalLabelClass}>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="email@hospital.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Confirm</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
            </div>
            <div className="mt-2 flex shrink-0 justify-end gap-3 border-t border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  resetAddForm()
                }}
                className={modalBtnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAdd || !isAddFormValid}
                onClick={handleAddEmployee}
                className={modalBtnPrimary}
              >
                {savingAdd ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingEmployee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className={modalShellClass} role="dialog" aria-labelledby="edit-employee-title">
            <h3 id="edit-employee-title" className="shrink-0 text-lg font-semibold tracking-tight text-slate-100">
              Edit Employee Credentials
            </h3>
            <div className={`${modalGridClass} min-h-0`}>
              <div className="sm:col-span-2">
                <label className={modalLabelClass}>Name</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className={modalInputClass}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={modalLabelClass}>Department</label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm((p) => ({ ...p, departmentId: e.target.value }))}
                  disabled={loadingDepartments}
                  className={modalInputClass}
                >
                  <option value="">
                    {loadingDepartments ? 'Loading…' : 'Select department'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDepartmentLabel(d.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={modalLabelClass}>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>New password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Optional"
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Confirm</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={modalInputClass}
                />
              </div>
            </div>
            <div className="mt-2 flex shrink-0 justify-end gap-3 border-t border-slate-800/60 pt-4">
              <button type="button" onClick={() => setEditingEmployee(null)} className={modalBtnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !isEditFormValid}
                onClick={handleSaveEdit}
                className={modalBtnPrimary}
              >
                {savingEdit ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-2 text-sm ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-slate-900/95 text-slate-100'
                : 'border-rose-500/40 bg-slate-900/95 text-slate-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
