'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  Radio,
  ArrowRight,
  Droplet
} from 'lucide-react'
import { LiveDot, Reveal } from '@/components/fk'
import api from '@/lib/api'

interface ShortagePrediction {
  bloodGroup: string
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  confidence?: number
  requestCount?: number
  donorCount?: number
  reason?: string
}

const BLOOD_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−',
  B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−',
  O_POS: 'O+', O_NEG: 'O−',
}

// Fallback baseline for all 8 blood groups in case history is zero or AI server is warming up
const DEFAULT_PREDICTIONS: ShortagePrediction[] = [
  { bloodGroup: 'O_NEG', risk: 'CRITICAL' },
  { bloodGroup: 'AB_NEG', risk: 'CRITICAL' },
  { bloodGroup: 'A_NEG', risk: 'HIGH' },
  { bloodGroup: 'B_NEG', risk: 'HIGH' },
  { bloodGroup: 'O_POS', risk: 'HIGH' },
  { bloodGroup: 'A_POS', risk: 'MEDIUM' },
  { bloodGroup: 'B_POS', risk: 'MEDIUM' },
  { bloodGroup: 'AB_POS', risk: 'LOW' },
]

export default function ShortageRadar() {
  const [predictions, setPredictions] = useState<ShortagePrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>('O_NEG')

  useEffect(() => {
    api.get('/api/map/shortage')
      .then(res => {
        const raw = res.data?.predictions || []
        if (raw.length > 0) {
          const sorted = [...raw].sort((a, b) => {
            const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
            return (order[a.risk as keyof typeof order] ?? 4) - (order[b.risk as keyof typeof order] ?? 4)
          })
          setPredictions(sorted)
          const firstCrit = sorted.find(p => p.risk === 'CRITICAL' || p.risk === 'HIGH') || sorted[0]
          setSelectedGroup(firstCrit.bloodGroup)
        } else {
          setPredictions(DEFAULT_PREDICTIONS)
          setSelectedGroup('O_NEG')
        }
      })
      .catch(() => {
        setPredictions(DEFAULT_PREDICTIONS)
        setSelectedGroup('O_NEG')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading && predictions.length === 0) {
    return null
  }

  const activePredictions = predictions.length > 0 ? predictions : DEFAULT_PREDICTIONS
  const criticalAndHigh = activePredictions.filter(p => p.risk === 'CRITICAL' || p.risk === 'HIGH')
  const currentPrediction = activePredictions.find(p => p.bloodGroup === selectedGroup) || activePredictions[0]

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface/90 to-surface/40 p-5 sm:p-7 md:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
          {/* Header telemetry */}
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line-soft pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blood/30 bg-blood/10">
                <Radio className="h-4 w-4 text-blood animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                    AI Shortage Radar
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
                    <LiveDot /> Live Telemetry
                  </span>
                </div>
              </div>
            </div>

            <span className="font-mono text-[11px] tracking-wide text-faint">
              {criticalAndHigh.length} Groups with High Demand
            </span>
          </div>

          {/* Selector Grid */}
          <div className="relative mt-5">
            <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Select Blood Type to View Deficit:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none sm:grid sm:grid-cols-4 md:grid-cols-8">
              {activePredictions.map(pred => {
                const label = BLOOD_LABELS[pred.bloodGroup] || pred.bloodGroup
                const isCritical = pred.risk === 'CRITICAL'
                const isHigh = pred.risk === 'HIGH'
                const isSelected = selectedGroup === pred.bloodGroup

                return (
                  <button
                    key={pred.bloodGroup}
                    onClick={() => setSelectedGroup(pred.bloodGroup)}
                    className={`relative flex min-w-[70px] flex-1 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                      isSelected
                        ? isCritical
                          ? 'border-blood bg-blood/15 shadow-[0_0_15px_-4px_rgba(220,38,38,0.5)]'
                          : isHigh
                          ? 'border-warn bg-warn/15 shadow-[0_0_15px_-4px_rgba(217,119,6,0.4)]'
                          : 'border-bone/40 bg-raised'
                        : isCritical
                        ? 'border-blood/30 bg-blood/5 hover:border-blood/60'
                        : isHigh
                        ? 'border-warn/30 bg-warn/5 hover:border-warn/60'
                        : 'border-line bg-surface hover:border-line-soft hover:bg-raised'
                    }`}
                  >
                    <span
                      className={`font-mono text-[8px] uppercase tracking-wider ${
                        isCritical ? 'text-blood font-semibold' : isHigh ? 'text-warn' : 'text-faint'
                      }`}
                    >
                      {isCritical ? 'Crit' : isHigh ? 'High' : 'Normal'}
                    </span>

                    <span
                      className={`my-0.5 text-lg font-bold tracking-tight ${
                        isCritical
                          ? 'text-blood'
                          : isHigh
                          ? 'text-warn'
                          : 'text-bone'
                      }`}
                    >
                      {label}
                    </span>

                    <div className="flex items-center gap-0.5" aria-hidden>
                      <span className={`h-1 w-1 rounded-full ${isCritical || isHigh ? (isCritical ? 'bg-blood' : 'bg-warn') : 'bg-line'}`} />
                      <span className={`h-1 w-1 rounded-full ${isCritical ? 'bg-blood' : isHigh ? 'bg-warn/60' : 'bg-line'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Detail */}
          {currentPrediction && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPrediction.bloodGroup}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`mt-4 rounded-xl border p-4 sm:p-5 ${
                  currentPrediction.risk === 'CRITICAL'
                    ? 'border-blood/30 bg-blood-deep/20'
                    : currentPrediction.risk === 'HIGH'
                    ? 'border-warn/30 bg-warn/10'
                    : 'border-line bg-raised/60'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold text-xl ${
                        currentPrediction.risk === 'CRITICAL'
                          ? 'border-blood/40 bg-blood/15 text-blood'
                          : currentPrediction.risk === 'HIGH'
                          ? 'border-warn/40 bg-warn/15 text-warn'
                          : 'border-line bg-surface text-bone'
                      }`}
                    >
                      {BLOOD_LABELS[currentPrediction.bloodGroup] || currentPrediction.bloodGroup}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            currentPrediction.risk === 'CRITICAL'
                              ? 'bg-blood text-white'
                              : currentPrediction.risk === 'HIGH'
                              ? 'bg-warn text-ink'
                              : 'bg-line text-mute'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {currentPrediction.risk} Demand
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-mute leading-relaxed max-w-lg">
                        {currentPrediction.risk === 'CRITICAL'
                          ? 'Severe regional deficit. Nearest donors are prioritized for instant emergency SMS notification.'
                          : currentPrediction.risk === 'HIGH'
                          ? 'High hospital emergency rotation. Registrations for this blood type are urgently welcomed.'
                          : 'Supply and active donor readiness for this blood group meet standard baseline.'}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      href="/register"
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
                        currentPrediction.risk === 'CRITICAL'
                          ? 'bg-blood text-white hover:bg-blood-dark shadow'
                          : 'bg-bone text-ink hover:bg-white'
                      }`}
                    >
                      <Droplet className="h-3.5 w-3.5" />
                      <span>Pledge {BLOOD_LABELS[currentPrediction.bloodGroup]}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/requests"
                      className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3 py-2.5 text-xs font-medium text-mute hover:text-bone transition-colors"
                    >
                      Requests
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Reveal>
    </section>
  )
}
