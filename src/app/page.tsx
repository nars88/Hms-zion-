'use client'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Mail,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { useBranding } from '@/contexts/BrandingContext'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
]

export default function LandingPage() {
  const { systemName, logoUrl } = useBranding()

  return (
    <div className="min-h-screen bg-primary text-primary overflow-x-hidden">
      {/* Ambient page glows — single compound radial-gradient layer (no CSS blur,
          gradient is already soft). Replaces the previous 3× blur-[140px] + masked
          grid which were the main culprit of first-paint lag. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(600px 480px at 50% -10%, rgba(34,211,238,0.10), transparent 70%), radial-gradient(520px 420px at 95% 28%, rgba(217,70,239,0.09), transparent 70%), radial-gradient(500px 420px at 0% 60%, rgba(99,102,241,0.09), transparent 70%)',
        }}
      />

      {/* ============================= NAVBAR ============================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#04070F]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 shadow-[inset_0_0_12px_rgba(34,211,238,0.35)]">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-black text-cyan-300">
                  {(systemName || 'Z').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="leading-none">
              <p className="text-base font-black tracking-tight text-white">{systemName}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Hospital Intelligence</p>
            </div>
          </Link>

          {/* Center links */}
          <div className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-2 py-1.5 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-full px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Contact Us
            </a>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 px-5 py-2.5 text-sm font-bold text-[#04070F] shadow-[0_0_0_1px_rgba(255,255,255,0.25)_inset,0_10px_30px_-12px_rgba(34,211,238,0.7)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset,0_18px_40px_-12px_rgba(34,211,238,0.9)]"
            >
              Get Started
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================= HERO ============================= */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          {/* Left: headline */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-300">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              Built for modern hospitals
            </div>

            <h1 className="mt-6 text-6xl font-black leading-[1.05] tracking-[-0.02em] text-white sm:text-7xl lg:text-[80px]">
              Run your Hospital with{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                  Clinical Precision.
                </span>
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[2px] w-full bg-gradient-to-r from-cyan-400/80 via-fuchsia-400/60 to-transparent"
                />
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-400">
              {systemName} unifies triage, diagnostics, pharmacy, billing, and secure discharge into one
              command center — purpose-built for modern hospital operations.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-base font-bold text-[#04070F] shadow-[0_12px_32px_-12px_rgba(255,255,255,0.45)] transition-all hover:shadow-[0_18px_42px_-12px_rgba(255,255,255,0.6)]"
              >
                Book a Call
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#04070F] text-white transition-transform group-hover:translate-x-0.5">
                  <ArrowUpRight size={14} />
                </span>
              </a>
              <a
                href="#system-preview"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-8 py-4 text-base font-semibold text-white transition-all hover:border-white/30 hover:bg-white/[0.07]"
              >
                See Demo
              </a>
            </div>

            {/* Mini trust row */}
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan-300" /> HIPAA-grade access controls
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-300" /> Real-time queue sync
              </div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-fuchsia-300" /> Full audit trail
              </div>
            </div>
          </div>

          {/* Right: Hologram orb */}
          <div className="relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[520px]">
            {/* Far glow — pure radial-gradient (no CSS blur, much cheaper to paint) */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 50%, rgba(168,85,247,0.35) 0%, rgba(34,211,238,0.22) 40%, transparent 72%)',
              }}
            />
            {/* Orbit rings */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 will-change-transform"
              style={{ animation: 'zion-spin-slow 28s linear infinite' }}
            >
              <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1 rounded-full bg-cyan-300 shadow-[0_0_18px_4px_rgba(34,211,238,0.8)]" />
            </div>
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/10 will-change-transform"
              style={{ animation: 'zion-spin-slow-rev 22s linear infinite' }}
            >
              <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_4px_rgba(232,121,249,0.75)]" />
            </div>

            {/* Core sphere */}
            <div
              className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 will-change-transform"
              style={{
                background:
                  'radial-gradient(120% 120% at 30% 25%, rgba(103,232,249,0.45) 0%, rgba(168,85,247,0.35) 38%, rgba(232,121,249,0.28) 65%, rgba(8,8,32,0.85) 100%)',
                boxShadow:
                  '0 0 80px 20px rgba(168,85,247,0.28), inset 0 0 60px rgba(34,211,238,0.25), inset 0 0 120px rgba(232,121,249,0.18)',
                animation: 'zion-float 6s ease-in-out infinite',
              }}
            >
              {/* Specular highlight */}
              <div
                aria-hidden
                className="absolute left-[22%] top-[18%] h-16 w-24 rounded-full bg-white/40 blur-2xl"
              />
              {/* Latitude lines */}
              <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-60">
                <defs>
                  <linearGradient id="zionLat" x1="0" x2="1">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity="0" />
                    <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="zionPulseGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <ellipse cx="100" cy="100" rx="90" ry="30" fill="none" stroke="url(#zionLat)" strokeWidth="0.6" />
                <ellipse cx="100" cy="100" rx="90" ry="60" fill="none" stroke="url(#zionLat)" strokeWidth="0.6" />
                <ellipse cx="100" cy="100" rx="90" ry="88" fill="none" stroke="url(#zionLat)" strokeWidth="0.6" />
                <line x1="10" y1="100" x2="190" y2="100" stroke="url(#zionLat)" strokeWidth="0.6" />
                {/* ECG pulse */}
                <path
                  d="M20 110 L60 110 L70 85 L85 140 L100 60 L115 140 L130 110 L180 110"
                  fill="none"
                  stroke="url(#zionPulseGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="220"
                  strokeDashoffset="0"
                  style={{ animation: 'zion-pulse-dash 2.6s linear infinite', filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.7))' }}
                />
              </svg>
            </div>

            {/* Floating particles — static (opacity baked in) to avoid 4 concurrent
                infinite animations that each spawn a composite layer. */}
            <span aria-hidden className="absolute left-[18%] top-[20%] h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
            <span aria-hidden className="absolute right-[14%] top-[34%] h-1 w-1 rounded-full bg-fuchsia-300/80" />
            <span aria-hidden className="absolute left-[26%] bottom-[18%] h-1 w-1 rounded-full bg-white/70" />
            <span aria-hidden className="absolute right-[20%] bottom-[26%] h-1.5 w-1.5 rounded-full bg-indigo-300/80" />

            {/* Floating chips */}
            <div
              aria-hidden
              className="absolute left-0 top-[22%] hidden items-center gap-2 rounded-xl border border-white/10 bg-[#0a1122]/90 px-3 py-2 sm:flex"
              style={{ animation: 'zion-float 7s ease-in-out infinite' }}
            >
              <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-emerald-300">
                <Activity size={12} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold text-white">ER · Bed 04</p>
                <p className="text-[9px] text-slate-400">Vitals stable</p>
              </div>
            </div>
            <div
              aria-hidden
              className="absolute right-0 bottom-[18%] hidden items-center gap-2 rounded-xl border border-white/10 bg-[#0a1122]/90 px-3 py-2 sm:flex"
              style={{ animation: 'zion-float 9s ease-in-out infinite' }}
            >
              <div className="grid h-6 w-6 place-items-center rounded-md bg-cyan-500/20 text-cyan-300">
                <Stethoscope size={12} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold text-white">Dr. Sarah</p>
                <p className="text-[9px] text-slate-400">Consulting now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= 3-STEP ROW ============================= */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              step: 'Step 1',
              title: 'Onboard Your Facility',
              copy: 'Register departments, staff, and services in minutes.',
              glow: 'rgba(34,211,238,0.22)',
              Icon: Users,
              dot: 'bg-cyan-300',
            },
            {
              step: 'Step 2',
              title: 'Tune Your Workflow',
              copy: 'Configure triage, pricing, and role-based access.',
              glow: 'rgba(217,70,239,0.22)',
              Icon: Sparkles,
              dot: 'bg-fuchsia-300',
            },
            {
              step: 'Step 3',
              title: 'Go Live & Scale',
              copy: 'Launch secure operations with real-time visibility.',
              glow: 'rgba(16,185,129,0.22)',
              Icon: Zap,
              dot: 'bg-emerald-300',
            },
          ].map(({ step, title, copy, glow, Icon, dot }) => (
            <div
              key={step}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full"
                style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
              />
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {step}
              </div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">{title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-400">{copy}</p>

              {/* Preview panel */}
              <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-white/10" />
                    <div className="h-2 w-1/2 rounded bg-white/5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 pb-4">
                  <div className="h-6 flex-1 rounded-md bg-white/[0.04]" />
                  <div className="h-6 w-16 rounded-md bg-gradient-to-r from-cyan-400/80 to-cyan-300/60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================= STATS ============================= */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 text-center sm:grid-cols-4">
          {[
            { value: '12+', label: 'Departments' },
            { value: '99.9%', label: 'Uptime' },
            { value: 'Real-time', label: 'Diagnostics' },
            { value: 'Secure', label: 'Patient Data' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.15em] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================= FEATURES ============================= */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product</p>
          <h2 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
            Everything Your Hospital Needs
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400">
            One platform. Every department. Zero gaps.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🏥', title: 'Emergency & Triage', desc: 'Real-time patient queue with priority triage and vital signs tracking.' },
            { icon: '🔬', title: 'Lab & Diagnostics', desc: 'Automated lab results, X-ray, ECG, and sonar delivery to doctors instantly.' },
            { icon: '💊', title: 'Pharmacy', desc: 'Prescription management, inventory control, and full dispensing workflow.' },
            { icon: '💳', title: 'Billing & Finance', desc: 'Automated invoicing, QR payment verification, and full financial reports.' },
            { icon: '🔐', title: 'Secure Exit', desc: 'QR-based gatekeeper ensures no patient leaves without full clearance.' },
            { icon: '📊', title: 'Admin Dashboard', desc: 'Full control over departments, staff, pricing, and system settings.' },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-white/[0.05]"
            >
              <div
                aria-hidden
                className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                style={{ mask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)', WebkitMask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }}
              />
              <div className="mb-5 text-4xl">{f.icon}</div>
              <h3 className="mb-3 text-lg font-bold text-white transition-colors group-hover:text-cyan-200">
                {f.title}
              </h3>
              <p className="text-base leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================= SYSTEM PREVIEW ============================= */}
      <section id="system-preview" className="relative z-10 mx-auto max-w-5xl px-6 pb-28">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Resources</p>
          <h2 className="text-5xl font-black tracking-tight text-white">System Preview</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400">
            A lightweight walkthrough placeholder — drop in a Loom/YouTube embed or guided modal for sales demos.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)' }}
          />
          <div className="relative rounded-2xl border border-white/10 bg-[#04070F]/70 p-10">
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Walkthrough</div>
              <p className="text-2xl font-black text-white">Executive Command Center</p>
              <p className="max-w-xl text-base text-slate-400">
                Preview revenue throughput, clinical queues, and financial clearance in one unified view.
              </p>
              <div className="mt-4 grid w-full max-w-xl grid-cols-3 gap-3 text-left">
                {[
                  { k: 'Live Ops', v: 'Throughput', c: 'text-emerald-300' },
                  { k: 'Finance', v: 'Clearance', c: 'text-cyan-300' },
                  { k: 'Clinical', v: 'Queues', c: 'text-fuchsia-300' },
                ].map((chip) => (
                  <div
                    key={chip.k}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{chip.k}</p>
                    <p className={`mt-1.5 text-base font-black ${chip.c}`}>{chip.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#pricing"
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-7 py-3 text-sm font-semibold text-cyan-200 transition-all hover:border-cyan-300/60 hover:bg-cyan-500/20"
                >
                  View Pricing
                </a>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 px-7 py-3 text-sm font-black text-[#04070F] shadow-[0_10px_28px_-10px_rgba(34,211,238,0.7)] transition-transform hover:-translate-y-0.5"
                >
                  Open System
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= PRICING ============================= */}
      <section id="pricing" className="relative z-10 border-y border-white/5 bg-white/[0.02] py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Pricing</p>
            <h2 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-5 text-base text-slate-400">Choose what works best for your hospital.</p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/10 via-white/[0.02] to-white/[0.01] p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-40 -right-20 h-80 w-80 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)' }}
              />
              <div className="absolute right-6 top-6 rounded-full bg-cyan-400 px-3.5 py-1 text-[11px] font-black text-[#04070F]">
                BEST VALUE
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Lifetime License</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-7xl font-black tracking-tight text-white">$2,999</span>
                <span className="text-base text-slate-400">once</span>
              </div>
              <p className="mt-3 text-base text-slate-400">One-time payment, yours forever.</p>

              <ul className="mt-10 space-y-4">
                {[
                  { title: 'Unlimited staff accounts & departments' },
                  {
                    title: 'Free updates for the first 30 days',
                    sub: 'Subscription required for future updates',
                    highlight: true,
                  },
                  { title: 'Source code included' },
                  { title: 'Custom branding' },
                  { title: 'Dedicated support for the first month' },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3.5 text-base text-slate-200">
                    <span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-cyan-500/20 text-cyan-300">
                      <Check size={14} />
                    </span>
                    <div className="flex flex-col">
                      <span className={item.highlight ? 'font-semibold text-white' : ''}>
                        {item.title}
                      </span>
                      {item.sub && (
                        <span className="mt-1.5 inline-flex w-fit items-center rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-amber-200">
                          {item.sub}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className="mt-12 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 py-4 text-base font-black text-[#04070F] shadow-[0_14px_40px_-12px_rgba(34,211,238,0.7)] transition-all hover:shadow-[0_20px_50px_-12px_rgba(34,211,238,0.9)]"
              >
                Get Lifetime Access
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= ROLES ============================= */}
      <section id="roles" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Built for Every Role</h2>
          <p className="mt-4 text-base text-slate-400">Each staff member gets a tailored dashboard.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { role: 'Doctor', color: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
            { role: 'Receptionist', color: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10' },
            { role: 'Lab Tech', color: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
            { role: 'Pharmacist', color: 'text-rose-300 border-rose-400/30 bg-rose-500/10' },
            { role: 'Accountant', color: 'text-blue-300 border-blue-400/30 bg-blue-500/10' },
            { role: 'Radiology Tech', color: 'text-sky-300 border-sky-400/30 bg-sky-500/10' },
            { role: 'Security', color: 'text-slate-200 border-slate-400/30 bg-slate-700/30' },
            { role: 'Admin', color: 'text-purple-300 border-purple-400/30 bg-purple-500/10' },
          ].map((item) => (
            <div
              key={item.role}
              className={`rounded-xl border px-5 py-4 text-center text-base font-semibold transition-transform hover:-translate-y-0.5 ${item.color}`}
            >
              {item.role}
            </div>
          ))}
        </div>
      </section>

      {/* ============================= CONTACT ============================= */}
      <section id="contact" className="relative z-10 border-t border-white/5 bg-white/[0.02] py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Contact</p>
          <h2 className="text-5xl font-black tracking-tight text-white">Get in Touch</h2>
          <p className="mt-5 text-base text-slate-400">
            Ready to see {systemName} in action? Reach us directly.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <a
              href="https://wa.me/9647738151383"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-500/15"
            >
              <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-200">
                <MessageCircle size={26} />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-white transition-colors group-hover:text-emerald-200">WhatsApp</p>
                <p className="mt-0.5 text-sm text-slate-400">+964 773 815 1383</p>
              </div>
            </a>
            <a
              href="mailto:nargesaali88@gmail.com"
              className="group flex items-center gap-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-500/15"
            >
              <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-cyan-500/20 text-cyan-200">
                <Mail size={26} />
              </div>
              <div className="text-left">
                <p className="text-base font-bold text-white transition-colors group-hover:text-cyan-200">Email Us</p>
                <p className="mt-0.5 text-sm text-slate-400">nargesaali88@gmail.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ============================= FINAL CTA ============================= */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-10 sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.18), transparent 70%)' }}
          />
          <h2 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
            Ready to Transform Your Hospital?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
            Join the next generation of hospital management.
          </p>
          <Link
            href="/login"
            className="mt-12 inline-flex items-center gap-2.5 rounded-full bg-white px-12 py-5 text-base font-black text-[#04070F] shadow-[0_20px_50px_-15px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-0.5"
          >
            Start Now
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#04070F] text-white">
              <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* ============================= FOOTER ============================= */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-lg border border-cyan-400/30 bg-cyan-500/20">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-black text-cyan-300">
                  {(systemName || 'Z').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-slate-200">{systemName}</span>
          </div>
          <p className="text-xs text-slate-600">© 2025 {systemName}. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <a href="#features" className="transition-colors hover:text-slate-200">Product</a>
            <a href="#roles" className="transition-colors hover:text-slate-200">Use Cases</a>
            <a href="#pricing" className="transition-colors hover:text-slate-200">Pricing</a>
            <a href="#contact" className="transition-colors hover:text-slate-200">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
