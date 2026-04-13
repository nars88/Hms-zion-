'use client'

import { useState, useMemo } from 'react'
import { Search, AlertCircle, Calendar } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'

export default function InventoryList() {
  const { medicines } = useInventory()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return medicines

    const query = searchQuery.toLowerCase()
    return medicines.filter(
      (med) =>
        med.name.toLowerCase().includes(query) ||
        med.scientificName?.toLowerCase().includes(query) ||
        med.commercialName?.toLowerCase().includes(query) ||
        med.category?.toLowerCase().includes(query)
    )
  }, [medicines, searchQuery])

  const getStockStatus = (medicine: any) => {
    if (medicine.currentStock === 0) {
      return { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Out of Stock' }
    }
    if (medicine.currentStock <= medicine.minimumStock) {
      return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Low Stock' }
    }
    return { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'In Stock' }
  }

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
    return expiry <= threeMonthsFromNow && expiry >= new Date()
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="glass rounded-xl border border-slate-800/50 p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, scientific name, or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      {/* Medicines List */}
      <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-lg font-semibold text-primary">Inventory List</h2>
          <p className="text-xs text-secondary mt-1">{filteredMedicines.length} medicine(s) found</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/30 border-b border-slate-800/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Medicine Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                  Expiry Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm text-secondary">No medicines found</p>
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((medicine) => {
                  const stockStatus = getStockStatus(medicine)
                  const expiring = isExpiringSoon(medicine.expiryDate)

                  return (
                    <tr key={medicine.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-primary">{medicine.name}</p>
                          {medicine.scientificName && (
                            <p className="text-xs text-secondary mt-0.5">{medicine.scientificName}</p>
                          )}
                          {medicine.commercialName && (
                            <p className="text-xs text-slate-600 mt-0.5">({medicine.commercialName})</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              medicine.currentStock <= medicine.minimumStock
                                ? 'text-rose-400'
                                : 'text-primary'
                            }`}
                          >
                            {medicine.currentStock} {medicine.unit}
                          </span>
                          {medicine.currentStock <= medicine.minimumStock && (
                            <AlertCircle size={14} className="text-rose-400" />
                          )}
                        </div>
                        <p className="text-xs text-secondary mt-0.5">
                          Min: {medicine.minimumStock} {medicine.unit}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-primary">
                          {medicine.price.toLocaleString('en-US')} IQD
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {medicine.expiryDate ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${
                                expiring ? 'text-amber-400 font-semibold' : 'text-secondary'
                              }`}
                            >
                              {new Date(medicine.expiryDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {expiring && <Calendar size={14} className="text-amber-400" />}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">N/A</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

