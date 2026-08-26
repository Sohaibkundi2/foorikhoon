'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { LiveDot, Reveal, SectionLabel } from '@/components/fk'

const WeeklyHeroes = dynamic(() => import('@/components/WeeklyHeroes'), {
  ssr: false
})

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[450px] rounded-xl border border-line bg-surface animate-pulse" />
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

// ---- Type ----
//
// Three faces, each with one job: Inter for reading, Instrument Serif for the one
// line that has to land, IBM Plex Mono for labels and figures.
//
// All three are now loaded once in layout.tsx, which publishes the serif and mono
// as Tailwind's own --font-serif / --font-mono on <body>. This page used to load
// its own copies because it was the only route on the new styling; every route is
// on it now, and two loaders for the same family means two @font-face blocks and
// two preload requests for one file.

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

// Display only. /api/map/shortage echoes Prisma's enum spelling straight through
// ('O_NEG'), which was reaching the page raw and rendering as "O_NEG". Mapping it
// here also lets the blood-group grid below match a prediction to its cell.
// The minus is U+2212, matching `bloodGroups` above — a hyphen would not match.
const GROUP_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const prettyGroup = (group: string) => GROUP_LABELS[group] ?? group

// ---- Presentational pieces ----
//
// SectionLabel, LiveDot and Reveal used to live here. They are the three patterns
// the rest of the app copied out of this file, so they now come from fk.tsx and
// this page uses the same ones as every other route. StatBlock and MatchAlertCard
// stay local — they are only ever used here.

function StatBlock({
  index,
  value,
  label,
  loading,
}: {
  index: string
  value: string
  label: string
  loading: boolean
}) {
  return (
    <div className="px-6 py-8 first:pl-0 md:px-8 lg:py-10">
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        <span className="text-blood">{index}</span>
        <span className="mx-2 text-line">/</span>
        {label}
      </p>
      <p className="text-4xl font-semibold tracking-tight text-bone tabular-nums lg:text-5xl">
        {loading ? (
          <span className="inline-block h-9 w-24 animate-pulse rounded bg-raised align-middle lg:h-11" />
        ) : (
          value
        )}
      </p>
    </div>
  )
}

/**
 * The hero's right column: a still of the one screen the whole product exists to
 * deliver. Every field on it is a real field — blood group, hospital name and
 * address, units, urgency, the verified flag, and the two buttons a donor
 * actually gets — so it reads as a screenshot rather than as decoration.
 *
 * aria-hidden, with the caption below carrying the meaning for screen readers.
 */
function MatchAlertCard() {
  return (
    <div className="relative">
      {/* Offset ghost frame. A print device: cheaper and quieter than a shadow. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-3 top-3 left-3 rounded-xl border border-line-soft"
      />

      <div
        aria-hidden
        className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-line-soft bg-ink/60 px-5 py-3">
          <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-blood">
            <LiveDot />
            Incoming match
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-faint">NOW</span>
        </div>

        <div className="px-5 py-6">
          <div className="flex items-start gap-5">
            {/* Blood group */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-blood/30 bg-blood/10">
              <span className="text-2xl font-semibold tracking-tight text-blood">O−</span>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-bone">DHQ Teaching Hospital</p>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blood" strokeWidth={2} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-mute">
                <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                Circular Road, DI Khan
              </p>
            </div>
          </div>

          {/* Fields */}
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft">
            <div className="bg-ink/50 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Units</dt>
              <dd className="mt-1 text-sm font-medium text-bone tabular-nums">2</dd>
            </div>
            <div className="bg-ink/50 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Urgency</dt>
              <dd className="mt-1 text-sm font-medium text-blood">Critical</dd>
            </div>
          </dl>

          {/* The donor's two options */}
          <div className="mt-5 flex gap-2.5">
            <span className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blood py-2.5 text-sm font-medium text-white">
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Accept
            </span>
            <span className="flex-1 rounded-md border border-line py-2.5 text-center text-sm font-medium text-mute">
              Decline
            </span>
          </div>
        </div>
      </div>

      <p className="mt-6 pl-1 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        Illustration — what a matched donor sees
      </p>
    </div>
  )
}

// ---- Page ----

export default function LandingPage() {
  const [visible, setVisible] = useState(false)
  const { stats, status } = useStats()
  const [shortage, setShortage] = useState<any[]>([])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(()=>{
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/map/shortage`)
          .then(res => res.json())
          .then(data => setShortage(
            data.predictions
              .filter((p: any) => p.risk === 'CRITICAL' || p.risk === 'HIGH')
              .slice(0, 3)
          ))
          .catch(console.error)
  }, [])

  const loading = status === 'loading'

  // Derived from the shortage state already fetched above — no extra request.
  // Lets the blood-group grid flag the groups currently predicted short.
  // A record rather than a Map, because the dynamic import above binds the name
  // `Map` to the heatmap component and shadows the global constructor.
  const riskByGroup: Record<string, string> = Object.fromEntries(
    shortage.map((pred: any) => [prettyGroup(pred.bloodGroup), pred.risk])
  )

  // Both columns of the hero ride the same mount transition, the card a beat behind.
  const enter = (delayMs: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transitionDelay: `${delayMs}ms`,
  })

  return (
    <main className="w-full bg-ink text-bone">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div aria-hidden className="pointer-events-none absolute inset-0 fk-ember" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 fk-rule-grid [mask-image:radial-gradient(70%_58%_at_45%_0%,black,transparent)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 fk-noise" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-20 pt-14 md:px-8 lg:min-h-[86vh] lg:grid-cols-12 lg:gap-12 lg:pb-28 lg:pt-20">

          <div
            className="transition-all duration-700 ease-out lg:col-span-7"
            style={enter(0)}
          >
            <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-blood/25 bg-blood/[0.07] py-1.5 pl-3 pr-4">
              <LiveDot />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-blood">
                Live donor matching — Pakistan
              </span>
            </div>

            <h1 className="mb-7 max-w-3xl text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.035em] text-bone sm:text-6xl lg:text-[5rem]">
              The right blood,<br />
              <span className="font-serif font-normal italic tracking-[-0.01em] text-blood">
                at the right time.
              </span>
            </h1>

            <p className="mb-10 max-w-[46ch] text-[17px] leading-relaxed text-mute">
              ForiKhoon connects willing donors with hospitals the moment blood is needed.
              No calls, no searching — just an instant match.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-md bg-blood px-7 py-3.5 font-medium text-white shadow-[0_16px_40px_-16px_rgba(220,38,38,0.7)] transition-colors duration-150 hover:bg-blood-dark"
              >
                Become a donor
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-line bg-surface px-7 py-3.5 font-medium text-bone transition-colors duration-150 hover:border-line hover:bg-raised"
              >
                Register your hospital
              </Link>
              <Link
                href="/requests"
                className="group inline-flex items-center gap-1.5 px-2 py-3.5 font-medium text-blood transition-colors duration-150 hover:text-blood-lite"
              >
                Active Requests
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2}
                />
              </Link>
            </div>

            {/* What the product actually guarantees, in the product's own terms. */}
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-7 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              <li className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-blood/70" strokeWidth={2} />
                Matched as the request is posted
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blood/70" strokeWidth={2} />
                Matched by city and area
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-blood/70" strokeWidth={2} />
                Your number shared only if you allow it
              </li>
            </ul>
          </div>

          <div
            className="transition-all duration-700 ease-out lg:col-span-5"
            style={enter(140)}
          >
            <MatchAlertCard />
          </div>
        </div>
      </section>


      {/* Stats */}
      <div className="border-b border-line-soft bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="grid divide-y divide-line-soft md:grid-cols-3 md:divide-x md:divide-y-0">
            <StatBlock
              index="01"
              value={stats ? formatCount(stats.totalDonors) : '—'}
              label="Donors Registered"
              loading={loading}
            />
            <StatBlock
              index="02"
              value={stats ? formatCount(stats.totalHospitals) : '—'}
              label="Hospitals Connected"
              loading={loading}
            />
            <StatBlock
              index="03"
              value={stats ? formatCount(stats.totalMatches) : '—'}
              label="Successful Matches"
              loading={loading}
            />
          </div>
          {status === 'error' && (
            <p className="border-t border-line-soft py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Live stats are temporarily unavailable. Showing last known data.
            </p>
          )}
        </div>
      </div>

      {/* Shortage */}
      {shortage.length > 0 && (
        <div className="relative overflow-hidden border-b border-line-soft bg-blood-deep/25">
          <div aria-hidden className="pointer-events-none absolute inset-0 fk-noise" />
          <div className="relative mx-auto max-w-6xl px-6 py-7 md:px-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.25} />
                Shortage Alert
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                {shortage.map(pred => {
                  const critical = pred.risk === 'CRITICAL'
                  return (
                    <div
                      key={pred.bloodGroup}
                      className={`flex items-center gap-3 rounded-full border py-1.5 pl-4 pr-3.5 ${
                        critical
                          ? 'border-blood/30 bg-blood/10 text-blood-lite'
                          : 'border-warn/30 bg-warn/10 text-warn'
                      }`}
                    >
                      <span className="text-sm font-semibold">{prettyGroup(pred.bloodGroup)}</span>
                      {/* Three bars, so the two tiers differ by shape as well as hue. */}
                      <span className="flex items-center gap-[3px]" aria-hidden>
                        <span className="h-3 w-[3px] rounded-full bg-current" />
                        <span className="h-3 w-[3px] rounded-full bg-current" />
                        <span className={`h-3 w-[3px] rounded-full bg-current ${critical ? '' : 'opacity-25'}`} />
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.14em] opacity-80">{pred.risk}</span>
                    </div>
                  )
                })}
              </div>

              <Link
                href="/register"
                className="group ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mute transition-colors hover:text-bone"
              >
                Donate now
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Heroes */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <Reveal>
          <WeeklyHeroes />
        </Reveal>
      </section>

      <div className="border-t border-line-soft" />

      {/* Blood groups */}
      <section id="blood-groups" className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <Reveal>
          <SectionLabel>Blood groups we match</SectionLabel>

          {/* gap-px over a hairline fill: one continuous lattice, like a chart of
              elements, instead of eight detached rounded boxes. */}
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft md:grid-cols-8">
            {bloodGroups.map((bg, i) => {
              const risk = riskByGroup[bg]
              const critical = risk === 'CRITICAL'
              return (
                <motion.div
                  key={bg}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.035 }}
                  className={`group relative cursor-default px-2 py-7 text-center transition-colors duration-150 ${
                    risk ? 'bg-blood-deep/20' : 'bg-ink hover:bg-surface'
                  }`}
                >
                  {risk && (
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-px ${critical ? 'bg-blood' : 'bg-warn'}`}
                    />
                  )}
                  <span
                    className={`block text-2xl font-semibold tracking-tight transition-colors duration-150 ${
                      risk ? (critical ? 'text-blood' : 'text-warn') : 'text-bone group-hover:text-blood'
                    }`}
                  >
                    {bg}
                  </span>
                  {/* Fixed height whether or not there is a marker, so the row
                      never reflows. No marker is deliberately silent — the feed
                      only carries the top three at risk, so its absence is not
                      evidence of stock. */}
                  <span className="mt-2.5 flex h-3.5 items-center justify-center">
                    {risk && (
                      <span
                        className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                          critical ? 'text-blood' : 'text-warn'
                        }`}
                      >
                        {critical ? 'Critical' : 'Low'}
                      </span>
                    )}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {shortage.length > 0 && (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Marked groups are currently predicted short
            </p>
          )}
        </Reveal>
      </section>

      {/* Heatmap */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <Reveal>
          <SectionLabel
            aside={
              <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                <LiveDot />
                Live
              </span>
            }
          >
            Live activity map
          </SectionLabel>
          <Map />
        </Reveal>
      </section>

      <div className="border-t border-line-soft" />

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <Reveal>
          <SectionLabel>How it works</SectionLabel>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <div className="relative border-t border-line pt-7">
                {/* Short red rule sitting on the hairline, over the numeral. */}
                <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
                <span className="font-mono text-xs tracking-[0.16em] text-blood">{step.num}</span>
                <h3 className="mb-2.5 mt-4 text-lg font-medium tracking-tight text-bone">
                  {step.label}
                </h3>
                <p className="max-w-[38ch] text-[15px] leading-relaxed text-mute">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line-soft">
        <div aria-hidden className="pointer-events-none absolute inset-0 fk-ember" />
        <div aria-hidden className="pointer-events-none absolute inset-0 fk-noise" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 md:px-8 lg:py-28">
          <Reveal>
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-bone lg:text-5xl">
                  Ready to{' '}
                  <span className="font-serif font-normal italic text-blood">save a life?</span>
                </h2>
                <p className="mt-5 text-[17px] text-mute">
                  Register in two minutes. We handle the matching.
                </p>
              </div>

              <Link
                href="/register"
                className="group inline-flex shrink-0 items-center gap-2.5 self-start rounded-md bg-blood px-9 py-4 font-medium text-white shadow-[0_16px_40px_-16px_rgba(220,38,38,0.7)] transition-colors duration-150 hover:bg-blood-dark lg:self-auto"
              >
                Get started
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line-soft px-6 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm tracking-tight">
            <span className="font-semibold text-blood">Fori</span>
            <span className="font-semibold text-bone">Khoon</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Blood donation matching — Pakistan
          </span>
        </div>
      </footer>

    </main>
  )
}
