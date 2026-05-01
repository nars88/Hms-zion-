'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES } from '@/contexts/AuthContext'

type ServiceRow = {
  serviceCode: string
  displayName: string
  department: string
  taskCategory: string
  billingUnit: string
  basePrice: number
  currency: string
  isActive: boolean
}

type NewServiceForm = {
  serviceCode: string
  displayName: string
  department: string
  basePrice: string
  isActive: boolean
}

type ModalMode = 'create' | 'edit'

const DEPARTMENTS = ['ER', 'LAB', 'RADIOLOGY', 'SONAR', 'ECG', 'NURSING'] as const
const BILLING_UNIT_DEFAULT = 'PER_TASK'
const TASK_CATEGORY_BY_DEPARTMENT: Record<string, string> = {
  ER: 'BED_USAGE',
  LAB: 'DIAGNOSTIC_LAB',
  RADIOLOGY: 'DIAGNOSTIC_RADIOLOGY',
  SONAR: 'DIAGNOSTIC_SONAR',
  ECG: 'DIAGNOSTIC_ECG',
  NURSING: 'NURSING',
}

function toSlugCode(input: string): string {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

export default function PricingClientPage() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingOriginalCode, setEditingOriginalCode] = useState<string | null>(null)
  const [serviceCodeTouched, setServiceCodeTouched] = useState(false)
  const [query, setQuery] = useState('')
  const [newService, setNewService] = useState<NewServiceForm>({
    serviceCode: '',
    displayName: '',
    department: '',
    basePrice: '',
    isActive: true,
  })
  const [deleteTarget, setDeleteTarget] = useState<{ serviceCode: string; displayName: string } | null>(
    null
  )
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    if (modalMode === 'edit' || serviceCodeTouched) return
    const dept = toSlugCode(newService.department)
    const name = toSlugCode(newService.displayName)
    const autoCode = [dept, name].filter(Boolean).join('_')
    setNewService((prev) => ({ ...prev, serviceCode: autoCode }))
  }, [modalMode, newService.department, newService.displayName, serviceCodeTouched])

  const fetchRows = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/service-catalog', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as { error?: string; services?: ServiceRow[] }
      if (!res.ok) throw new Error(data.error || 'Failed to load pricing catalog')
      const list = Array.isArray(data.services) ? data.services : []
      setRows(list)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to load pricing catalog')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows()
  }, [])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      return (
        r.serviceCode.toLowerCase().includes(q) ||
        r.displayName.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.taskCategory.toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const closeModal = () => {
    resetForm()
    setModalOpen(false)
    setModalMode('create')
    setEditingOriginalCode(null)
  }

  const resetForm = () => {
    setServiceCodeTouched(false)
    setNewService({
      serviceCode: '',
      displayName: '',
      department: '',
      basePrice: '',
      isActive: true,
    })
  }

  const openCreateModal = () => {
    setError(null)
    setModalMode('create')
    setEditingOriginalCode(null)
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (row: ServiceRow) => {
    setError(null)
    setModalMode('edit')
    setEditingOriginalCode(row.serviceCode)
    setServiceCodeTouched(true)
    setNewService({
      serviceCode: row.serviceCode,
      displayName: row.displayName,
      department: row.department,
      basePrice: String(row.basePrice),
      isActive: Boolean(row.isActive),
    })
    setModalOpen(true)
  }

  const handleSaveModal = async () => {
    const serviceCode = newService.serviceCode.trim().toUpperCase()
    const displayName = newService.displayName.trim()
    const basePrice = Number(newService.basePrice)
    const taskCategory =
      TASK_CATEGORY_BY_DEPARTMENT[newService.department] || 'BED_USAGE'

    if (!serviceCode || !displayName || !newService.department) {
      setError('Service code, display name, and department are required.')
      return
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      setError('Price must be a valid non-negative number.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (modalMode === 'edit' && editingOriginalCode) {
        const res = await fetch(
          `/api/admin/service-catalog/${encodeURIComponent(editingOriginalCode)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              displayName,
              basePrice,
              isActive: newService.isActive,
              department: newService.department,
              taskCategory,
            }),
          }
        )
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to update service')
      } else {
        if (rows.some((r) => r.serviceCode.toUpperCase() === serviceCode)) {
          setError('Service code already exists.')
          setSaving(false)
          return
        }
        const verifyRes = await fetch('/api/admin/service-catalog', { cache: 'no-store' })
        const verifyData = (await verifyRes.json().catch(() => ({}))) as { services?: ServiceRow[] }
        if (!verifyRes.ok) throw new Error('Failed to verify service code uniqueness')
        const verifyRows = Array.isArray(verifyData.services) ? verifyData.services : []
        if (verifyRows.some((r) => r.serviceCode.toUpperCase() === serviceCode)) {
          throw new Error('Service code already exists.')
        }

        const res = await fetch('/api/admin/service-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceCode,
            displayName,
            department: newService.department,
            taskCategory,
            billingUnit: BILLING_UNIT_DEFAULT,
            basePrice,
            currency: 'IQD',
            isActive: newService.isActive,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to create service')
      }

      await fetchRows()
      closeModal()
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleteBusy(true)
      setError(null)
      const res = await fetch(
        `/api/admin/service-catalog/${encodeURIComponent(deleteTarget.serviceCode)}`,
        { method: 'DELETE' }
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to delete service')
      await fetchRows()
      setDeleteTarget(null)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to delete service')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} redirectTo="/login">
      <main className="w-full overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
            <button
              type="button"
              onClick={openCreateModal}
              className="h-11 shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30"
            >
              Add New Service
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog"
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-800/70 bg-slate-900/40">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Service Code
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Display Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Department
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Task Category
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Billing Unit
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Price (IQD)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Active
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      Loading pricing catalog...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      No services found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.serviceCode} className="hover:bg-slate-800/30">
                      <td className="px-3 py-3 text-sm font-semibold text-cyan-200">{row.serviceCode}</td>
                      <td className="px-3 py-3 text-sm text-slate-200">{row.displayName}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{row.department}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{row.taskCategory}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{row.billingUnit}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-slate-200">
                        {formatPrice(Number(row.basePrice))}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-xs font-medium ${row.isActive ? 'text-emerald-300' : 'text-slate-500'}`}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Edit service"
                            onClick={() => openEditModal(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-200"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Edit</span>
                          </button>
                          <button
                            type="button"
                            title="Delete service"
                            onClick={() =>
                              setDeleteTarget({
                                serviceCode: row.serviceCode,
                                displayName: row.displayName,
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-200"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {modalOpen ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => {
                  if (!saving) closeModal()
                }}
              />
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={() => {
                  if (!saving) closeModal()
                }}
              >
                <div
                  className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-slate-100">
                    {modalMode === 'edit' ? 'Edit Service' : 'Add New Service'}
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
                        Service Code {modalMode === 'edit' ? '(fixed)' : '(auto-generated)'}
                      </label>
                      <input
                        value={newService.serviceCode}
                        readOnly={modalMode === 'edit'}
                        onChange={(e) => {
                          setServiceCodeTouched(true)
                          setNewService((p) => ({ ...p, serviceCode: e.target.value.toUpperCase() }))
                        }}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none read-only:cursor-not-allowed read-only:opacity-80"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Display Name</label>
                      <input
                        value={newService.displayName}
                        onChange={(e) => setNewService((p) => ({ ...p, displayName: e.target.value }))}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Department</label>
                      <select
                        value={newService.department}
                        onChange={(e) => setNewService((p) => ({ ...p, department: e.target.value }))}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                      >
                        <option value="">Select department…</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Price (IQD)</label>
                      <input
                        type="number"
                        min={0}
                        value={newService.basePrice}
                        onChange={(e) => setNewService((p) => ({ ...p, basePrice: e.target.value }))}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={newService.isActive}
                          onChange={(e) => setNewService((p) => ({ ...p, isActive: e.target.checked }))}
                        />
                        Active (visible for billing / assignment)
                      </label>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Billing Unit (Default)</label>
                      <input
                        value={BILLING_UNIT_DEFAULT}
                        readOnly
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-300"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-slate-400">
                        Task Category (Auto by Department)
                      </label>
                      <input
                        value={TASK_CATEGORY_BY_DEPARTMENT[newService.department] || ''}
                        readOnly
                        aria-readonly="true"
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/40 px-3 text-sm text-slate-300"
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveModal()}
                      disabled={saving}
                      className="rounded-md border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {deleteTarget ? (
            <>
              <div
                className="fixed inset-0 z-[60] bg-black/60"
                onClick={() => !deleteBusy && setDeleteTarget(null)}
              />
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                  <h3 className="text-lg font-semibold text-rose-200">Confirm delete</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    Remove <span className="font-semibold text-slate-100">{deleteTarget.displayName}</span>{' '}
                    (<span className="font-mono text-xs text-cyan-200/90">{deleteTarget.serviceCode}</span>)
                    from the catalog? This cannot be undone.
                  </p>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={() => setDeleteTarget(null)}
                      className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={() => void handleConfirmDelete()}
                      className="rounded-md border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-60"
                    >
                      {deleteBusy ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  )
}
