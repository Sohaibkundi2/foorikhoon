'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import {
  ArrowRight,
  MapPin
} from 'lucide-react'
import api from '@/lib/api'
import { Reveal } from '@/components/fk'

interface LeaderboardEntry {
  rank: number
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
  totalDonations: number
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

export default function LeaderboardPreview() {
  const [topDonors, setTopDonors] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/map/leaderboard')
      .then(res => {
        const raw: LeaderboardEntry[] = res.data?.leaderboard || []
        setTopDonors(raw.slice(0, 3))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || topDonors.length === 0) {
    return null
  }

  return (
    <section className="relative border-t border-line-soft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <Reveal>
          <div className="relative">
            {/* Header */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
                    Top Lifesavers
                  </span>
                  <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mute">
                    Leaderboard
                  </span>
                </div>
                <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-bone">
                  Highest Rated Donors
                </h3>
              </div>

              <Link
                href="/leaderboard"
                className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-blood transition-colors hover:text-blood-lite self-start sm:self-auto"
              >
                <span>View Full Top 20</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Podium Cards (Mobile-first responsive grid) */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {topDonors.map((donor, idx) => {
                const rank = idx + 1
                const isFirst = rank === 1

                return (
                  <motion.div
                    key={donor.name + idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 ${
                      isFirst
                        ? 'border-blood/40 bg-gradient-to-b from-blood-deep/20 via-surface to-raised shadow-[0_15px_40px_-15px_rgba(220,38,38,0.4)]'
                        : 'border-line bg-surface hover:border-line-soft'
                    }`}
                  >
                    {/* Rank Chip */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            isFirst
                              ? 'bg-blood text-white shadow-sm'
                              : 'bg-raised text-mute border border-line'
                          }`}
                        >
                          #{rank}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                          {isFirst ? 'Gold Tier' : rank === 2 ? 'Silver Tier' : 'Bronze Tier'}
                        </span>
                      </div>

                      {donor.bloodGroup && (
                        <span className="rounded-md border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-xs font-semibold text-blood">
                          {BLOOD_LABELS[donor.bloodGroup] || donor.bloodGroup}
                        </span>
                      )}
                    </div>

                    {/* Donor Avatar & Details */}
                    <div className="mt-3.5 flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                          isFirst
                            ? 'border border-blood/30 bg-blood/20 text-bone'
                            : 'border border-line bg-raised text-mute'
                        }`}
                      >
                        {getInitials(donor.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold tracking-tight text-bone">
                          {donor.name}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-mute mt-0.5">
                          <MapPin className="h-3 w-3 text-blood/70" />
                          {donor.city || 'Pakistan'}
                        </p>
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line-soft pt-3 font-mono">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-faint">Commitment</span>
                        <p className="text-base font-bold text-bone tabular-nums">
                          {donor.commitmentScore}<span className="text-xs text-faint font-normal">/100</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-faint">Fulfilled</span>
                        <p className="text-base font-bold text-blood tabular-nums">
                          {donor.totalDonations} <span className="text-xs text-mute font-normal">units</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
