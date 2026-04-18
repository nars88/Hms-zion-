'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020b18] text-white overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-[#020b18]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <span className="text-cyan-400 font-black text-sm">Z</span>
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none">ZION MED</p>
            <p className="text-[10px] text-slate-500">Hospital Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#contact" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">
            Contact
          </a>
          <Link href="/login">
            <button className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black text-sm font-black transition-all">
              Login {'\u2192'}
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-24 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs text-cyan-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Built for Modern Hospitals
        </div>
        <h1 className="text-5xl sm:text-7xl font-black leading-tight mb-6 tracking-tight">
          The Future of{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Hospital Management
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          ZION MED unifies patient operations, diagnostics, pharmacy, billing, and secure discharge into one powerful
          platform.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/login">
            <button className="px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-black text-sm transition-all shadow-[0_0_32px_rgba(6,182,212,0.4)]">
              Get Started {'\u2192'}
            </button>
          </Link>
          <a href="#pricing">
            <button className="px-8 py-4 rounded-xl border border-slate-600 hover:border-cyan-500/50 text-slate-300 hover:text-white font-semibold text-sm transition-all">
              View Pricing
            </button>
          </a>
          <a href="#features">
            <button className="px-8 py-4 text-slate-500 hover:text-slate-300 font-semibold text-sm transition-all">
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
              <p className="text-3xl font-black text-cyan-400">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white mb-4">Everything Your Hospital Needs</h2>
          <p className="text-slate-400 max-w-xl mx-auto">One platform. Every department. Zero gaps.</p>
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
              className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 hover:border-cyan-500/30 hover:bg-slate-900/70 transition-all group"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-28 px-6 bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Choose what works best for your hospital.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Monthly Plan</p>
                <p className="text-5xl font-black text-white">
                  $299<span className="text-lg text-slate-400 font-normal">/mo</span>
                </p>
                <p className="text-sm text-slate-400 mt-2">Per hospital, billed monthly</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'All departments included',
                  'Unlimited staff accounts',
                  'Real-time diagnostics',
                  'Priority support',
                  'Monthly updates',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold">{'\u2713'}</span> {item}
                  </li>
                ))}
              </ul>
              <a href="#contact">
                <button className="w-full py-3 rounded-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-semibold text-sm transition-all">
                  Contact Us
                </button>
              </a>
            </div>

            {/* Lifetime */}
            <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-slate-900/60 p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-cyan-500 text-black text-[10px] font-black px-2.5 py-1 rounded-full">
                BEST VALUE
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">Lifetime License</p>
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
                  'Dedicated support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-cyan-400 font-bold">{'\u2713'}</span> {item}
                  </li>
                ))}
              </ul>
              <a href="#contact">
                <button className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-black text-sm transition-all shadow-[0_0_24px_rgba(6,182,212,0.3)]">
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
          <h2 className="text-3xl font-black text-white mb-3">Built for Every Role</h2>
          <p className="text-slate-400 text-sm">Each staff member gets a tailored dashboard.</p>
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
              className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold ${item.color}`}
            >
              {item.role}
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-28 px-6 bg-slate-900/30 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Get in Touch</h2>
          <p className="text-slate-400 mb-12">Ready to see ZION MED in action? Contact us directly.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://wa.me/9647738151383"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 hover:border-green-400/50 hover:bg-green-500/20 transition-all group"
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
              className="flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                {'\u{1F4E7}'}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Email Us</p>
                <p className="text-xs text-slate-400">nargesaali88@gmail.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl font-black text-white mb-6">Ready to Transform Your Hospital?</h2>
        <p className="text-slate-400 mb-10 text-lg">Join the next generation of hospital management.</p>
        <Link href="/login">
          <button className="px-12 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-black text-base transition-all shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            Start Now {'\u2192'}
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/60 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <span className="text-cyan-400 font-black text-xs">Z</span>
            </div>
            <span className="text-sm font-bold text-slate-300">ZION MED</span>
          </div>
          <p className="text-slate-600 text-xs">{'\u00A9'} 2025 ZION MED. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-300 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </a>
            <a href="#contact" className="hover:text-slate-300 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
