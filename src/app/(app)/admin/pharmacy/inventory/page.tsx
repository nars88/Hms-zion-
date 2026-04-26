'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Package, Plus, ArrowLeft, Search, Pencil, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

const STORAGE_KEY = 'inventory'
const DRUG_CATEGORIES = ['Tablets', 'Syrup', 'Injection', 'Capsules', 'Cream', 'Drops', 'Inhaler', 'Other'] as const

interface InventoryRow {
  id: string
  drugName: string
  currentStock: number
  unit: string
  pricePerUnit: number
  minThreshold: number
  expiryDate: string | null
  batchNumber: string | null
  category: string | null
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

function isNearExpiry(expiryDate: string | null, days = 30): boolean {
  if (!expiryDate) return false
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp < now) return false
  const limit = new Date(now)
  limit.setDate(limit.getDate() + days)
  return exp <= limit
}

function loadFromStorage(): InventoryRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(items: InventoryRow[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export default function AdminPharmacyInventoryPage() {
  const [list, setList] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<InventoryRow>>({})
  const [newDrug, setNewDrug] = useState({
    drugName: '',
    currentStock: '0',
    unit: 'unit',
    pricePerUnit: '',
    minThreshold: '10',
    expiryDate: '',
    batchNumber: '',
    category: '',
  })

  useEffect(() => {
    setList(loadFromStorage())
    setLoading(false)
  }, [])

  const persist = (next: InventoryRow[]) => {
    setList(next)
    saveToStorage(next)
  }

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter(
      (row) =>
        row.drugName.toLowerCase().includes(q) ||
        (row.batchNumber?.toLowerCase().includes(q)) ||
        (row.category?.toLowerCase().includes(q))
    )
  }, [list, searchQuery])

  const handleRestock = (id: string) => {
    const qty = parseInt(restockQty, 10)
    if (!qty || qty < 1) return
    const next = list.map((row) =>
      row.id === id ? { ...row, currentStock: row.currentStock + qty } : row
    )
    persist(next)
    setRestockId(null)
    setRestockQty('')
  }

  const handleAddDrug = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newDrug.drugName.trim()) return
    const newDrugObj: InventoryRow = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      drugName: newDrug.drugName.trim(),
      currentStock: parseInt(newDrug.currentStock, 10) || 0,
      unit: newDrug.unit || 'unit',
      pricePerUnit: parseFloat(newDrug.pricePerUnit) || 0,
      minThreshold: parseInt(newDrug.minThreshold, 10) || 10,
      expiryDate: newDrug.expiryDate.trim() || null,
      batchNumber: newDrug.batchNumber.trim() || null,
      category: newDrug.category.trim() || null,
    }
    const newUpdatedArray = [...list, newDrugObj]
    setList(newUpdatedArray)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUpdatedArray))
    setNewDrug({
      drugName: '',
      currentStock: '0',
      unit: 'unit',
      pricePerUnit: '',
      minThreshold: '10',
      expiryDate: '',
      batchNumber: '',
      category: '',
    })
  }

  const handleEdit = (row: InventoryRow) => {
    setEditingId(row.id)
    setEditForm({
      drugName: row.drugName,
      currentStock: row.currentStock,
      unit: row.unit,
      pricePerUnit: row.pricePerUnit,
      minThreshold: row.minThreshold,
      expiryDate: row.expiryDate ?? '',
      batchNumber: row.batchNumber ?? '',
      category: row.category ?? '',
    })
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const next = list.map((row) =>
      row.id === editingId
        ? {
            ...row,
            drugName: (editForm.drugName ?? row.drugName).trim(),
            currentStock: editForm.currentStock ?? row.currentStock,
            unit: editForm.unit ?? row.unit,
            pricePerUnit: editForm.pricePerUnit ?? row.pricePerUnit,
            minThreshold: editForm.minThreshold ?? row.minThreshold,
            expiryDate: (editForm.expiryDate as string)?.trim() || null,
            batchNumber: (editForm.batchNumber as string)?.trim() || null,
            category: (editForm.category as string)?.trim() || null,
          }
        : row
    )
    persist(next)
    setEditingId(null)
    setEditForm({})
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the list?`)) return
    persist(list.filter((row) => row.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-end">
            <Link
              href="/admin/pharmacy"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Pharmacy
            </Link>
          </div>

          {/* Add new drug - 100% client-side, no API */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Add new drug</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddDrug(e); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <input
                type="text"
                placeholder="Drug name"
                value={newDrug.drugName}
                onChange={(e) => setNewDrug((p) => ({ ...p, drugName: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
              />
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Category</label>
                <select
                  value={newDrug.category}
                  onChange={(e) => setNewDrug((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100"
                >
                  <option value="">— Select —</option>
                  {DRUG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Batch number"
                value={newDrug.batchNumber}
                onChange={(e) => setNewDrug((p) => ({ ...p, batchNumber: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
              />
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Expiry date</label>
                <input
                  type="date"
                  value={newDrug.expiryDate}
                  onChange={(e) => setNewDrug((p) => ({ ...p, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100"
                />
              </div>
              <input
                type="number"
                min="0"
                placeholder="Initial stock"
                value={newDrug.currentStock}
                onChange={(e) => setNewDrug((p) => ({ ...p, currentStock: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-full"
              />
              <input
                type="text"
                placeholder="Unit"
                value={newDrug.unit}
                onChange={(e) => setNewDrug((p) => ({ ...p, unit: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-full"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price per unit"
                value={newDrug.pricePerUnit}
                onChange={(e) => setNewDrug((p) => ({ ...p, pricePerUnit: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-full"
              />
              <input
                type="number"
                min="0"
                placeholder="Min threshold"
                value={newDrug.minThreshold}
                onChange={(e) => setNewDrug((p) => ({ ...p, minThreshold: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-full"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </form>
          </div>

          {/* Search */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by drug name, batch, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
            <div className="p-4 border-b border-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-300">All drugs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Red row = expired or near expiry (30 days). Use Edit / Delete in Actions.</p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading…</div>
            ) : filteredList.length === 0 ? (
              <EmptyState
                icon={Package}
                title={searchQuery ? 'No matching drugs' : 'No drugs in inventory'}
                description={searchQuery ? 'Try a different search.' : 'Add a drug using the form above to get started.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-800/50 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Drug Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Expiry Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Stock Level</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Restock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredList.map((row) => {
                      const expired = isExpired(row.expiryDate)
                      const nearExpiry = isNearExpiry(row.expiryDate)
                      const isLow = row.currentStock <= row.minThreshold
                      const alertRow = expired || nearExpiry
                      const isEditing = editingId === row.id
                      return (
                        <tr
                          key={row.id}
                          className={
                            alertRow
                              ? 'bg-red-500/15 border-l-4 border-red-500'
                              : isLow
                                ? 'bg-amber-500/10 border-l-4 border-amber-500/70'
                                : ''
                          }
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-100 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.drugName ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, drugName: e.target.value }))}
                                className="w-full min-w-[120px] px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              />
                            ) : (
                              row.drugName
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editForm.category ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                                className="w-full min-w-[100px] px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              >
                                <option value="">—</option>
                                {DRUG_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            ) : (
                              row.category ?? '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.batchNumber ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, batchNumber: e.target.value }))}
                                className="w-full min-w-[80px] px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              />
                            ) : (
                              row.batchNumber ?? '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editForm.expiryDate ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, expiryDate: e.target.value }))}
                                className="w-full min-w-[120px] px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              />
                            ) : row.expiryDate ? (
                              <span className={expired ? 'text-red-400 font-medium' : nearExpiry ? 'text-amber-400' : ''}>
                                {row.expiryDate}
                                {expired && ' (Expired)'}
                                {nearExpiry && !expired && ' (Soon)'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editForm.currentStock ?? 0}
                                onChange={(e) => setEditForm((p) => ({ ...p, currentStock: parseInt(e.target.value, 10) || 0 }))}
                                className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              />
                            ) : (
                              row.currentStock
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.pricePerUnit ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, pricePerUnit: parseFloat(e.target.value) || 0 }))}
                                className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                              />
                            ) : (
                              <>{(row.pricePerUnit?.toLocaleString?.() ?? row.pricePerUnit)} IQD</>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? null : restockId === row.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={restockQty}
                                  onChange={(e) => setRestockQty(e.target.value)}
                                  className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                                  placeholder="Qty"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRestock(row.id)}
                                  className="px-2 py-1 rounded bg-cyan-600 text-white text-xs font-medium"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setRestockId(null); setRestockQty('') }}
                                  className="px-2 py-1 rounded bg-slate-600 text-slate-200 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRestockId(row.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600"
                              >
                                Restock
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
                                  title="Save"
                                >
                                  <span className="text-xs font-medium">Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(null); setEditForm({}) }}
                                  className="p-1.5 rounded-lg bg-slate-600 text-slate-200 hover:bg-slate-500 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(row)}
                                  className="p-1.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-400"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row.id, row.drugName)}
                                  className="p-1.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-red-500/20 hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
