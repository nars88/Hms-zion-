'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ERRegistrationModalProps {
  onClose: () => void
  onRegister: (data: { fullName: string; age: number; phone?: string }) => void
}

export default function ERRegistrationModal({ onClose, onRegister }: ERRegistrationModalProps) {
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = fullName.trim()
    const ageNum = Number(age)
    if (!trimmed || !Number.isFinite(ageNum) || ageNum <= 0) {
      alert('Enter Full Name and Age.')
      return
    }
    onRegister({ fullName: trimmed, age: ageNum, phone: phone.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/25 bg-[#0b1220] shadow-[0_0_70px_rgba(244,63,94,0.16)]">
        <div className="flex items-center justify-between border-b border-rose-500/15 bg-rose-500/10 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-rose-400" size={22} />
            <div>
              <h2 className="text-base font-bold text-primary">ER Registration</h2>
              <p className="text-xs text-secondary">Fast emergency check-in</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">Full Name</label>
            <input
              ref={nameRef}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Emily Brown"
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Age</label>
              <input
                type="number"
                min={0}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="34"
                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xxxxxxxxx"
                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-2xl border border-rose-400/35 bg-gradient-to-br from-rose-500/30 to-rose-600/10 px-6 py-3.5 text-sm font-extrabold tracking-wide text-rose-100 shadow-[0_0_34px_rgba(244,63,94,0.26)] transition-all hover:shadow-[0_0_46px_rgba(244,63,94,0.36)]"
          >
            REGISTER EMERGENCY
          </button>
        </form>
      </div>
    </div>
  )
}

