'use client'

import { useId } from 'react'
import { useBranding } from '@/contexts/BrandingContext'

interface ZionMedLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function ZionMedLogo({ size = 'md', showText = true, className = '' }: ZionMedLogoProps) {
  const { systemName, logoUrl } = useBranding()
  const gid = useId().replace(/:/g, '')

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const imgBox = sizeClasses[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={`${imgBox} shrink-0 rounded-xl object-contain border border-cyan-500/20 bg-slate-900/40`}
        />
      ) : (
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke={`url(#circleGradient-${gid})`}
            strokeWidth="1"
            opacity="0.3"
          />
          <path
            d="M13 13 L27 13 M13 20 L27 20 M13 27 L27 27"
            stroke={`url(#zGradient-${gid})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            className="drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]"
          />
          <g className="drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]">
            <line
              x1="20"
              y1="15"
              x2="20"
              y2="25"
              stroke={`url(#crossGradient-${gid})`}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="20"
              x2="24"
              y2="20"
              stroke={`url(#crossGradient-${gid})`}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          <defs>
            <linearGradient id={`zGradient-${gid}`} x1="13" y1="13" x2="27" y2="27">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
              <stop offset="50%" stopColor="#0891B2" stopOpacity="1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={`crossGradient-${gid}`} x1="16" y1="15" x2="24" y2="25">
              <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={`circleGradient-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {showText && (
        <div className="flex flex-col min-w-0 text-left">
          <span className={`font-semibold text-primary ${textSizeClasses[size]} tracking-tight truncate`}>
            {systemName}
          </span>
          <span className="text-[10px] text-slate-500 -mt-0.5 tracking-wider font-medium">
            Hospital Management
          </span>
        </div>
      )}
    </div>
  )
}
