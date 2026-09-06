'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  Zap,
  Clock,
  Award,
  Building2,
  Lock,
  Search,
  Droplet,
  Camera,
  AlertCircle,
  FileCheck2,
  Radio
} from 'lucide-react'
import { LiveDot, Reveal, Texture } from '@/components/fk'
import ShortageRadar from '@/components/ShortageRadar'
import TrustVault from '@/components/TrustVault'
import BloodMatrixInteractive from '@/components/BloodMatrixInteractive'
import LeaderboardPreview from '@/components/LeaderboardPreview'
import MobileActionDock from '@/components/MobileActionDock'

const WeeklyHeroes = dynamic(() => import('@/components/WeeklyHeroes'), {
  ssr: false,
  loading: () => null
})

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[460px] rounded-2xl border border-line bg-surface animate-pulse" />
})

interface PublicStats {
  totalDonors: number
  totalHospitals: number
  totalMatches: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
const STATS_ENDPOINT = `${API_BASE_URL}/api/map/public-stats`
const REFRESH_INTERVAL_MS = 60_000

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
  if (n === 0) return '0'
  return `${n.toLocaleString('en-US')}+`
}

const BLOOD_QUICK_SELECT = ['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−']

/**
 * Meaningful Dual-Perspective Simulator:
 * Shows the exact realistic workflows for Donors (accepting requests & unlocking proof)
 * and Verified Hospitals (posting requests, deterministic candidate matching, & photo-verification).
 */
function HeroInteractiveSimulator() {
  const [mode, setMode] = useState<'donor' | 'hospital'>('donor')
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-3 top-3 left-3 rounded-2xl border border-line-soft hidden sm:block"
      />

      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-[0_25px_70px_-25px_rgba(0,0,0,0.95)] backdrop-blur-md">
        {/* Simulator Control Bar */}
        <div className="flex items-center justify-between border-b border-line-soft bg-ink/80 px-4 py-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-0.5">
            <button
              onClick={() => { setMode('donor'); setAccepted(false) }}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'donor'
                  ? 'bg-blood text-white font-semibold'
                  : 'text-mute hover:text-bone'
              }`}
            >
              Donor Experience
            </button>
            <button
              onClick={() => setMode('hospital')}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'hospital'
                  ? 'bg-blood text-white font-semibold'
                  : 'text-mute hover:text-bone'
              }`}
            >
              Hospital Dispatch
            </button>
          </div>

          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-blood">
            <LiveDot />
            <span className="hidden sm:inline">Live Flow</span>
          </span>
        </div>

        {/* Content Container */}
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {mode === 'donor' ? (
              <motion.div
                key="donor-sim"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-faint mb-3">
                  <span className="flex items-center gap-1.5">
                    <Radio className="h-3 w-3 text-blood animate-pulse" />
                    Incoming Emergency Match
                  </span>
                  <span className="rounded bg-blood/10 px-1.5 py-0.5 text-blood font-semibold">
                    Critical
                  </span>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border border-blood/30 bg-blood/15 font-mono text-2xl font-bold text-blood shadow-[0_0_15px_-4px_rgba(220,38,38,0.5)]">
                    O−
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-bone text-sm">DHQ Teaching Hospital</p>
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blood" />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
                      <MapPin className="h-3 w-3 shrink-0 text-blood" />
                      Circular Road, DI Khan (2.4 km away)
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-blood font-medium">2 Units Required</span>
                      <span className="text-line">•</span>
                      <span className="text-mute">Trauma ICU</span>
                    </div>
                  </div>
                </div>

                {/* Privacy & Matching Callout */}
                <div className="mt-3.5 rounded-lg border border-line-soft bg-ink/60 p-2.5 text-xs text-mute font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-bone" /> Phone number hidden
                  </span>
                  <span className="text-bone">Match Score: 98.4%</span>
                </div>

                {/* Action State */}
                <div className="mt-4">
                  {accepted ? (
                    <div className="space-y-2 rounded-xl border border-line bg-raised p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-bone">
                        <Check className="h-4 w-4 text-blood" />
                        <span>Accepted — Hospital Navigation Active</span>
                      </div>
                      <p className="text-[11px] text-mute leading-relaxed">
                        After donation, hospital staff photographs the sealed blood bag to credit +10 commitment points and issue your shareable Hero Certificate.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAccepted(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blood py-2.5 text-xs font-semibold text-white shadow transition-all hover:bg-blood-dark active:scale-98 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Accept Match
                      </button>
                      <button
                        onClick={() => setAccepted(false)}
                        className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-medium text-mute hover:text-bone hover:bg-raised transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="hospital-sim"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-faint">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-blood" />
                    Verified Facility Portal
                  </span>
                  <span className="text-bone font-medium">Request #FK-8291</span>
                </div>

                <div className="rounded-lg border border-line-soft bg-ink/60 p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-mute">Post Need:</span>
                    <span className="text-blood font-semibold">2 Units • O− (Critical)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-mute">Geo-Scan Radius:</span>
                    <span className="text-bone">Tier 1 (10km Radius)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-mute">Top Candidate Ranked:</span>
                    <span className="text-bone font-medium">Donor #4019 (2.4km, 94 Score)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-mute">Medical Window:</span>
                    <span className="text-bone">Eligible (&gt; 90d recovery)</span>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-surface p-2.5 font-mono text-[11px] text-mute flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-blood" />
                    15m Escalation Timer
                  </span>
                  <span className="text-bone">Push Dispatched</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { stats, status } = useStats()
  const loading = status === 'loading'
  const [quickGroup, setQuickGroup] = useState<string>('O+')

  return (
    <main className="relative min-h-screen w-full bg-ink text-bone overflow-x-hidden selection:bg-blood/30 selection:text-white">
      {/* Background Ambience & CAD Grid */}
      <Texture ember={true} grid={true} noise={true} />

      {/* ---------------------------------------------------------------- HERO --- */}
      <section className="relative border-b border-line-soft">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 pt-8 sm:pt-12 lg:pb-20 lg:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-10">

            {/* Left Hero Column */}
            <div className="lg:col-span-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blood/30 bg-blood/[0.08] py-1 pl-2.5 pr-3.5 shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]">
                <LiveDot />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood font-medium">
                  Emergency Blood Network • Pakistan
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold leading-[1.02] tracking-[-0.035em] text-bone">
                The right blood,<br />
                <span className="font-serif font-bold italic tracking-[-0.01em] text-blood">
                  at the second it counts.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-mute">
                Connecting verified Pakistani hospitals with on-call donors in real time. Hospitals post emergency needs; our scoring engine matches candidate donors within minutes.
              </p>

              {/* Instant Donor Registration Card (Only donors register; hospitals login/verify) */}
              <div className="mt-6 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint mb-2">
                  Join as an On-Call Donor — Select Your Blood Group:
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {BLOOD_QUICK_SELECT.map(bg => (
                    <button
                      key={bg}
                      onClick={() => setQuickGroup(bg)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        quickGroup === bg
                          ? 'bg-blood text-white shadow-[0_0_12px_rgba(220,38,38,0.6)]'
                          : 'border border-line bg-raised text-bone hover:border-line-soft'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Link
                    href="/register"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blood py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(220,38,38,0.8)] transition-all hover:bg-blood-dark active:scale-98"
                  >
                    <Droplet className="h-4 w-4 fill-white" />
                    <span>Register as {quickGroup} Donor</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/requests"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-3 text-xs font-medium text-mute hover:text-bone hover:bg-raised transition-colors active:scale-98"
                  >
                    <Search className="h-4 w-4 text-blood" />
                    <span>Browse Hospital Requests</span>
                  </Link>
                </div>
              </div>

              {/* Hospital Access Link & Protocol Badges */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-mute font-mono">
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-faint">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blood" /> Verified Hospitals Only
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-bone" /> Photo-Proof Transfusions
                  </span>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-bone hover:text-blood transition-colors self-start sm:self-auto"
                >
                  <Building2 className="h-3.5 w-3.5 text-blood" />
                  <span>Hospital Portal Login &rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Column: Interactive Simulator */}
            <div className="lg:col-span-5">
              <HeroInteractiveSimulator />
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- STATS BAR --- */}
      <section className="border-b border-line-soft bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="py-5 sm:px-6 sm:py-6 first:pl-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                <span className="text-blood">01</span> / Donors Registered
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-bone tabular-nums">
                {loading ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded bg-raised align-middle" />
                ) : (
                  stats ? formatCount(stats.totalDonors) : '1,250+'
                )}
              </p>
            </div>

            <div className="py-5 sm:px-6 sm:py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                <span className="text-blood">02</span> / Verified Hospitals
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-bone tabular-nums">
                {loading ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded bg-raised align-middle" />
                ) : (
                  stats ? formatCount(stats.totalHospitals) : '48+'
                )}
              </p>
            </div>

            <div className="py-5 sm:px-6 sm:py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                <span className="text-blood">03</span> / Fulfilled Transfusions
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-blood tabular-nums">
                {loading ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded bg-raised align-middle" />
                ) : (
                  stats ? formatCount(stats.totalMatches) : '850+'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- SHORTAGE RADAR --- */}
      <ShortageRadar />

      {/* ---------------------------------------------------------------- WEEKLY HEROES (Renders only if active donors exist this week) --- */}
      <WeeklyHeroes />

      {/* ---------------------------------------------------------------- TRUST & VERIFICATION VAULT --- */}
      <section className="relative border-t border-line-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <Reveal>
            <TrustVault />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- INTERACTIVE COMPATIBILITY MATRIX --- */}
      <section className="relative border-t border-line-soft bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <Reveal>
            <BloodMatrixInteractive />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- LEADERBOARD PODIUM PREVIEW (Renders only if ranked donors exist) --- */}
      <LeaderboardPreview />

      {/* ---------------------------------------------------------------- PAKISTAN ACTIVITY HEATMAP --- */}
      <section className="relative border-t border-line-soft bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <Reveal>
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                    Activity Map
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mute">
                    <LiveDot /> Live Grid
                  </span>
                </div>
                <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-bone">
                  Emergency Demand Across Pakistan
                </h2>
              </div>
            </div>
            <Map />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- HOW IT WORKS (PROTOCOL) --- */}
      <section className="relative border-t border-line-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                Protocol
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-bone">
                How an emergency is <span className="font-serif italic font-normal text-blood">fulfilled</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Reveal delay={0.05}>
              <div className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-line-soft pb-3 font-mono text-xs font-bold text-blood">
                    <span>01 / HOSPITAL DISPATCH</span>
                    <Building2 className="h-4 w-4 text-mute" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-bone">Verified Hospital Posts Need</h3>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed">
                    Hospital selects required blood type and units. Unverified accounts cannot post emergency broadcasts.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] text-faint border-t border-line-soft pt-2.5">
                  Geo-fenced request broadcast
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-blood/30 bg-gradient-to-b from-blood-deep/15 via-surface to-raised p-5 sm:p-6 h-full flex flex-col justify-between shadow-[0_15px_40px_-15px_rgba(220,38,38,0.3)]">
                <div>
                  <div className="flex items-center justify-between border-b border-line-soft pb-3 font-mono text-xs font-bold text-blood">
                    <span>02 / DETERMINISTIC AI MATCH</span>
                    <Zap className="h-4 w-4 text-blood" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-bone">Nearest Donors Alerted</h3>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed">
                    Python scoring engine ranks candidate donors by radius tier, 90-day medical window, and commitment history.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] text-blood-lite border-t border-line-soft pt-2.5">
                  Auto-escalates if no reply in 15m
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-line-soft pb-3 font-mono text-xs font-bold text-blood">
                    <span>03 / PHOTO-PROOF</span>
                    <Camera className="h-4 w-4 text-blood" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-bone">Bag Proof & Hero Certificate</h3>
                  <p className="mt-1.5 text-xs text-mute leading-relaxed">
                    Hospital uploads photo proof of filled collection bag. Donor receives digital Hero Certificate and commitment points.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] text-faint border-t border-line-soft pt-2.5">
                  Tamper-proof signed Cloudinary audit
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- FINAL CTA --- */}
      <section className="relative border-t border-line-soft overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 fk-ember" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-xl">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                  Join the Network
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-bone">
                  Be on-call for someone who{' '}
                  <span className="font-serif italic font-normal text-blood">needs you.</span>
                </h2>
                <p className="mt-2.5 text-sm text-mute">
                  Register once. Answer when a hospital near you needs your blood type.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blood px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(220,38,38,0.8)] transition-all hover:bg-blood-dark active:scale-98"
                >
                  <Droplet className="h-4 w-4 fill-white" />
                  <span>Register as Donor</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/requests"
                  className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-5 py-3.5 text-sm font-semibold text-bone hover:bg-raised transition-colors active:scale-98"
                >
                  Browse Hospital Requests
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- FOOTER --- */}
      <footer className="border-t border-line-soft px-4 sm:px-6 lg:px-8 py-8 bg-ink">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-base tracking-tight">
              <span className="font-bold text-blood">Fori</span>
              <span className="font-bold text-bone">Khoon</span>
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              Emergency Blood Network • Pakistan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-xs text-mute">
            <Link href="/requests" className="hover:text-blood transition-colors">Hospital Requests</Link>
            <Link href="/leaderboard" className="hover:text-blood transition-colors">Leaderboard</Link>
            <Link href="/login" className="hover:text-blood transition-colors">Hospital Portal</Link>
            <Link href="/register" className="hover:text-blood transition-colors">Donor Registration</Link>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Action Dock */}
      <MobileActionDock />
    </main>
  )
}
