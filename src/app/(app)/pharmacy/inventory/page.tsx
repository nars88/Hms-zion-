'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { Package, Plus, ArrowLeft } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { USER_ROLES } from '@/contexts/AuthContext'

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

export default function PharmacyInventoryPage() {
  const [drugs, setDrugs] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [newDrug, setNewDrug] = useState({ drugName: '', currentStock: '0', unit: 'unit', pricePerUnit: '', minThreshold: '10' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDrugs = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/pharmacy/inventory')
        if (!res.ok) throw new Error('Failed to load inventory')
        const data = (await res.json().catch(() => [])) as InventoryRow[]
        setDrugs(Array.isArray(data) ? data : [])
      } catch (e) {
        setError((e as Error)?.message || 'Failed to load inventory')
        setDrugs([])
      } finally {
        setLoading(false)
      }
    }
    void loadDrugs()
  }, [])

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newDrug.drugName.trim()
    if (!name) return
    setError(null)
    try {
      const res = await fetch('/api/pharmacy/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugName: name,
          currentStock: parseInt(newDrug.currentStock, 10) || 0,
          unit: newDrug.unit || 'unit',
          pricePerUnit: parseFloat(newDrug.pricePerUnit) || 0,
          minThreshold: parseInt(newDrug.minThreshold, 10) >= 0 ? parseInt(newDrug.minThreshold, 10) : 10,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to add drug')
      }
      const created = (await res.json()) as InventoryRow
      setDrugs((prev) => [...prev, created].sort((a, b) => a.drugName.localeCompare(b.drugName)))
      setNewDrug({ drugName: '', currentStock: '0', unit: 'unit', pricePerUnit: '', minThreshold: '10' })
    } catch (e) {
      setError((e as Error)?.message || 'Failed to add drug')
    }
  }

  const handleRestock = async (id: string) => {
    const qty = parseInt(restockQty, 10)
    if (!id || !Number.isInteger(qty) || qty <= 0) return
    setError(null)
    try {
      const res = await fetch(`/api/pharmacy/inventory/${id}/restock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityToAdd: qty }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Failed to restock')
      }
      const updated = (await res.json()) as InventoryRow
      setDrugs((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
      setRestockId(null)
      setRestockQty('')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to restock')
    }
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.PHARMACIST, USER_ROLES.ADMIN]} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-end">
                <Link
                  href="/pharmacy/dispense"
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
                  <label className="flex min-w-[170px] flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Medication Name</span>
                    <input
                      type="text"
                      placeholder="e.g., Paracetamol"
                      value={newDrug.drugName}
                      onChange={(e) => setNewDrug((p) => ({ ...p, drugName: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
                    />
                  </label>
                  <label className="flex w-28 flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Initial Stock Quantity</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g., 100"
                      value={newDrug.currentStock}
                      onChange={(e) => setNewDrug((p) => ({ ...p, currentStock: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
                    />
                  </label>
                  <label className="flex w-32 flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Unit Type</span>
                    <input
                      type="text"
                      placeholder="e.g., Box"
                      value={newDrug.unit}
                      onChange={(e) => setNewDrug((p) => ({ ...p, unit: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
                    />
                  </label>
                  <label className="flex w-40 flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Selling Price per Unit (IQD)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 500"
                      value={newDrug.pricePerUnit}
                      onChange={(e) => setNewDrug((p) => ({ ...p, pricePerUnit: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
                    />
                  </label>
                  <label className="flex w-36 flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Minimum Stock Alert</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g., 10"
                      value={newDrug.minThreshold}
                      onChange={(e) => setNewDrug((p) => ({ ...p, minThreshold: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500"
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </form>
                {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
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
