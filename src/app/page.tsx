'use client'

import Link from 'next/link'

/**
 * Developer-controlled branding.
 * Change Tailwind class strings here (NOT dynamic string concatenation) so Tailwind JIT can still detect classes.
 */
const BRANDING_CONFIG = {
  appName: 'ZION MED',
  productWordmark: 'ZION',
  productAccentWord: 'MED',

  // Primary palette (Emerald + Cyan)
  primary: {
    // Buttons
    solidButton: 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600',
    solidButtonText: 'text-black',

    // Surfaces / borders / glow accents
    markBg: 'bg-cyan-500/20',
    markBorder: 'border-cyan-500/30',
    markText: 'text-cyan-400',

    pillBorder: 'border-cyan-500/30',
    pillBg: 'bg-cyan-500/10',
    pillText: 'text-cyan-300',

    headingGradient: 'from-cyan-400 to-blue-500',

    subtleBorder: 'border-cyan-500/40',
    subtleText: 'text-cyan-300',
    subtleHoverBg: 'hover:bg-cyan-500/10',

    featureHoverBorder: 'hover:border-cyan-500/30',
    featureTitleHover: 'group-hover:text-cyan-300',

    check: 'text-cyan-400',

    featuredCardBorder: 'border-cyan-500/40',
    featuredCardBg: 'from-cyan-500/10',

    badgeSolid: 'bg-cyan-500',

    contactCardBorder: 'border-cyan-500/30',
    contactCardBg: 'bg-cyan-500/10',
    contactHoverBorder: 'hover:border-cyan-400/50',
    contactHoverBg: 'hover:bg-cyan-500/20',
    contactTitleHover: 'group-hover:text-cyan-300',
  },

  secondary: {
    // Use for subtle “premium” accents (stats + small highlights)
    statValue: 'text-emerald-400',
  },
} as const

export default function LandingPage() {
  const b = BRANDING_CONFIG

  return (
    <div className="min-h-screen bg-[#020b18] text-white overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-[#020b18]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`relative z-50 pointer-events-auto h-9 w-9 rounded-xl ${b.primary.markBg} flex items-center justify-center border ${b.primary.markBorder}`}
          >
            <span className={`${b.primary.markText} font-black text-sm`}>Z</span>
          </div>
          <div>
            <p className="relative z-50 pointer-events-auto text-sm font-black leading-none">
              <span className="text-white">{b.productWordmark}</span>{' '}
              <span className="text-emerald-400">{b.productAccentWord}</span>
            </p>
            <p className="relative z-50 pointer-events-auto text-[10px] text-slate-500">Hospital Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#pricing"
            className="relative z-50 pointer-events-auto hidden sm:block text-sm text-slate-400 hover:text-white transition-colors"
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="relative z-50 pointer-events-auto hidden sm:block text-sm text-slate-400 hover:text-white transition-colors"
          >
            Contact
          </a>
          <Link href="/login" prefetch={false} className="relative z-50 pointer-events-auto">
            <button
              type="button"
              className={`relative z-50 pointer-events-auto px-5 py-2 rounded-xl ${b.primary.solidButton} ${b.primary.solidButtonText} text-sm font-black transition-all`}
            >
              Login {'\u2192'}
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-24 px-6 text-center max-w-5xl mx-auto">
        <div
          className={`relative z-50 pointer-events-auto inline-flex items-center gap-2 rounded-full border ${b.primary.pillBorder} ${b.primary.pillBg} px-4 py-1.5 text-xs ${b.primary.pillText} mb-8`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Built for Modern Hospitals
        </div>
        <h1 className="relative z-50 pointer-events-auto text-5xl sm:text-7xl font-black leading-tight mb-6 tracking-tight">
          The Future of{' '}
          <span
            className={`text-transparent bg-clip-text bg-gradient-to-r ${b.primary.headingGradient}`}
          >
            Hospital Management
          </span>
        </h1>
        <p className="relative z-50 pointer-events-auto text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          {b.appName} unifies patient operations, diagnostics, pharmacy, billing, and secure discharge into one powerful
          platform.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" prefetch={false} className="relative z-50 pointer-events-auto">
            <button
              type="button"
              className={`relative z-50 pointer-events-auto px-8 py-4 rounded-xl ${b.primary.solidButton} active:scale-95 ${b.primary.solidButtonText} font-black text-sm transition-all shadow-[0_0_32px_rgba(6,182,212,0.4)]`}
            >
              Get Started {'\u2192'}
            </button>
          </Link>
          <a href="#pricing" className="relative z-50 pointer-events-auto">
            <button
              type="button"
              className="relative z-50 pointer-events-auto px-8 py-4 rounded-xl border border-slate-600 hover:border-cyan-500/50 text-slate-300 hover:text-white font-semibold text-sm transition-all"
            >
              View Pricing
            </button>
          </a>
          <a href="#system-preview" className="relative z-50 pointer-events-auto">
            <button
              type="button"
              className={`relative z-50 pointer-events-auto px-8 py-4 rounded-xl border ${b.primary.pillBorder} ${b.primary.pillBg} ${b.primary.pillText} hover:text-white font-semibold text-sm transition-all`}
            >
              Request Demo
            </button>
          </a>
          <a href="#features" className="relative z-50 pointer-events-auto">
            <button
              type="button"
              className="relative z-50 pointer-events-auto px-8 py-4 text-slate-500 hover:text-slate-300 font-semibold text-sm transition-all"
            >
              See Features {'\u2193'}
            </button>
          </a>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-y border-slate-800/50 bg-slate-900/20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 px-6 text-center">
          {[
            { value: '12+', label: 'Departments' },
            { value: '99.9%', label: 'Uptime' },
            { value: 'Real-time', label: 'Diagnostics' },
            { value: 'Secure', label: 'Patient Data' },
          ].map((s) => (
            <div key={s.label}>
              <p className={`relative z-50 pointer-events-auto text-3xl font-black ${b.secondary.statValue}`}>
                {s.value}
              </p>
              <p className="relative z-50 pointer-events-auto text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="relative z-50 pointer-events-auto text-4xl font-black text-white mb-4">
            Everything Your Hospital Needs
          </h2>
          <p className="relative z-50 pointer-events-auto text-slate-400 max-w-xl mx-auto">
            One platform. Every department. Zero gaps.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: '\u{1F3E5}',
              title: 'Emergency & Triage',
              desc: 'Real-time patient queue with priority triage and vital signs tracking.',
            },
            {
              icon: '\u{1F52C}',
              title: 'Lab & Diagnostics',
              desc: 'Automated lab results, X-ray, ECG, and sonar delivery to doctors instantly.',
            },
            {
              icon: '\u{1F48A}',
              title: 'Pharmacy',
              desc: 'Prescription management, inventory control, and full dispensing workflow.',
            },
            {
              icon: '\u{1F4B3}',
              title: 'Billing & Finance',
              desc: 'Automated invoicing, QR payment verification, and full financial reports.',
            },
            {
              icon: '\u{1F510}',
              title: 'Secure Exit',
              desc: 'QR-based gatekeeper ensures no patient leaves without full clearance.',
            },
            {
              icon: '\u{1F4CA}',
              title: 'Admin Dashboard',
              desc: 'Full control over departments, staff, pricing, and system settings.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`relative z-50 pointer-events-auto rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 ${b.primary.featureHoverBorder} hover:bg-slate-900/70 transition-all group`}
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className={`text-base font-bold text-white mb-2 ${b.primary.featureTitleHover} transition-colors`}>
                {f.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SYSTEM PREVIEW */}
      <section id="system-preview" className="py-28 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="relative z-50 pointer-events-auto text-4xl font-black text-white mb-4">System Preview</h2>
          <p className="relative z-50 pointer-events-auto text-slate-400 max-w-2xl mx-auto">
            {b.appName} dashboard walkthrough placeholder — ideal for investor demos before full tenant onboarding.
          </p>
        </div>
        <div
          className={`relative z-50 pointer-events-auto rounded-3xl border ${b.primary.featuredCardBorder} bg-gradient-to-b ${b.primary.featuredCardBg} to-slate-900/60 p-8`}
        >
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className={`text-sm font-black uppercase tracking-widest ${b.primary.pillText}`}>Walkthrough</div>
              <p className="text-lg font-black text-white">Executive Command Center (Preview)</p>
              <p className="text-sm text-slate-400 max-w-xl">
                This block is intentionally lightweight: swap in a Loom/YouTube embed or a guided modal when you are
                ready for sales demos.
              </p>
              <div className="mt-2 grid w-full max-w-xl grid-cols-3 gap-3 text-left">
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Ops</p>
                  <p className={`mt-1 text-sm font-black ${b.secondary.statValue}`}>Throughput</p>
                </div>
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Finance</p>
                  <p className={`mt-1 text-sm font-black ${b.primary.pillText}`}>Clearance</p>
                </div>
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Clinical</p>
                  <p className="mt-1 text-sm font-black text-white">Queues</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href="#pricing" className="relative z-50 pointer-events-auto">
                  <button
                    type="button"
                    className={`relative z-50 pointer-events-auto px-8 py-3 rounded-xl border ${b.primary.subtleBorder} ${b.primary.subtleText} ${b.primary.subtleHoverBg} font-semibold text-sm transition-all`}
                  >
                    View Pricing
                  </button>
                </a>
                <Link href="/login" prefetch={false} className="relative z-50 pointer-events-auto">
                  <button
                    type="button"
                    className={`relative z-50 pointer-events-auto px-8 py-3 rounded-xl ${b.primary.solidButton} ${b.primary.solidButtonText} font-black text-sm transition-all`}
                  >
                    Open System {'\u2192'}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-28 px-6 bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="relative z-50 pointer-events-auto text-4xl font-black text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="relative z-50 pointer-events-auto text-slate-400">Choose what works best for your hospital.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto">
            {/* Lifetime */}
            <div
              className={`relative z-50 pointer-events-auto rounded-2xl border ${b.primary.featuredCardBorder} bg-gradient-to-b ${b.primary.featuredCardBg} to-slate-900/60 p-8 flex flex-col relative overflow-hidden`}
            >
              <div className={`absolute top-4 right-4 ${b.primary.badgeSolid} text-black text-[10px] font-black px-2.5 py-1 rounded-full`}>
                BEST VALUE
              </div>
              <div className="mb-6">
                <p className={`text-xs font-bold uppercase tracking-widest ${b.primary.pillText} mb-2`}>
                  Lifetime License
                </p>
                <p className="text-5xl font-black text-white">
                  $2,999<span className="text-lg text-slate-400 font-normal"> once</span>
                </p>
                <p className="text-sm text-slate-400 mt-2">One-time payment, yours forever</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Everything in Monthly',
                  'Lifetime updates',
                  'Source code included',
                  'Custom branding',
                  'Maintenance & Dedicated Support for the first month',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className={`${b.primary.check} font-bold`}>{'\u2713'}</span> {item}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="relative z-50 pointer-events-auto">
                <button
                  type="button"
                  className={`relative z-50 pointer-events-auto w-full py-3 rounded-xl ${b.primary.solidButton} active:scale-95 ${b.primary.solidButtonText} font-black text-sm transition-all shadow-[0_0_24px_rgba(6,182,212,0.3)]`}
                >
                  Get Lifetime Access {'\u2192'}
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="relative z-50 pointer-events-auto text-3xl font-black text-white mb-3">Built for Every Role</h2>
          <p className="relative z-50 pointer-events-auto text-slate-400 text-sm">
            Each staff member gets a tailored dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: 'Doctor', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
            { role: 'Receptionist', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
            { role: 'Lab Tech', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
            { role: 'Pharmacist', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
            { role: 'Accountant', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
            { role: 'Radiology Tech', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
            { role: 'Security', color: 'text-slate-300 border-slate-500/30 bg-slate-700/30' },
            { role: 'Admin', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
          ].map((item) => (
            <div
              key={item.role}
              className={`relative z-50 pointer-events-auto rounded-xl border px-4 py-3 text-center text-sm font-semibold ${item.color}`}
            >
              {item.role}
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-28 px-6 bg-slate-900/30 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="relative z-50 pointer-events-auto text-4xl font-black text-white mb-4">Get in Touch</h2>
          <p className="relative z-50 pointer-events-auto text-slate-400 mb-12">
            Ready to see {b.appName} in action? Contact us directly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://wa.me/9647738151383"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-50 pointer-events-auto flex items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 hover:border-green-400/50 hover:bg-green-500/20 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                {'\u{1F4AC}'}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white group-hover:text-green-300 transition-colors">WhatsApp</p>
                <p className="text-xs text-slate-400">+964 773 815 1383</p>
              </div>
            </a>
            <a
              href="mailto:nargesaali88@gmail.com"
              className={`relative z-50 pointer-events-auto flex items-center gap-4 rounded-2xl border ${b.primary.contactCardBorder} ${b.primary.contactCardBg} p-5 ${b.primary.contactHoverBorder} ${b.primary.contactHoverBg} transition-all group`}
            >
              <div className={`h-12 w-12 rounded-xl ${b.primary.markBg} flex items-center justify-center text-2xl flex-shrink-0`}>
                {'\u{1F4E7}'}
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold text-white ${b.primary.contactTitleHover} transition-colors`}>
                  Email Us
                </p>
                <p className="text-xs text-slate-400">nargesaali88@gmail.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center max-w-3xl mx-auto">
        <h2 className="relative z-50 pointer-events-auto text-4xl font-black text-white mb-6">
          Ready to Transform Your Hospital?
        </h2>
        <p className="relative z-50 pointer-events-auto text-slate-400 mb-10 text-lg">
          Join the next generation of hospital management.
        </p>
        <Link href="/login" prefetch={false} className="relative z-50 pointer-events-auto">
          <button
            type="button"
            className={`relative z-50 pointer-events-auto px-12 py-4 rounded-xl ${b.primary.solidButton} active:scale-95 ${b.primary.solidButtonText} font-black text-base transition-all shadow-[0_0_40px_rgba(6,182,212,0.4)]`}
          >
            Start Now {'\u2192'}
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/60 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`relative z-50 pointer-events-auto h-7 w-7 rounded-lg ${b.primary.markBg} flex items-center justify-center border ${b.primary.markBorder}`}
            >
              <span className={`${b.primary.markText} font-black text-xs`}>Z</span>
            </div>
            <span className="relative z-50 pointer-events-auto text-sm font-bold text-slate-300">
              <span className="text-slate-200">{b.productWordmark}</span>{' '}
              <span className="text-emerald-400">{b.productAccentWord}</span>
            </span>
          </div>
          <p className="relative z-50 pointer-events-auto text-slate-600 text-xs">
            {'\u00A9'} 2025 {b.appName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="#features" className="relative z-50 pointer-events-auto hover:text-slate-300 transition-colors">
              Features
            </a>
            <a href="#pricing" className="relative z-50 pointer-events-auto hover:text-slate-300 transition-colors">
              Pricing
            </a>
            <a href="#contact" className="relative z-50 pointer-events-auto hover:text-slate-300 transition-colors">
              Contact
            </a>
            <a href="#system-preview" className="relative z-50 pointer-events-auto hover:text-slate-300 transition-colors">
              Preview
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
