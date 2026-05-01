'use client'

import { useEffect, useRef, useState } from 'react'
import { Palette, Upload, X } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES } from '@/contexts/AuthContext'
import { useBranding } from '@/contexts/BrandingContext'
import { DEFAULT_SYSTEM_NAME } from '@/lib/brandingConstants'

export default function BrandingClientPage() {
  const { refreshBranding, broadcastBrandingUpdate } = useBranding()
  const [systemName, setSystemName] = useState('')
  const [currentLogoPath, setCurrentLogoPath] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/system/branding', { cache: 'no-store' })
        const data = (await res.json().catch(() => ({}))) as {
          systemName?: string
          logoUrl?: string | null
        }
        if (cancelled) return
        setSystemName(typeof data.systemName === 'string' ? data.systemName : DEFAULT_SYSTEM_NAME)
        setCurrentLogoPath(typeof data.logoUrl === 'string' && data.logoUrl.trim() ? data.logoUrl.trim() : null)
      } catch {
        if (!cancelled) {
          setSystemName(DEFAULT_SYSTEM_NAME)
          setCurrentLogoPath(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setPendingPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  const displayPreviewSrc = clearLogo ? null : pendingPreviewUrl || currentLogoPath

  const handleSave = async () => {
    const name = systemName.trim() || DEFAULT_SYSTEM_NAME
    const snapshotFile = pendingFile
    const snapshotClear = clearLogo

    try {
      setSaving(true)
      setError(null)
      setOk(null)

      if (snapshotFile) {
        const fd = new FormData()
        fd.set('file', snapshotFile)
        const up = await fetch('/api/admin/system-settings/logo', {
          method: 'POST',
          body: fd,
        })
        const upData = (await up.json().catch(() => ({}))) as {
          error?: string
          settings?: { logoUrl?: string | null; systemName?: string }
        }
        if (!up.ok) throw new Error(upData.error || 'Logo upload failed')
        setPendingFile(null)
        setClearLogo(false)
        if (typeof upData.settings?.logoUrl === 'string' && upData.settings.logoUrl.trim()) {
          setCurrentLogoPath(upData.settings.logoUrl.trim())
        }
        if (typeof upData.settings?.systemName === 'string') {
          setSystemName(upData.settings.systemName)
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      const patchBody: { systemName: string; clearLogo?: boolean } = { systemName: name }
      if (snapshotClear && !snapshotFile) {
        patchBody.clearLogo = true
      }

      const res = await fetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; settings?: { logoUrl?: string | null } }
      if (!res.ok) throw new Error(data.error || 'Save failed')

      if (typeof data.settings?.logoUrl === 'string' && data.settings.logoUrl.trim()) {
        setCurrentLogoPath(data.settings.logoUrl.trim())
      } else if (patchBody.clearLogo) {
        setCurrentLogoPath(null)
      }

      setOk('Branding saved. Sidebars, login, and the marketing page update automatically (refresh other tabs if needed).')
      refreshBranding()
      broadcastBrandingUpdate()
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} redirectTo="/login">
      <div className="w-full overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
              <Palette className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Branding &amp; Identity</h1>
              <p className="mt-1 text-sm text-slate-400">
                System name and logo appear on the login screen, marketing page, and staff sidebars. Logos are stored under{' '}
                <code className="text-slate-500">public/uploads/branding</code>.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
          {ok ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              {ok}
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">System name</label>
              <input
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                disabled={loading || saving}
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none disabled:opacity-60"
                placeholder={DEFAULT_SYSTEM_NAME}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Logo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                disabled={loading || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setClearLogo(false)
                  setPendingFile(f ?? null)
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={loading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Choose image…
                </button>
                {pendingFile ? (
                  <span className="text-xs text-slate-500 truncate max-w-[200px]" title={pendingFile.name}>
                    {pendingFile.name}
                  </span>
                ) : null}
                {(currentLogoPath || pendingFile) && !clearLogo ? (
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={() => {
                      setPendingFile(null)
                      setClearLogo(true)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Remove logo
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">PNG, JPEG, WebP, GIF, or SVG — max 2.5 MB.</p>
            </div>

            {displayPreviewSrc ? (
              <div className="rounded-lg border border-slate-700/80 bg-slate-950/50 p-4">
                <p className="mb-2 text-xs text-slate-500">Preview</p>
                <img
                  src={displayPreviewSrc}
                  alt=""
                  className="h-16 w-auto max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.3'
                  }}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="h-11 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save branding'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
