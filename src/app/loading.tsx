export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[var(--bg-primary)]" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  )
}
