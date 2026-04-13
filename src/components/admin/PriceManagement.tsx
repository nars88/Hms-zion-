'use client'

import { useState, useEffect } from 'react'
import { Save, DollarSign, Stethoscope, Scan, Activity, Loader2, FlaskConical } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface PriceSetting {
  id?: string
  serviceType: string
  serviceName: string
  category: 'Consultation' | 'Radiology' | 'Sonar' | 'Laboratory'
  price: number
  isActive: boolean
}

const DEFAULT_PRICES: PriceSetting[] = [
  // Consultation Fees
  { serviceType: 'consultation_general', serviceName: 'General Consultation', category: 'Consultation', price: 50000, isActive: true },
  { serviceType: 'consultation_specialist', serviceName: 'Specialist Consultation', category: 'Consultation', price: 75000, isActive: true },
  { serviceType: 'consultation_er', serviceName: 'ER Consultation', category: 'Consultation', price: 75000, isActive: true },
  
  // Radiology
  { serviceType: 'xray_chest', serviceName: 'Chest X-Ray', category: 'Radiology', price: 50000, isActive: true },
  { serviceType: 'xray_limb', serviceName: 'Limb X-Ray', category: 'Radiology', price: 30000, isActive: true },
  { serviceType: 'xray_spine', serviceName: 'Spine X-Ray', category: 'Radiology', price: 40000, isActive: true },
  { serviceType: 'ct_scan', serviceName: 'CT Scan', category: 'Radiology', price: 150000, isActive: true },
  { serviceType: 'mri', serviceName: 'MRI', category: 'Radiology', price: 200000, isActive: true },
  
  // Sonar/Ultrasound
  { serviceType: 'ultrasound_abdominal', serviceName: 'Abdominal Ultrasound', category: 'Sonar', price: 60000, isActive: true },
  { serviceType: 'ultrasound_pelvic', serviceName: 'Pelvic Ultrasound', category: 'Sonar', price: 60000, isActive: true },
  { serviceType: 'ultrasound_cardiac', serviceName: 'Cardiac Ultrasound (Echo)', category: 'Sonar', price: 80000, isActive: true },
  
  // Laboratory Tests
  { serviceType: 'lab_cbc', serviceName: 'Complete Blood Count (CBC)', category: 'Laboratory', price: 25000, isActive: true },
  { serviceType: 'lab_glucose', serviceName: 'Blood Glucose', category: 'Laboratory', price: 15000, isActive: true },
  { serviceType: 'lab_urea', serviceName: 'Urea Test', category: 'Laboratory', price: 15000, isActive: true },
  { serviceType: 'lab_creatinine', serviceName: 'Creatinine Test', category: 'Laboratory', price: 15000, isActive: true },
  { serviceType: 'lab_lipid', serviceName: 'Lipid Profile', category: 'Laboratory', price: 30000, isActive: true },
  { serviceType: 'lab_liver', serviceName: 'Liver Function Test', category: 'Laboratory', price: 35000, isActive: true },
  { serviceType: 'lab_thyroid', serviceName: 'Thyroid Function Test', category: 'Laboratory', price: 40000, isActive: true },
  { serviceType: 'lab_general', serviceName: 'General Lab Test', category: 'Laboratory', price: 20000, isActive: true },
]

export default function PriceManagement() {
  const { user } = useAuth()
  const [prices, setPrices] = useState<PriceSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadPrices()
  }, [])

  const loadPrices = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/prices')
      if (!res.ok) throw new Error('Failed to load prices')

      const data = await res.json()
      if (data.prices && data.prices.length > 0) {
        setPrices(data.prices.map((p: any) => ({
          ...p,
          price: Number(p.price),
        })))
      } else {
        // Initialize with default prices if none exist
        setPrices(DEFAULT_PRICES)
      }
    } catch (error: any) {
      console.error('Error loading prices:', error)
      // Fallback to default prices
      setPrices(DEFAULT_PRICES)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePriceChange = (serviceType: string, newPrice: number) => {
    setPrices((prev) =>
      prev.map((p) =>
        p.serviceType === serviceType ? { ...p, price: newPrice } : p
      )
    )
  }

  const handleSave = async () => {
    if (!user) {
      alert('You must be logged in to save prices')
      return
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {
      // Save all prices
      const savePromises = prices.map((price) =>
        fetch('/api/admin/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...price,
            updatedBy: user.id,
          }),
        })
      )

      const results = await Promise.all(savePromises)
      const failed = results.filter((r) => !r.ok)

      if (failed.length > 0) {
        throw new Error('Some prices failed to save')
      }

      setSaveStatus({
        type: 'success',
        message: '✅ All prices saved successfully!',
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error: any) {
      console.error('Error saving prices:', error)
      setSaveStatus({
        type: 'error',
        message: `❌ Failed to save prices: ${error.message}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const groupedPrices: {
    Consultation: PriceSetting[]
    Radiology: PriceSetting[]
    Sonar: PriceSetting[]
    Laboratory: PriceSetting[]
  } = {
    Consultation: prices.filter((p) => p.category === 'Consultation'),
    Radiology: prices.filter((p) => p.category === 'Radiology'),
    Sonar: prices.filter((p) => p.category === 'Sonar'),
    Laboratory: prices.filter((p) => p.category === 'Laboratory'),
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
            <DollarSign size={28} className="text-cyan-400" />
            Price Management
          </h2>
          <p className="text-sm text-secondary mt-1">
            Set global prices for all services. These prices are used automatically when services are ordered.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Save All Prices</span>
            </>
          )}
        </button>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl border-2 ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <p className="font-semibold">{saveStatus.message}</p>
        </div>
      )}

      {/* Price Categories */}
      <div className="space-y-6">
        {/* Consultation Fees */}
        <div className="glass rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Stethoscope size={24} className="text-emerald-400" />
            <h3 className="text-xl font-bold text-primary">Consultation Fees</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedPrices.Consultation.map((price) => (
              <div
                key={price.serviceType}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4"
              >
                <label className="block text-sm font-semibold text-primary mb-2">
                  {price.serviceName}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={price.price}
                    onChange={(e) =>
                      handlePriceChange(price.serviceType, parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="1000"
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                  <span className="text-sm text-secondary font-medium">IQD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radiology */}
        <div className="glass rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Scan size={24} className="text-blue-400" />
            <h3 className="text-xl font-bold text-primary">Radiology Services</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedPrices.Radiology.map((price) => (
              <div
                key={price.serviceType}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4"
              >
                <label className="block text-sm font-semibold text-primary mb-2">
                  {price.serviceName}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={price.price}
                    onChange={(e) =>
                      handlePriceChange(price.serviceType, parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="1000"
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                  <span className="text-sm text-secondary font-medium">IQD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sonar/Ultrasound */}
        <div className="glass rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity size={24} className="text-purple-400" />
            <h3 className="text-xl font-bold text-primary">Sonar / Ultrasound</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedPrices.Sonar.map((price) => (
              <div
                key={price.serviceType}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4"
              >
                <label className="block text-sm font-semibold text-primary mb-2">
                  {price.serviceName}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={price.price}
                    onChange={(e) =>
                      handlePriceChange(price.serviceType, parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="1000"
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                  <span className="text-sm text-secondary font-medium">IQD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Laboratory Tests */}
        <div className="glass rounded-2xl border border-slate-800/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FlaskConical size={24} className="text-amber-400" />
            <h3 className="text-xl font-bold text-primary">Laboratory Tests</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedPrices.Laboratory.map((price: PriceSetting) => (
              <div
                key={price.serviceType}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4"
              >
                <label className="block text-sm font-semibold text-primary mb-2">
                  {price.serviceName}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={price.price}
                    onChange={(e) =>
                      handlePriceChange(price.serviceType, parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="1000"
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                  <span className="text-sm text-secondary font-medium">IQD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-xl p-4">
        <p className="text-sm text-cyan-300">
          <strong>Note:</strong> Price changes only affect new invoices. Existing invoices that are already paid or pending will not be affected.
        </p>
      </div>
    </div>
  )
}

