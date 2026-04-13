'use client'

import { type ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  className?: string
  children?: ReactNode
}

const defaultTitle = 'All caught up!'
const defaultDescription = 'No items to show right now.'

export function EmptyState({
  icon: Icon = Inbox,
  title = defaultTitle,
  description = defaultDescription,
  className = '',
  children,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      <Icon className="h-12 w-12 text-slate-500/60 mb-3" aria-hidden />
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
