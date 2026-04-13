'use client'

import { Clock, Stethoscope, Calendar, DollarSign } from 'lucide-react'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'

interface StatsCardsProps {
  onWaitingPatientsClick?: () => void
}

export default function StatsCards({ onWaitingPatientsClick }: StatsCardsProps) {
  const { waitingPatients } = useWaitingList()
  const { invoices } = useCentralizedBilling()

  // Calculate real-time stats with safe checks
  const waitingCount = Array.isArray(waitingPatients) 
    ? waitingPatients.filter(p => p && p.status === 'Waiting').length 
    : 0
  
  const inConsultationCount = Array.isArray(waitingPatients) 
    ? waitingPatients.filter(p => p && p.status === 'In_Consultation').length 
    : 0
  
  const todayVisits = Array.isArray(waitingPatients) ? waitingPatients.length : 0
  
  const pendingBills = Array.isArray(invoices) 
    ? invoices.filter(inv => inv && inv.status === 'Pending').length 
    : 0

  const stats = [
    {
      title: 'Waiting Patients',
      value: waitingCount,
      icon: Clock,
      bgColor: 'bg-slate-900/50',
      borderColor: 'border-slate-700',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      numberColor: 'text-cyan-400',
    },
    {
      title: 'In Consultation',
      value: inConsultationCount,
      icon: Stethoscope,
      bgColor: 'bg-slate-900/50',
      borderColor: 'border-slate-700',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      numberColor: 'text-emerald-400',
    },
    {
      title: 'Today\'s Visits',
      value: todayVisits,
      icon: Calendar,
      bgColor: 'bg-slate-900/50',
      borderColor: 'border-slate-700',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      numberColor: 'text-amber-400',
    },
    {
      title: 'Pending Bills',
      value: pendingBills,
      icon: DollarSign,
      bgColor: 'bg-slate-900/50',
      borderColor: 'border-rose-500/50',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400',
      numberColor: 'text-rose-400',
      glow: true, // Special glow for priority
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isWaitingCard = stat.title === 'Waiting Patients'
        const Component = isWaitingCard && onWaitingPatientsClick ? 'button' : 'div'
        
        return (
          <Component
            key={index}
            onClick={isWaitingCard && onWaitingPatientsClick ? onWaitingPatientsClick : undefined}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:border-opacity-70 ${
              stat.glow ? 'shadow-lg shadow-rose-500/10' : ''
            } ${isWaitingCard && onWaitingPatientsClick ? 'cursor-pointer hover:bg-slate-800/30 active:scale-[0.98]' : ''}`}
          >
            {/* Icon in corner */}
            <div className={`absolute top-4 right-4 ${stat.iconBg} p-2.5 rounded-lg`}>
              <Icon size={20} className={stat.iconColor} />
            </div>

            {/* Large Number */}
            <div className="mb-2">
              <p className={`text-4xl font-bold ${stat.numberColor}`}>
                {stat.value}
              </p>
            </div>

            {/* Label */}
            <p className="text-sm font-medium text-slate-300 mt-1">
              {stat.title}
            </p>

            {/* Subtle glow effect for Pending Bills */}
            {stat.glow && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            )}
          </Component>
        )
      })}
    </div>
  )
}
