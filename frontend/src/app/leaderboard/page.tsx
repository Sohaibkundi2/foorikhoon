'use client'

import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import Link from 'next/link'
import { Trophy, Users, Award, ShieldCheck, Droplet, ArrowRight, Medal, Sparkles } from 'lucide-react'
import {
  Chip,
  EmptyState,
  Texture,
  initialsFor,
  primaryBtn,
  tintFor,
  LiveDot
} from '@/components/fk'
import { motion } from 'motion/react'

interface LeaderboardEntry {
  rank: number
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
  totalDonations: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')

  useEffect(() => {
    api.get('/api/map/leaderboard')
      .then(res => setLeaderboard(res.data.leaderboard || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cities = useMemo(() => {
    return ['ALL', ...Array.from(new Set(leaderboard.map(d => d.city).filter(Boolean)))]
  }, [leaderboard])

  const ranked = useMemo(() => {
    const list = cityFilter === 'ALL'
      ? leaderboard
      : leaderboard.filter(d => d.city === cityFilter)
    return list.map((d, i) => ({ ...d, rank: i + 1 }))
  }, [leaderboard, cityFilter])

  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const topScore = Math.max(...ranked.map(d => d.commitmentScore), 1)

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} noise={true} grid={true} />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header Masthead */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood w-fit">
            <Trophy className="h-3 w-3" />
            <span>National Lifesaver Registry</span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl md:text-5xl">
                Donor Leaderboard
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute sm:text-base">
                Recognizing Pakistan's most reliable emergency blood donors ranked by verified transfusions and AI commitment reliability score.
              </p>
            </div>

            {!loading && ranked.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface/80 p-3.5 text-right backdrop-blur-md shrink-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {cityFilter === 'ALL' ? 'Total Ranked' : cityFilter}
                </p>
                <p className="font-mono text-2xl font-bold text-bone">{ranked.length} Donors</p>
              </div>
            )}
          </div>
        </div>

        {/* City Filter Pills */}
        {cities.length > 1 && (
          <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {cities.map(city => {
              const active = cityFilter === city
              return (
                <button
                  key={city}
                  onClick={() => setCityFilter(city)}
                  className={`shrink-0 rounded-xl px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                    active
                      ? 'border border-blood bg-blood text-white font-semibold shadow-[0_0_15px_-3px_rgba(220,38,38,0.5)]'
                      : 'border border-line bg-surface/80 text-mute hover:text-bone hover:border-line-soft'
                  }`}
                >
                  {city === 'ALL' ? 'All Pakistan' : city}
                </button>
              )
            })}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
              <p className="font-mono text-xs uppercase tracking-widest text-faint">
                Loading top donor honor roll & rankings...
              </p>
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-surface/60" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && ranked.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface/70 p-8 text-center backdrop-blur-md sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised text-mute">
              <Users className="h-6 w-6 text-blood" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-bone">No Ranked Donors Yet</h3>
            <p className="mt-1.5 text-xs text-mute sm:text-sm">
              {cityFilter === 'ALL'
                ? 'Scores start accruing after the first hospital-confirmed donation.'
                : `Be the first emergency donor to climb the leaderboard in ${cityFilter}.`}
            </p>
            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blood px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-colors"
              >
                <Droplet className="h-3.5 w-3.5 fill-white" />
                <span>Register as a Donor</span>
              </Link>
            </div>
          </div>
        )}

        {/* Podium Display (Top 3) */}
        {!loading && top3.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {top3.map((donor, idx) => {
              const isFirst = idx === 0
              const rankLabel = isFirst ? '1st Place' : idx === 1 ? '2nd Place' : '3rd Place'
              const badgeTone = isFirst
                ? 'border-blood bg-blood/20 text-blood'
                : idx === 1
                ? 'border-bone/40 bg-bone/10 text-bone'
                : 'border-amber-600/40 bg-amber-600/10 text-amber-400'

              return (
                <div
                  key={donor.name + donor.rank}
                  className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md transition-all ${
                    isFirst
                      ? 'border-blood/50 bg-surface shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)] sm:-translate-y-2'
                      : 'border-line bg-surface/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider border ${badgeTone}`}>
                      #{donor.rank} {rankLabel}
                    </span>

                    {donor.bloodGroup && (
                      <span className="font-mono text-xs font-bold text-blood">
                        {bloodGroupLabels[donor.bloodGroup] || donor.bloodGroup}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-mono text-sm font-bold shadow-inner ${tintFor(donor.name)}`}
                    >
                      {initialsFor(donor.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-bone">{donor.name}</p>
                      <p className="font-mono text-xs text-mute">{donor.city || 'Pakistan'}</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line/80 pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Commitment</p>
                      <p className="font-mono text-xl font-extrabold text-bone">{donor.commitmentScore} <span className="text-xs text-mute font-normal">/ 100</span></p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Transfusions</p>
                      <p className="font-mono text-xl font-bold text-bone">{donor.totalDonations}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rest of Leaderboard Table */}
        {!loading && rest.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface/80 backdrop-blur-md">
            <div className="grid grid-cols-[3rem_1fr_4rem_5rem] sm:grid-cols-[4rem_1fr_5rem_7rem_6rem] items-center border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-faint">
              <span>Rank</span>
              <span>Donor</span>
              <span className="text-center">Group</span>
              <span className="hidden sm:block text-center">Donations</span>
              <span className="text-right">Score</span>
            </div>

            <div className="divide-y divide-line-soft">
              {rest.map(donor => (
                <div
                  key={donor.rank}
                  className="grid grid-cols-[3rem_1fr_4rem_5rem] sm:grid-cols-[4rem_1fr_5rem_7rem_6rem] items-center px-4 py-3.5 hover:bg-raised/40 transition-colors"
                >
                  <span className="font-mono text-xs font-semibold text-faint">
                    #{donor.rank}
                  </span>

                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border font-mono text-[11px] font-bold ${tintFor(donor.name)}`}
                    >
                      {initialsFor(donor.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-bone sm:text-sm">{donor.name}</p>
                      <p className="truncate font-mono text-[10px] text-mute">{donor.city || 'Pakistan'}</p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-blood text-center">
                    {donor.bloodGroup ? bloodGroupLabels[donor.bloodGroup] || donor.bloodGroup : '—'}
                  </span>

                  <span className="hidden sm:block font-mono text-xs text-bone text-center">
                    {donor.totalDonations}
                  </span>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-bone">
                      {donor.commitmentScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-line bg-surface/40 p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
            Scoring Formula: 35% Blood Compatibility • 25% Proximity Distance • 25% Verified Response Track Record • 15% Transfusion Recency
          </p>
        </div>
      </div>
    </div>
  )
}
