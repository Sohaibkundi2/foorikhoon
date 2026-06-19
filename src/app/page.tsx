'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Map from '@/components/Map'

const stats = [
  { value: '2,400+', label: 'Donors Registered' },
  { value: '38+', label: 'Hospitals Connected' },
  { value: '890+', label: 'Lives Saved' },
]

const bloodGroups = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

const steps = [
  {
    num: '01',
    label: 'Register as a donor',
    desc: 'Add your blood group, city, and availability. Takes two minutes.',
  },
  {
    num: '02',
    label: 'Get matched automatically',
    desc: 'When a hospital near you posts a request matching your blood type, you are notified immediately.',
  },
  {
    num: '03',
    label: 'Respond and donate',
    desc: 'Accept the request and head to the hospital. Your commitment score improves with every donation.',
  },
]

export default function LandingPage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="bg-[#0A0A0A] text-white w-full">

      {/* Hero */}
      <section className="min-h-[88vh] flex items-center">
        <div
          className="max-w-6xl mx-auto px-8 w-full transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <div className="inline-flex items-center gap-2 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse"></span>
            <span className="text-[#DC2626] text-xs font-medium tracking-wide">Live donor matching — Pakistan</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight mb-6 max-w-3xl">
            The right blood,<br />
            <span className="text-[#DC2626]">at the right time.</span>
          </h1>

          <p className="text-[#9CA3AF] text-lg max-w-lg leading-relaxed mb-10">
            ForiKhoon connects willing donors with hospitals the moment blood is needed.
            No calls, no searching — just an instant match.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-7 py-3 rounded-md font-medium transition-colors duration-150 shadow-xl shadow-red-900/25"
            >
              Become a donor
            </Link>
            <Link
              href="/register"
              className="bg-[#141414] hover:bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white px-7 py-3 rounded-md font-medium transition-all duration-150"
            >
              Register your hospital
            </Link>
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="py-20 max-w-6xl mx-auto px-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-6">Live activity map</p>
        <Map />
      </section>

      {/* Stats */}
      <div className="border-t border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-[#9CA3AF] text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Blood groups */}
      <section id="blood-groups" className="py-20 max-w-6xl mx-auto px-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-6">Blood groups we match</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {bloodGroups.map((bg) => (
            <div
              key={bg}
              className="bg-[#141414] border border-[#222] hover:border-[#DC2626]/40 hover:bg-[#1A0A0A] rounded-lg py-5 text-center text-base font-semibold hover:text-[#DC2626] transition-all duration-150 cursor-default"
            >
              {bg}
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1A1A1A]" />

      {/* How it works */}
      <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-12">How it works</p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="bg-[#141414] border border-[#222] rounded-xl p-6 hover:border-[#2A2A2A] transition-colors duration-150">
              <span className="text-[#DC2626] text-sm font-mono font-bold block mb-4">{step.num}</span>
              <p className="font-semibold text-white mb-2 text-base">{step.label}</p>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#1A1A1A]" />

      {/* CTA */}
      <section className="py-28 max-w-6xl mx-auto px-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to save a life?</h2>
        <p className="text-[#9CA3AF] mb-8">Register in two minutes. We handle the matching.</p>
        <Link
          href="/register"
          className="inline-block bg-[#DC2626] hover:bg-[#B91C1C] text-white px-10 py-3.5 rounded-md font-medium transition-colors duration-150 shadow-xl shadow-red-900/25"
        >
          Get started
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-[#6B7280]">
          <span><span className="text-[#DC2626] font-semibold">Fori</span>Khoon</span>
          <span>Gomal University Final Year Project · D.I. Khan, Pakistan</span>
        </div>
      </footer>

    </main>
  )
}