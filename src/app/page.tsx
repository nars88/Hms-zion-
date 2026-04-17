"use client";

import Link from 'next/link'
import { Activity, ArrowRight, CheckCircle2, PlayCircle, QrCode, ShieldCheck, Sparkles } from 'lucide-react'

const workflow = [
  { step: '01', title: 'Register', desc: 'Fast patient onboarding with digital records.' },
  { step: '02', title: 'Assign', desc: 'Automated doctor and ward assignment.' },
  { step: '03', title: 'QR Verify', desc: 'Secure exit verification with smart QR codes.' },
]

const plans = [
  {
    name: 'Starter',
    price: '$399',
    note: '/month',
    features: ['Up to 3 departments', 'Core billing and triage', 'Basic analytics'],
  },
  {
    name: 'Professional',
    price: '$899',
    note: '/month',
    features: ['Full hospital workflows', 'Diagnostics + pharmacy suite', 'Priority support'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    note: 'pricing',
    features: ['Multi-branch architecture', 'Advanced security controls', 'Dedicated onboarding'],
  },
]

export default function LandingPage() {
  return (
    <div className="relative z-0 min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <nav className="relative z-50 pointer-events-auto fixed top-0 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Activity className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              ZION <span className="text-emerald-500">MED</span>
            </span>
          </div>

          <div className="relative z-50 flex items-center gap-6">
            <a
              href="#pricing"
              className="relative z-50 pointer-events-auto text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="relative z-50 pointer-events-auto rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-all duration-300 hover:bg-emerald-500 hover:text-white"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 px-6 pb-20 pt-32">
        <div className="relative z-10 mx-auto max-w-7xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <Sparkles size={14} />
            The Future of Hospital Management
          </div>

          <h1 className="mb-8 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Next-Gen Intelligence <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              For Modern Hospitals
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            ZION MED unifies your clinical, financial, and administrative workflows into one seamless,
            AI-powered ecosystem.
          </p>

          <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="relative z-50 pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 font-bold text-black shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:scale-105 hover:bg-emerald-400 sm:w-auto"
            >
              Get Started <ArrowRight size={20} />
            </Link>
            <a
              href="#system-preview"
              className="relative z-50 pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto"
            >
              Request Demo <PlayCircle size={18} />
            </a>
            <a
              href="#pricing"
              className="relative z-50 pointer-events-auto flex w-full items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-4 font-bold text-emerald-200 transition-all duration-300 hover:bg-emerald-500/20 sm:w-auto"
            >
              Pricing
            </a>
            <a
              href="#workflow"
              className="relative z-50 pointer-events-auto flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto"
            >
              See Workflow
            </a>
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 bg-white/[0.02] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold">How it Works</h2>
            <p className="text-slate-400">Streamlined process from patient entry to discharge.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-colors hover:border-emerald-500/50"
              >
                <span className="mb-4 block text-4xl font-black text-emerald-500/20">{item.step}</span>
                <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="system-preview" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-bold">System Preview</h2>
            <p className="text-slate-400">Zion Med Dashboard Walkthrough</p>
          </div>
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-[#0d1524] to-emerald-500/10 p-8">
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#061022] text-center">
              <LayoutDashboardPreview />
              <p className="mt-4 text-sm text-slate-300">Interactive walkthrough placeholder</p>
              <a
                href="#pricing"
                className="relative z-50 pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                View Pricing Plans <ArrowRight size={16} />
              </a>
            </div>
            <div className="mt-6 text-center">
              <a
                href="#system-preview"
                className="relative z-50 pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 font-bold text-white transition-all duration-300 hover:bg-white/10"
              >
                View Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 bg-white/[0.02] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold">Pricing Plans</h2>
            <p className="text-slate-400">Choose the plan that matches your hospital scale.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl border p-7 ${
                  plan.featured
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-xl shadow-emerald-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-4 text-4xl font-extrabold text-emerald-300">{plan.price}</p>
                <p className="text-sm text-slate-400">{plan.note}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#system-preview"
                  className="relative z-50 pointer-events-auto mt-8 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-500 hover:text-white"
                >
                  Request Demo
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function LayoutDashboardPreview() {
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-4">
        <ShieldCheck className="h-7 w-7 text-emerald-300" />
      </div>
      <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/15 p-4">
        <QrCode className="h-7 w-7 text-cyan-300" />
      </div>
    </div>
  )
}