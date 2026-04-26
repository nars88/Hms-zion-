import { Activity, BedDouble, ClipboardList, UserPlus } from 'lucide-react'

const METRICS = [
  { label: 'Admitted Patients', value: '0', icon: UserPlus },
  { label: 'Available Beds', value: '0', icon: BedDouble },
  { label: 'Triage Status', value: 'Stable', icon: Activity },
  { label: 'Recent Admissions', value: '0', icon: ClipboardList },
]

export default function AdminEmergencyPage() {
  return (
    <div className="min-h-full bg-slate-950">
      <main className="p-8">
        <h1 className="text-2xl font-bold text-white">Emergency Department Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Dedicated emergency overview for admin routing.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.label}
                className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                  <Icon size={18} />
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{item.value}</p>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
