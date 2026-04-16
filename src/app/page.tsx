import Link from 'next/link'
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react'

const features = [
  {
    title: 'AI-Powered Diagnostics',
    description:
      'Smart patient flow, dynamic triage support, and automated lab/imaging requests built for high-volume hospitals.',
    icon: BrainCircuit,
  },
  {
    title: 'Financial Integrity',
    description:
      'Unified billing and accounting pipelines with transparent, zero-leakage tracking from intake to discharge.',
    icon: BadgeDollarSign,
  },
  {
    title: 'Secure QR Exit',
    description:
      'Tamper-proof patient checkout and multi-checkpoint verification with encrypted QR-based release control.',
    icon: ShieldCheck,
  },
]

const workflow = [
  { title: 'Register', subtitle: 'Capture patient profile in seconds', icon: Stethoscope },
  { title: 'Assign', subtitle: 'Auto-route to doctor and diagnostic units', icon: Activity },
  { title: 'QR Verify', subtitle: 'Complete secure billing and controlled exit', icon: QrCode },
]

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-2.5">
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">ZION MED</p>
              <p className="text-xs text-slate-400">Enterprise Hospital Intelligence</p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
          >
            Login
          </Link>
        </header>

        <section className="mb-20 text-center [animation:fadeIn_700ms_ease-out]">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Built for Modern Hospitals
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            The Future of Hospital Management
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            ZION MED unifies patient operations, diagnostics, pharmacy, billing, and secure discharge
            into one high-performance platform that scales with your hospital.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Request Demo
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
            >
              Get Pricing
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
            >
              View Live Demo
              <ChevronRight className="h-4 w-4" />
            </Link>
            <a
              href="#workflow"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500"
            >
              See Workflow
            </a>
          </div>
        </section>

        <section className="mb-20 [animation:fadeIn_900ms_ease-out]">
          <div className="mb-6 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-semibold tracking-tight">Core Advantages</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#060b16] p-6 shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
              >
                <div className="mb-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
                  <item.icon className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="mb-20 rounded-3xl border border-slate-800 bg-[#070d18]/85 p-6 sm:p-8 [animation:fadeIn_1100ms_ease-out]"
        >
          <div className="mb-7 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <h2 className="text-2xl font-semibold tracking-tight">Fast Workflow Showcase</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/65 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-emerald-300" />
                  <span className="text-xs font-semibold tracking-[0.2em] text-slate-500">
                    STEP {index + 1}
                  </span>
                </div>
                <p className="text-base font-semibold text-slate-100">{step.title}</p>
                <p className="mt-2 text-sm text-slate-400">{step.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="[animation:fadeIn_1300ms_ease-out]">
          <div className="grid gap-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-[#0d1524] to-emerald-500/10 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Owner View
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Real-Time Analytics for Confident Decisions
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Monitor occupancy, diagnostic throughput, doctor queues, and revenue performance from
                a single executive dashboard designed for hospital owners and directors.
              </p>
              <Link
                href="/login"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400"
              >
                Book Your Demo
                <ChevronRight className="h-4 w-4" />
              </Link>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
                >
                  Get Pricing
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
                >
                  View Live Demo
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/80 bg-[#050a14] p-4">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <p className="text-sm font-semibold text-slate-100">Admin Command Center</p>
                <BarChart3 className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-slate-400">Live Occupancy</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">94% Utilization</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-slate-400">Billing Clearance</p>
                  <p className="mt-1 text-lg font-semibold text-cyan-300">99.2% Verified</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-slate-400">Average ER Turnaround</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">11m 28s</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
