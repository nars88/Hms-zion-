'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020b18] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-slate-800/60 bg-[#020b18]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-bold text-sm">Z</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">ZION MED</p>
            <p className="text-[10px] text-slate-400">Hospital Management</p>
          </div>
        </div>
        <Link href="/login">
          <button className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold transition-all">
            Login {'\u2192'}
          </button>
        </Link>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs text-cyan-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Built for Modern Hospitals
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
          The Future of{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Hospital Management
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          ZION MED unifies patient operations, diagnostics, pharmacy, billing, and secure discharge into one          high-performance platform.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/login">
            <button className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition-all shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:shadow-[0_0_36px_rgba(6,182,212,0.5)]">
              Get Started {'\u2192'}
            </button>
          </Link>
          <Link href="/login">
            <button className="px-8 py-3.5 rounded-xl border border-slate-600 hover:border-cyan-500/50 text-slate-200 hover:text-white font-semibold text-sm transition-all">
              View Live Demo {'\u2192'}
            </button>
          </Link>
          <a href="#features">
            <button className="px-8 py-3.5 rounded-xl text-slate-400 hover:text-slate-200 font-semibold text-sm transition-all">
              See Features {'\u2193'}
            </button>
          </a>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 px-8 text-center">
          {[
            { value: '12+', label: 'Departments' },
            { value: '99.9%', label: 'Uptime' },
            { value: 'Real-time', label: 'Diagnostics' },
            { value: 'Secure', label: 'Patient Data' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-black text-cyan-400">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-white mb-4">Everything Your Hospital Needs</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            One platform for every department {'\u2014'} from reception to discharge.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '\u{1F3E5}',
              title: 'Emergency & Triage',
              desc: 'Real-time patient queue with priority triage and vital signs tracking.',
            },
            {
              icon: '\u{1F52C}',
              title: 'Lab & Diagnostics',
              desc: 'Automated lab results, X-ray, ECG, and sonar delivery to doctors.',
            },
            {
              icon: '\u{1F48A}',
              title: 'Pharmacy',
              desc: 'Prescription management, inventory control, and dispensing workflow.',
            },
            {
              icon: '\u{1F4B3}',
              title: 'Billing & Finance',
              desc: 'Automated invoicing, QR payment verification, and financial reports.',
            },
            {
              icon: '\u{1F510}',
              title: 'Secure Exit',
              desc: 'QR-based gatekeeper system ensures no patient leaves without clearance.',
            },
            {
              icon: '\u{1F4CA}',
              title: 'Admin Dashboard',
              desc: 'Full control over departments, staff, pricing, and system settings.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 hover:border-cyan-500/30 hover:bg-slate-900/60 transition-all"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section className="py-24 px-8 bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-black text-white mb-4">Built for Every Role</h2>
          <p className="text-slate-400">Each staff member gets a tailored dashboard.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { role: 'Doctor', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
            { role: 'Receptionist', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
            { role: 'Lab Tech', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
            { role: 'Pharmacist', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
            { role: 'Accountant', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
            { role: 'Radiology Tech', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
            { role: 'Security', color: 'text-slate-300 border-slate-500/30 bg-slate-500/10' },
            { role: 'Admin', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
          ].map((item) => (
            <div
              key={item.role}
              className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold ${item.color}`}
            >
              {item.role}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl font-black text-white mb-6">Ready to Transform Your Hospital?</h2>
        <p className="text-slate-400 mb-10 text-lg">Join the next generation of hospital management. Start today.</p>
        <Link href="/login">
          <button className="px-10 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-base transition-all shadow-[0_0_32px_rgba(6,182,212,0.4)] hover:shadow-[0_0_48px_rgba(6,182,212,0.6)]">
            Start Now {'\u2014'} It&apos;s Free {'\u2192'}
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/60 py-8 px-8 text-center">
        <p className="text-slate-500 text-sm">
          {'\u00A9'} 2025 ZION MED {'\u2014'} Enterprise Hospital Intelligence
        </p>
      </footer>
    </div>
  )
}
