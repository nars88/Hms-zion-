"use client"; // إضافة التوجيه لضمان عمل التفاعلات

import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">ZION <span className="text-emerald-500">MED</span></span>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-emerald-500 hover:text-white transition-all duration-300"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            The Future of Hospital Management
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-tight">
            Next-Gen Intelligence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              For Modern Hospitals
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            ZION MED unifies your clinical, financial, and administrative workflows into one seamless, AI-powered ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
            >
              Get Started Now <ArrowRight size={20} />
            </Link>
            <a href="#workflow" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all duration-300">
              See Workflow
            </a>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it Works</h2>
            <p className="text-slate-400">Streamlined process from patient entry to discharge.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Register", desc: "Fast patient onboarding with digital records." },
              { step: "02", title: "Assign", desc: "Automated doctor and ward assignment." },
              { step: "03", title: "QR Verify", desc: "Secure exit verification with smart QR codes." }
            ].map((item, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-colors">
                <span className="text-4xl font-black text-emerald-500/20 mb-4 block">{item.step}</span>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-emerald-500 hover:text-white transition-all duration-300 shadow-xl inline-block"
            >
              View Live Demo →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}