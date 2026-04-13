'use client'

import { useState } from 'react'
import { Plus, CheckCircle } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'
import { useAuth } from '@/contexts/AuthContext'

export default function StockEntry() {
  const { addMedicine, addStockMovement } = useInventory()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    scientificName: '',
    commercialName: '',
    currentStock: '',
    minimumStock: '10',
    expiryDate: '',
    unit: 'boxes',
    price: '',
    category: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const newMedicine = addMedicine({
      name: formData.name,
      scientificName: formData.scientificName || undefined,
      commercialName: formData.commercialName || undefined,
      currentStock: parseInt(formData.currentStock) || 0,
      minimumStock: parseInt(formData.minimumStock) || 10,
      expiryDate: formData.expiryDate || undefined,
      unit: formData.unit,
      price: parseFloat(formData.price) || 0,
      category: formData.category || undefined,
    })

    // Record stock movement
    if (parseInt(formData.currentStock) > 0) {
      addStockMovement({
        medicineId: newMedicine.id,
        medicineName: newMedicine.name,
        type: 'In',
        quantity: parseInt(formData.currentStock),
        reason: 'Initial stock entry',
        performedBy: user?.id || 'system',
      })
    }

    setIsSubmitting(false)
    
    // Reset form
    setFormData({
      name: '',
      scientificName: '',
      commercialName: '',
      currentStock: '',
      minimumStock: '10',
      expiryDate: '',
      unit: 'boxes',
      price: '',
      category: '',
    })

    alert('Medicine added to inventory successfully!')
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
          <Plus size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary">Stock Entry</h2>
          <p className="text-xs text-secondary mt-0.5">Add new medicine to inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Medicine Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="e.g., Paracetamol"
            />
          </div>

          {/* Scientific Name */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Scientific Name
            </label>
            <input
              type="text"
              value={formData.scientificName}
              onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="e.g., Acetaminophen"
            />
          </div>

          {/* Commercial Name */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Commercial Name
            </label>
            <input
              type="text"
              value={formData.commercialName}
              onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="e.g., Panadol"
            />
          </div>

          {/* Current Stock */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Current Stock *
            </label>
            <input
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
              required
              min="0"
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="0"
            />
          </div>

          {/* Minimum Stock */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Minimum Stock (Alert Threshold) *
            </label>
            <input
              type="number"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              required
              min="0"
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="10"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Unit *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            >
              <option value="boxes">Boxes</option>
              <option value="bottles">Bottles</option>
              <option value="strips">Strips</option>
              <option value="units">Units</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Price per Unit (IQD) *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="e.g., Antibiotics, Pain Relief"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/50">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg font-semibold hover:bg-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Add to Inventory</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

