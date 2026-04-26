'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] h-0.5 bg-cyan-500/20">
      <div
        className="h-full bg-cyan-400 animate-pulse"
        style={{
          width: '100%',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}
