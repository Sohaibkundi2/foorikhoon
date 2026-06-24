'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const WeeklyHeroes = dynamic(() => import('@/components/WeeklyHeroes'), {
  ssr: false
})

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[450px] bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
})

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

// ---- Live stats ----

interface PublicStats {
  totalDonors: number
  totalHospitals: number
  totalMatches: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
const STATS_ENDPOINT = `${API_BASE_URL}/api/map/public-stats`
const REFRESH_INTERVAL_MS = 60_000 // re-poll every 60s so the "live" badge is honest

if (!API_BASE_URL && typeof window !== 'undefined') {
  // Fails loudly in the browser console instead of silently rendering "—" forever.
  // NEXT_PUBLIC_* vars are baked in at dev-server start — if you add/change this
  // value while `next dev` is running, you must restart it for the change to apply.
  console.error(
    '[ForiKhoon] NEXT_PUBLIC_API_URL is undefined. Check .env.local and restart `npm run dev`.'
  )
}

function useStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch(STATS_ENDPOINT, { cache: 'no-store' })
        if (!res.ok) throw new Error('Bad response')
        const data: PublicStats = await res.json()
        if (!cancelled) {
          setStats(data)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ForiKhoon] Failed to fetch /public-stats:', err)
          setStatus('error')
        }
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { stats, status }
}

function formatCount(n: number) {
  // 2400 -> "2,400+"  |  38 -> "38+"  |  0 -> "0"
  if (n === 0) return '0'
  return `${n.toLocaleString('en-US')}+`
}

function StatBlock({
  value,
  label,
  loading,
}: {
  value: string
  label: string
  loading: boolean
}) {
  return (
    <div className="text-center">
      <p className="text-4xl font-bold text-white mb-1 tabular-nums">
        {loading ? (
          <span className="inline-block h-9 w-20 bg-[#1A1A1A] rounded animate-pulse align-middle" />
        ) : (
          value
        )}
      </p>
      <p className="text-[#9CA3AF] text-sm">{label}</p>
    </div>
  )
}

// ---- Page ----

export default function LandingPage() {
  const [visible, setVisible] = useState(false)
  const { stats, status } = useStats()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const loading = status === 'loading'

  return (
    <main className="bg-[#0A0A0A] text-white w-full">

      {/* Hero */}
      <section className="min-h-[88vh] flex items-center">
        <div
          className="max-w-6xl mx-auto px-8 w-full transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <div className="inline-flex items-center gap-2 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-full px-4 py-1.5 mb-8 mt-4 md:mt-0">
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
            <Link
              href="/requests"
              className="bg-[#141414] hover:bg-[#1A1A1A] border border-[#DC2626]/30 hover:border-[#DC2626]/60 text-[#DC2626] px-7 py-3 rounded-md font-medium transition-all duration-150"
            >
              Active Requests →
            </Link>
          </div>
        </div>
      </section>


      {/* Stats */}
      <div className="border-t border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="grid grid-cols-3 gap-8">
            <StatBlock
              value={stats ? formatCount(stats.totalDonors) : '—'}
              label="Donors Registered"
              loading={loading}
            />
            <StatBlock
              value={stats ? formatCount(stats.totalHospitals) : '—'}
              label="Hospitals Connected"
              loading={loading}
            />
            <StatBlock
              value={stats ? formatCount(stats.totalMatches) : '—'}
              label="Successful Matches"
              loading={loading}
            />
          </div>
          {status === 'error' && (
            <p className="text-center text-[#6B7280] text-xs mt-4">
              Live stats are temporarily unavailable. Showing last known data.
            </p>
          )}
        </div>
      </div>

      {/* Weekly Heroes */}
      <section className="py-16 max-w-6xl mx-auto px-8">
        <WeeklyHeroes />
      </section>

      <div className="border-t border-[#1A1A1A]" />

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

      {/* Heatmap */}
      <section className="py-20 max-w-6xl mx-auto px-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-6">Live activity map</p>
        <Map />
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
        </div>
      </footer>

    </main>
  )
}