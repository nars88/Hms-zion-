'use client'

import { AlertCircle, Calendar, TrendingDown } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'

export default function InventoryAlerts() {
  const { getLowStockMedicines, getExpiringMedicines } = useInventory()
  
  const lowStockMedicines = getLowStockMedicines()
  const expiringMedicines = getExpiringMedicines(3) // Next 3 months

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <TrendingDown size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Low Stock Alerts</h2>
              <p className="text-xs text-secondary mt-0.5">
                Medicines below minimum stock threshold
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {lowStockMedicines.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3 opacity-20">✅</div>
              <p className="text-sm text-secondary">All medicines are well stocked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} className="text-rose-400" />
                        <p className="text-sm font-semibold text-primary">{medicine.name}</p>
                      </div>
                      <div className="space-y-1 text-xs text-secondary ml-6">
                        <p>
                          Current Stock: <span className="text-rose-400 font-semibold">{medicine.currentStock}</span>{' '}
                          {medicine.unit}
                        </p>
                        <p>
                          Minimum Required: <span className="text-amber-400">{medicine.minimumStock}</span>{' '}
                          {medicine.unit}
                        </p>
                        {medicine.scientificName && (
                          <p className="text-slate-600">Scientific: {medicine.scientificName}</p>
                        )}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded text-xs font-medium text-rose-400">
                      {medicine.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expiry Alerts */}
      <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Calendar size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Expiry Alerts</h2>
              <p className="text-xs text-secondary mt-0.5">
                Medicines expiring within the next 3 months
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {expiringMedicines.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3 opacity-20">✅</div>
              <p className="text-sm text-secondary">No medicines expiring soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringMedicines.map((medicine) => {
                const expiryDate = new Date(medicine.expiryDate!)
                const daysUntilExpiry = Math.ceil(
                  (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <div
                    key={medicine.id}
                    className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar size={16} className="text-amber-400" />
                          <p className="text-sm font-semibold text-primary">{medicine.name}</p>
                        </div>
                        <div className="space-y-1 text-xs text-secondary ml-6">
                          <p>
                            Expiry Date:{' '}
                            <span className="text-amber-400 font-semibold">
                              {expiryDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </p>
                          <p>
                            Days Remaining: <span className="text-amber-400 font-semibold">{daysUntilExpiry}</span> days
                          </p>
                          <p>
                            Current Stock: <span className="text-primary">{medicine.currentStock}</span>{' '}
                            {medicine.unit}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs font-medium text-amber-400">
                        Expiring Soon
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

