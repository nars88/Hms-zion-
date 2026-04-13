export default function EmergencyLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0B1120]" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400">Loading ER...</p>
      </div>
    </div>
  )
}
