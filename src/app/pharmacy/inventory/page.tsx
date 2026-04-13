'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { Package, Plus, ArrowLeft } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth, USER_ROLES } from '@/contexts/AuthContext'

const STORAGE_KEY = 'inventory'

interface InventoryRow {
  id: string
  drugName: string
  currentStock: number
  unit: string
  pricePerUnit: number
  minThreshold: number
  createdAt?: string
  updatedAt?: string
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

export default function PharmacyInventoryPage() {
  const [drugs, setDrugs] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [newDrug, setNewDrug] = useState({ drugName: '', currentStock: '0', unit: 'unit', pricePerUnit: '', minThreshold: '10' })

  const { user } = useAuth()

  useEffect(() => {
    setDrugs(loadFromStorage())
    setLoading(false)
  }, [])

  const handleAddDrug = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newDrug.drugName.trim()
    if (!name) return
    const newDrugObj: InventoryRow = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      drugName: name,
      currentStock: parseInt(newDrug.currentStock, 10) || 0,
      unit: newDrug.unit || 'unit',
      pricePerUnit: parseFloat(newDrug.pricePerUnit) || 0,
      minThreshold: parseInt(newDrug.minThreshold, 10) >= 0 ? parseInt(newDrug.minThreshold, 10) : 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const newUpdatedArray = [...drugs, newDrugObj]
    setDrugs(newUpdatedArray)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUpdatedArray))
    setNewDrug({ drugName: '', currentStock: '0', unit: 'unit', pricePerUnit: '', minThreshold: '10' })
  }

  const handleRestock = (id: string) => {
    const qty = parseInt(restockQty, 10)
    if (!id || !Number.isInteger(qty) || qty <= 0) return
    const newUpdatedArray = drugs.map((row) =>
      row.id === id ? { ...row, currentStock: row.currentStock + qty } : row
    )
    setDrugs(newUpdatedArray)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUpdatedArray))
    setRestockId(null)
    setRestockQty('')
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.PHARMACIST, USER_ROLES.ADMIN]} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                    <Package className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-100">Pharmacy Inventory</h1>
                    <p className="text-sm text-slate-400">Stock levels, restock, and pricing</p>
                  </div>
                </div>
                <Link
                  href="/pharmacy"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Pharmacy
                </Link>
              </div>

              {/* Add drug form - 100% client-side, no API */}
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Add new drug</h2>
                <form onSubmit={handleAddDrug} className="flex flex-wrap gap-3 items-end">
                  <input
                    type="text"
                    placeholder="Drug name"
                    value={newDrug.drugName}
                    onChange={(e) => setNewDrug((p) => ({ ...p, drugName: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 min-w-[160px]"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Initial stock"
                    value={newDrug.currentStock}
                    onChange={(e) => setNewDrug((p) => ({ ...p, currentStock: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-24"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={newDrug.unit}
                    onChange={(e) => setNewDrug((p) => ({ ...p, unit: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-24"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price per unit"
                    value={newDrug.pricePerUnit}
                    onChange={(e) => setNewDrug((p) => ({ ...p, pricePerUnit: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-32"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Min threshold"
                    value={newDrug.minThreshold}
                    onChange={(e) => setNewDrug((p) => ({ ...p, minThreshold: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 w-28"
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

              {/* Table */}
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
                <div className="p-4 border-b border-slate-800/50">
                  <h2 className="text-sm font-semibold text-slate-300">All drugs</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Rows in red: stock at or below minimum threshold</p>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading…</div>
                ) : drugs.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No drugs in inventory"
                    description="Add a drug using the form above to get started."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50 border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Drug</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Stock</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Unit</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Price/unit</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Min</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {drugs.map((row) => {
                          const isLow = row.currentStock <= row.minThreshold
                          return (
                            <tr
                              key={row.id}
                              className={isLow ? 'bg-red-500/10 border-l-4 border-red-500' : ''}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-100">{row.drugName}</td>
                              <td className="px-4 py-3 text-sm text-slate-300">{row.currentStock}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{row.unit}</td>
                              <td className="px-4 py-3 text-sm text-slate-300">{(row.pricePerUnit ?? 0).toLocaleString()} IQD</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{row.minThreshold}</td>
                              <td className="px-4 py-3">
                                {restockId === row.id ? (
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
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}
