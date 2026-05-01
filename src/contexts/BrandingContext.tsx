'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { BRANDING_BROADCAST, DEFAULT_SYSTEM_NAME } from '@/lib/brandingConstants'

export { BRANDING_BROADCAST, DEFAULT_SYSTEM_NAME } from '@/lib/brandingConstants'

type BrandingState = {
  systemName: string
  logoUrl: string | null
  loaded: boolean
}

type BrandingContextValue = BrandingState & {
  refreshBranding: () => void
  broadcastBrandingUpdate: () => void
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BrandingState>({
    systemName: DEFAULT_SYSTEM_NAME,
    logoUrl: null,
    loaded: false,
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/system/branding', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as {
        systemName?: string
        logoUrl?: string | null
      }
      if (res.ok && typeof data.systemName === 'string' && data.systemName.trim()) {
        setState({
          systemName: data.systemName.trim(),
          logoUrl: typeof data.logoUrl === 'string' && data.logoUrl.trim() ? data.logoUrl.trim() : null,
          loaded: true,
        })
      } else {
        setState((s) => ({ ...s, loaded: true }))
      }
    } catch {
      setState((s) => ({ ...s, loaded: true }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const bc = new BroadcastChannel(BRANDING_BROADCAST)
    bc.onmessage = () => {
      void load()
    }
    return () => bc.close()
  }, [load])

  const broadcastBrandingUpdate = useCallback(() => {
    try {
      const bc = new BroadcastChannel(BRANDING_BROADCAST)
      bc.postMessage({ type: 'branding-updated' })
      bc.close()
    } catch {
      // ignore
    }
  }, [])

  const refreshBranding = useCallback(() => {
    void load()
    broadcastBrandingUpdate()
  }, [load, broadcastBrandingUpdate])

  const value = useMemo<BrandingContextValue>(
    () => ({
      ...state,
      refreshBranding,
      broadcastBrandingUpdate,
    }),
    [state, refreshBranding, broadcastBrandingUpdate]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider')
  }
  return ctx
}

/** Safe for optional branding (e.g. rare edge); returns defaults if outside provider. */
export function useBrandingOptional(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  return (
    ctx ?? {
      systemName: DEFAULT_SYSTEM_NAME,
      logoUrl: null,
      loaded: false,
      refreshBranding: () => {},
      broadcastBrandingUpdate: () => {},
    }
  )
}
