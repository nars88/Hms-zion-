'use client'

const pulse = 'animate-pulse rounded-lg bg-slate-800/70'

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`${pulse} h-4 ${className}`.trim()} aria-hidden />
}

export function InvoiceListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading invoices">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${pulse} h-16 rounded-xl`} />
      ))}
    </div>
  )
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`rounded-xl border border-slate-800/80 p-5 ${pulse} h-28`} />
      ))}
    </div>
  )
}

export function ChartPanelSkeleton() {
  return <div className={`min-h-[280px] w-full rounded-xl border border-slate-800/80 ${pulse}`} aria-hidden />
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <StatCardSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
      </div>
    </div>
  )
}
