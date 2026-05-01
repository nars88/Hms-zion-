'use client'

interface QuickActionsProps {
  onNewPatient: () => void
  /** Opens dedicated ER quick flow (navigate to /reception/er-quick or admin ER modal). */
  onERQuick?: () => void
}

const actions = [
  { 
    label: 'New Patient', 
    icon: '➕', 
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    textColor: 'text-cyan-400',
    hoverColor: 'hover:bg-cyan-500/15',
  },
  { 
    label: 'ER Quick Reception', 
    icon: '🚨', 
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-400',
    hoverColor: 'hover:bg-rose-500/15',
  },
]

export default function QuickActions({
  onNewPatient,
  onERQuick,
}: QuickActionsProps) {
  const handleAction = (action: typeof actions[0]) => {
    if (action.label === 'New Patient') {
      onNewPatient()
    } else if (action.label === 'ER Quick Reception') {
      onERQuick?.()
    }
  }

  return (
    <div className="flex items-center gap-3">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => handleAction(action)}
          className={`flex-1 ${action.bgColor} ${action.borderColor} ${action.textColor} ${action.hoverColor} border rounded-lg px-5 py-3 flex items-center justify-center gap-2.5 transition-all duration-200`}
        >
          <span className="text-lg">{action.icon}</span>
          <span className="text-sm font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  )
}

