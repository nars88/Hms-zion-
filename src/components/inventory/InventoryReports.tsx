'use client'

import { useMemo } from 'react'
import { TrendingUp, Package, DollarSign } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'

export default function InventoryReports() {
  const { medicines, stockMovements } = useInventory()

  const reports = useMemo(() => {
    // Most sold medicines (by stock movements - Out type)
    const outMovements = stockMovements.filter((mov) => mov.type === 'Out')
    const medicineSales: Record<string, { name: string; quantity: number }> = {}

    outMovements.forEach((mov) => {
      if (!medicineSales[mov.medicineId]) {
        medicineSales[mov.medicineId] = { name: mov.medicineName, quantity: 0 }
      }
      medicineSales[mov.medicineId].quantity += mov.quantity
    })

    const mostSold = Object.values(medicineSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Most consumed (by total quantity moved out)
    const mostConsumed = Object.values(medicineSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Total inventory value
    const totalValue = medicines.reduce((sum, med) => sum + med.currentStock * med.price, 0)

    // Low stock count
    const lowStockCount = medicines.filter((med) => med.currentStock <= med.minimumStock).length

    // Expiring soon count
    const now = new Date()
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(now.getMonth() + 3)
    const expiringCount = medicines.filter((med) => {
      if (!med.expiryDate) return false
      const expiry = new Date(med.expiryDate)
      return expiry <= threeMonthsFromNow && expiry >= now
    }).length

    return {
      mostSold,
      mostConsumed,
      totalValue,
      lowStockCount,
      expiringCount,
      totalMedicines: medicines.length,
    }
  }, [medicines, stockMovements])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package size={24} className="text-cyan-400" />
            <span className="text-xs text-secondary">Total Medicines</span>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{reports.totalMedicines}</p>
        </div>

        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign size={24} className="text-emerald-400" />
            <span className="text-xs text-secondary">Total Inventory Value</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {reports.totalValue.toLocaleString('en-US')} IQD
          </p>
        </div>

        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={24} className="text-amber-400" />
            <span className="text-xs text-secondary">Low Stock Items</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{reports.lowStockCount}</p>
        </div>

        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package size={24} className="text-rose-400" />
            <span className="text-xs text-secondary">Expiring Soon</span>
          </div>
          <p className="text-3xl font-bold text-rose-400">{reports.expiringCount}</p>
        </div>
      </div>

      {/* Most Sold Medicines */}
      <div className="glass rounded-xl border border-slate-800/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={20} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-primary">Most Sold Medicines</h2>
        </div>
        <div className="space-y-3">
          {reports.mostSold.length === 0 ? (
            <p className="text-sm text-secondary text-center py-8">No sales data available</p>
          ) : (
            reports.mostSold.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-semibold text-cyan-400">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium text-primary">{item.name}</p>
                </div>
                <p className="text-sm font-semibold text-cyan-400">{item.quantity} units sold</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Most Consumed Medicines */}
      <div className="glass rounded-xl border border-slate-800/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-primary">Most Consumed Medicines</h2>
        </div>
        <div className="space-y-3">
          {reports.mostConsumed.length === 0 ? (
            <p className="text-sm text-secondary text-center py-8">No consumption data available</p>
          ) : (
            reports.mostConsumed.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-semibold text-amber-400">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium text-primary">{item.name}</p>
                </div>
                <p className="text-sm font-semibold text-amber-400">{item.quantity} units consumed</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

