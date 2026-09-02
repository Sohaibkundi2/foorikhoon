'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Flame,
  Award,
  Heart
} from 'lucide-react'
import api from '@/lib/api'
import { Reveal } from '@/components/fk'

interface Hero {
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
}

const BLOOD_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−',
  B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−',
  O_POS: 'O+', O_NEG: 'O−'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function WeeklyHeroes() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    api.get('/api/map/weekly-heroes')
      .then(res => setHeroes(res.data.heroes || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (heroes.length <= 1 || isPaused) return

    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % heroes.length)
    }, 4500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [heroes, isPaused])

  const nextHero = () => {
    if (heroes.length > 1) {
      setActiveIndex(prev => (prev + 1) % heroes.length)
    }
  }

  const prevHero = () => {
    if (heroes.length > 1) {
      setActiveIndex(prev => (prev - 1 + heroes.length) % heroes.length)
    }
  }

  // If loading or no heroes this week, render absolutely nothing (no empty background or space)
  if (loading || heroes.length === 0) {
    return null
  }

  const currentHero = heroes[activeIndex]

  return (
    <section className="relative border-t border-line-soft bg-surface/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <Reveal>
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Section Header */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blood/30 bg-blood/10">
                  <Flame className="h-4 w-4 text-blood animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                      Weekly Heroes
                    </span>
                    <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mute">
                      Verified Donors
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation controls */}
              {heroes.length > 1 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="font-mono text-xs tabular-nums text-faint mr-1">
                    <span className="text-bone font-medium">{String(activeIndex + 1).padStart(2, '0')}</span>
                    <span className="mx-1 text-line">/</span>
                    <span>{String(heroes.length).padStart(2, '0')}</span>
                  </span>
                  <button
                    onClick={prevHero}
                    aria-label="Previous Hero"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-mute transition-colors hover:bg-raised hover:text-bone cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextHero}
                    aria-label="Next Hero"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-mute transition-colors hover:bg-raised hover:text-bone cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Main Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface via-surface/90 to-raised p-5 sm:p-7 md:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.3 }}
                  className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
                >
                  {/* Left side */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-blood/30 bg-gradient-to-br from-blood/20 to-surface font-mono text-lg sm:text-xl font-bold tracking-tight text-bone shadow-[0_0_20px_-5px_rgba(220,38,38,0.3)]">
                        {getInitials(currentHero.name)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-blood text-white shadow-sm">
                        <ShieldCheck className="h-3 w-3" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="truncate text-lg sm:text-xl font-semibold tracking-tight text-bone">
                          {currentHero.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-md border border-blood/25 bg-blood/10 px-2 py-0.5 font-mono text-[10px] text-blood-lite">
                          <Award className="h-3 w-3" />
                          Fulfilled
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-mute">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blood/80" />
                          {currentHero.city || 'Pakistan'}
                        </span>
                        {currentHero.bloodGroup && (
                          <>
                            <span className="h-3 w-px bg-line" />
                            <span className="font-mono font-semibold text-blood">
                              Group: {BLOOD_LABELS[currentHero.bloodGroup] || currentHero.bloodGroup}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Score */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t border-line-soft pt-3 md:border-t-0 md:border-l md:pl-6 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                        Commitment Score
                      </p>
                      <p className="mt-0.5 text-2xl sm:text-3xl font-bold tracking-tight text-bone tabular-nums">
                        {currentHero.commitmentScore}<span className="text-xs text-faint font-normal font-mono">/100</span>
                      </p>
                    </div>

                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                        <path
                          className="text-raised"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blood transition-all duration-700"
                          strokeDasharray={`${Math.min(currentHero.commitmentScore, 100)}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex items-center justify-center">
                        <Heart className="h-3.5 w-3.5 fill-blood text-blood" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Indicators */}
              {heroes.length > 1 && (
                <div className="mt-4 flex items-center gap-1.5 border-t border-line-soft pt-3">
                  {heroes.map((hero, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Show ${hero.name}`}
                      className="group flex-1 py-1 cursor-pointer"
                    >
                      <span
                        className={`block h-1 rounded-full transition-all duration-300 ${
                          i === activeIndex
                            ? 'bg-blood'
                            : 'bg-line group-hover:bg-mute/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
