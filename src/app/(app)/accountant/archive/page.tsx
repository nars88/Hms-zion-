'use client'

import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import QRSearchBar from '@/components/shared/QRSearchBar'
import { USER_ROLES } from '@/contexts/AuthContext'
import { Receipt, ChevronDown, ChevronRight } from 'lucide-react'
import { Invoice } from '@/types/billing'
import MedicalReceipt from '@/components/shared/MedicalReceipt'

interface ArchiveRow {
  visitId: string
  patientId: string
  patientName: string
  totalAmount: number
  date: string
  billId: string
}

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toISOString().slice(0, 10)
}

function getDayOfWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

function groupByDayOfWeek(items: ArchiveRow[]): Map<string, ArchiveRow[]> {
  const byDate = new Map<string, ArchiveRow[]>()
  for (const row of items) {
    const key = getDayKey(row.date)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(row)
  }
  for (const arr of Array.from(byDate.values())) {
    arr.sort((a: ArchiveRow, b: ArchiveRow) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))
  const result = new Map<string, ArchiveRow[]>()
  for (const dateKey of sortedDates) {
    const dayName = getDayOfWeek(dateKey + 'T12:00:00')
    const label = `${dayName}, ${new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    result.set(label, byDate.get(dateKey)!)
  }
  return result
}

export default function AccountantArchivePage() {
  const [items, setItems] = useState<ArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingBill, setViewingBill] = useState<Invoice | null>(null)
  const [loadingBill, setLoadingBill] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const deferredQuery = useDeferredValue(searchQuery)

  const loadArchive = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/accountant/archive')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load archive')
      const list = data.items || []
      setItems(list)
      if (list.length > 0) {
        const grouped = groupByDayOfWeek(list)
        const first = Array.from(grouped.keys())[0]
        setOpenSections(new Set([first]))
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load archive')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArchive()
  }, [])

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const handleViewDetails = async (visitId: string) => {
    setLoadingBill(true)
    setViewingBill(null)
    try {
      const res = await fetch(`/api/accountant/bill?visitId=${encodeURIComponent(visitId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load invoice')
      setViewingBill(data.bill)
    } catch (e: any) {
      alert(e?.message || 'Failed to load invoice')
    } finally {
      setLoadingBill(false)
    }
  }

  const filteredItems = useMemo(() => {
    if (!deferredQuery.trim()) return items
    const q = deferredQuery.trim().toLowerCase()
    return items.filter(
      (row) =>
        row.patientName.toLowerCase().includes(q) ||
        row.patientId.toLowerCase().includes(q) ||
        row.visitId.toLowerCase().includes(q) ||
        row.billId?.toLowerCase().includes(q)
    )
  }, [items, deferredQuery])

  const grouped = groupByDayOfWeek(filteredItems)

  return (
    <ProtectedRoute
      allowedRoles={[USER_ROLES.ACCOUNTANT, USER_ROLES.ADMIN]}
      redirectTo="/"
    >
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <main className="flex-1 overflow-auto px-6 pt-6 pb-6">
            {/* Full-width search bar — first thing on the page */}
            <div className="w-full">
              <QRSearchBar
                placeholder="Search Patient Name, ID or scan QR code..."
                onSearch={(value) => setSearchQuery(value)}
                autoFocus={false}
                showHelper={false}
                className="[&_input]:py-4 [&_input]:rounded-xl [&_input]:text-base"
              />
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
              </div>
            ) : error ? (
              <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-400">{error}</div>
            ) : items.length === 0 ? (
              <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-12 text-center text-slate-400">
                No archived visits yet.
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-12 text-center text-slate-400">
                No matches for your search.
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                {Array.from(grouped.entries()).map(([label, rows]) => {
                  const isOpen = openSections.has(label)
                  return (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-600/50 bg-slate-800/40 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(label)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left font-semibold text-slate-200 hover:bg-slate-700/30 transition-colors"
                      >
                        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <span>{label}</span>
                        <span className="text-slate-500 font-normal text-sm">({rows.length})</span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-600/50">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-600/50 bg-slate-900/60">
                                <th className="py-3 px-4 text-slate-400 font-semibold">Time</th>
                                <th className="py-3 px-4 text-slate-400 font-semibold">Patient Name</th>
                                <th className="py-3 px-4 text-slate-400 font-semibold text-right">Total Amount</th>
                                <th className="py-3 px-4 text-slate-400 font-semibold text-right w-36">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => (
                                <tr key={row.visitId} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                                  <td className="py-3 px-4 text-slate-200">
                                    {new Date(row.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="py-3 px-4 font-medium text-primary">{row.patientName}</td>
                                  <td className="py-3 px-4 text-right tabular-nums text-cyan-400 font-semibold">
                                    {Number(row.totalAmount).toLocaleString()} IQD
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleViewDetails(row.visitId)}
                                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium"
                                    >
                                      <Receipt size={14} />
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Receipt modal: same structure as dashboard — max-h flex col, table scroll, Grand Total fixed */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setViewingBill(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MedicalReceipt
              invoice={viewingBill}
              onClose={() => setViewingBill(null)}
              isArchiveView
              className="w-full max-w-2xl"
            />
          </div>
        </div>
      )}

      {loadingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
        </div>
      )}
    </ProtectedRoute>
  )
}
