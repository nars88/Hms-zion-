'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  ClipboardList,
  Package,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'

const STORAGE_KEY = 'inventory'

interface InventoryDrug {
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

function loadInventory(): InventoryDrug[] {
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

function isNearExpiry(expiryDate: string | null, withinDays = 90): boolean {
  if (!expiryDate) return false
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp < now) return false
  const limit = new Date(now)
  limit.setDate(limit.getDate() + withinDays)
  return exp <= limit
}

/** Mock: latest sales for Recent Transactions */
const MOCK_TRANSACTIONS = [
  { id: '1', time: '14:32', patient: 'Ahmed Hassan', totalAmount: 45000, status: 'Dispensed' },
  { id: '2', time: '14:18', patient: 'Sara Mohammed', totalAmount: 28500, status: 'Dispensed' },
  { id: '3', time: '13:55', patient: 'Omar Khalid', totalAmount: 62000, status: 'Pending' },
  { id: '4', time: '13:40', patient: 'Layla Ibrahim', totalAmount: 15000, status: 'Dispensed' },
  { id: '5', time: '13:22', patient: 'Fatima Ali', totalAmount: 38000, status: 'Dispensed' },
]

export default function PharmacyManagerDashboard() {
  const [inventory, setInventory] = useState<InventoryDrug[]>([])

  useEffect(() => {
    setInventory(loadInventory())
    const onStorage = () => setInventory(loadInventory())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const stats = useMemo(() => {
    const totalItems = inventory.length
    const lowStockCount = inventory.filter((d) => d.currentStock < 10).length
    const nearExpiryCount = inventory.filter((d) => isNearExpiry(d.expiryDate, 90)).length
    return {
      totalSalesToday: 1247500,
      pendingOrders: 7,
      lowStockItems: lowStockCount,
      nearExpiry: nearExpiryCount,
      totalItems,
    }
  }, [inventory])

  const lowStockDrugs = useMemo(
    () =>
      inventory
        .filter((d) => d.currentStock < 10)
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 10),
    [inventory]
  )

  const cards = [
    {
      key: 'sales',
      label: 'Total Sales Today',
      value: `${(stats.totalSalesToday / 1000).toFixed(0)}K IQD`,
      icon: DollarSign,
      iconBg: 'bg-emerald-500/25',
      iconColor: 'text-emerald-400',
    },
    {
      key: 'pending',
      label: 'Pending Orders',
      value: String(stats.pendingOrders),
      icon: ClipboardList,
      iconBg: 'bg-amber-500/25',
      iconColor: 'text-amber-400',
    },
    {
      key: 'lowStock',
      label: 'Low Stock Items',
      value: String(stats.lowStockItems),
      sub: `${stats.totalItems} total items`,
      icon: Package,
      iconBg: 'bg-rose-500/25',
      iconColor: 'text-rose-400',
    },
    {
      key: 'nearExpiry',
      label: 'Near Expiry (3 mo)',
      value: String(stats.nearExpiry),
      icon: CalendarClock,
      iconBg: 'bg-violet-500/25',
      iconColor: 'text-violet-400',
    },
  ]

  return (
    <div className="h-full overflow-auto bg-[#0B1120] flex flex-col">
      <div className="flex-1 w-full min-w-0 p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Top: 4 Summary Cards – full width, spread across */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.key}
                className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 md:p-4 flex items-start gap-2.5 md:gap-3 shadow-sm"
              >
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-lg md:text-xl font-bold text-slate-100 mt-0.5">{card.value}</p>
                  {card.sub && <p className="text-[11px] text-slate-500 mt-0.5">{card.sub}</p>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Transactions (left) | Stock Alerts (right) – full width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 flex-1 min-h-0">
          {/* Recent Transactions */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="p-3 md:p-4 border-b border-slate-700/50 flex items-center gap-2 flex-shrink-0">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[200px]">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Patient</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {MOCK_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-slate-300">{tx.time}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-100">{tx.patient}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-300">{tx.totalAmount.toLocaleString()} IQD</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            tx.status === 'Dispensed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="p-3 md:p-4 border-b border-slate-700/50 flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-slate-200">Stock Alerts</h2>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[200px]">
              {lowStockDrugs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">No low-stock items.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Drug</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Qty</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Threshold</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {lowStockDrugs.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-100">{d.drugName}</td>
                        <td className="px-4 py-2.5 text-sm text-rose-300">{d.currentStock}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400">{d.minThreshold}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400">{d.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
