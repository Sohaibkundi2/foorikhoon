'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'
import {
  Chip,
  EmptyState,
  Texture,
  initialsFor,
  primaryBtn,
  tintFor,
  urgencyTone
} from '@/components/fk'

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

/**
 * Shared by the column header and every standing row so the two cannot drift.
 * Group and the score bar drop out below `sm` — a five-column table at 360px
 * gives every column about a character and a half.
 */
const ROW_COLS =
  'grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_3rem_7rem_3.5rem] sm:gap-5'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')

  useEffect(() => {
    api.get('/api/map/leaderboard')
      .then(res => setLeaderboard(res.data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cities = ['ALL', ...Array.from(new Set(leaderboard.map(d => d.city).filter(Boolean)))]

  const filtered = cityFilter === 'ALL'
    ? leaderboard
    : leaderboard.filter(d => d.city === cityFilter)

  // re-rank after filter
  const ranked = filtered.map((d, i) => ({ ...d, rank: i + 1 }))

  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  // Bars are scaled to the leader's score, so they show the size of the gap
  // between donors. The score itself is printed on every row regardless.
  const topScore = Math.max(...ranked.map(d => d.commitmentScore), 1)
  const leader = top3[0]

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-12">

        {/* Masthead */}
        <div className="relative flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">Community</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Donor <span className="font-serif italic font-normal">Leaderboard</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              The twenty donors with the highest commitment score.
            </p>
          </div>

          {!loading && ranked.length > 0 && (
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                {cityFilter === 'ALL' ? 'Donors ranked' : cityFilter}
              </p>
              <p className="mt-2 font-mono text-4xl font-medium leading-none tabular-nums text-bone">
                {ranked.length}
              </p>
            </div>
          )}
        </div>

        {/* City filter. A row of place names divided by hairlines rather than a
            strip of pills: these are names, not toggles, and eight red-filled
            capsules were competing with the standings for attention. */}
        {cities.length > 1 && (
          <nav aria-label="Filter by city" className="mt-7 border-b border-line-soft">
            <ul className="flex flex-wrap items-center">
              {cities.map(city => {
                const active = cityFilter === city
                return (
                  <li key={city} className="border-r border-line-soft last:border-r-0">
                    <button
                      onClick={() => setCityFilter(city)}
                      aria-current={active ? 'true' : undefined}
                      className={`relative px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150 ${
                        active ? 'text-bone' : 'text-faint hover:text-mute'
                      }`}
                    >
                      {active && (
                        <span aria-hidden className="absolute inset-x-3 bottom-0 h-px bg-blood" />
                      )}
                      {city === 'ALL' ? 'All cities' : city}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        {loading && (
          <div className="mt-10 space-y-px">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 animate-pulse bg-surface" />
            ))}
          </div>
        )}

        {!loading && ranked.length === 0 && (
          <div className="mt-10">
            <EmptyState
              icon={Users}
              title="No donors yet"
              hint={
                cityFilter === 'ALL'
                  ? 'Nobody has earned a commitment score yet. Scores start at the first confirmed donation.'
                  : `Be the first donor in ${cityFilter}.`
              }
            >
              <Link href="/register" className={primaryBtn}>Register as donor</Link>
            </EmptyState>
          </div>
        )}

        {!loading && ranked.length > 0 && (
          <>
            {/* The leader, set once at full size. Three podium cards said the top
                three were interchangeable and then scaled one of them up anyway;
                a ranking has exactly one first place, and second and third read
                perfectly well as the first two rows of the table. */}
            {leader && (
              <div className="mt-11 grid gap-8 border-b border-line pb-9 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-9">
                <div className="flex items-center gap-5 sm:block">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-warn">
                    <Trophy className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    First
                  </p>
                  <p className="font-mono text-[4.5rem] font-medium leading-[0.78] tabular-nums text-bone sm:mt-4">
                    {leader.commitmentScore}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint sm:mt-2">
                    score
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-medium ${tintFor(leader.name)}`}
                    >
                      {initialsFor(leader.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-semibold tracking-[-0.02em] text-bone">
                        {leader.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                          {leader.city || 'City not set'}
                        </span>
                        {leader.bloodGroup && (
                          <Chip tone={urgencyTone.CRITICAL}>
                            {bloodGroupLabels[leader.bloodGroup] ?? leader.bloodGroup}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>

                  {leader.totalDonations > 0 && (
                    <p className="mt-5 border-t border-line-soft pt-4 text-sm text-mute">
                      <span className="font-mono tabular-nums text-life">
                        {leader.totalDonations}
                      </span>{' '}
                      confirmed donation{leader.totalDonations !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Standings. One table on a shared baseline: a ranking is a
                comparison, and comparing rows of cards means reading every card
                in full before the order means anything. */}
            {(top3.length > 1 || rest.length > 0) && (
              <div className="mt-10">
                <div
                  aria-hidden
                  className={`${ROW_COLS} border-y border-line px-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-line`}
                >
                  <span>#</span>
                  <span>Donor</span>
                  <span className="hidden sm:block">Group</span>
                  <span className="hidden sm:block">Standing</span>
                  <span className="text-right">Score</span>
                </div>

                <ul>
                  {[...top3.slice(1), ...rest].map(donor => (
                    <li
                      key={donor.rank}
                      className={`${ROW_COLS} border-b border-line-soft px-1 py-3.5 transition-colors duration-150 hover:bg-surface`}
                    >
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          donor.rank <= 3 ? 'text-bone' : 'text-line'
                        }`}
                      >
                        {donor.rank}
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-medium ${tintFor(donor.name)}`}
                        >
                          {initialsFor(donor.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-bone">{donor.name}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                            {donor.city || 'City not set'}
                            {donor.totalDonations > 0 && (
                              <span className="text-life"> · {donor.totalDonations} donated</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="hidden font-mono text-xs text-blood sm:block">
                        {donor.bloodGroup
                          ? bloodGroupLabels[donor.bloodGroup] ?? donor.bloodGroup
                          : '—'}
                      </span>

                      <span aria-hidden className="hidden h-1 rounded-full bg-raised sm:block">
                        <span
                          className="block h-full rounded-full bg-blood/70"
                          style={{
                            width: `${Math.max((donor.commitmentScore / topScore) * 100, 2)}%`
                          }}
                        />
                      </span>

                      <span className="text-right font-mono text-sm tabular-nums text-bone">
                        {donor.commitmentScore}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Two things the list does not say on its own: the positions are
                recomputed inside a city filter, and the donation counts are
                confirmed donations rather than accepted requests. */}
            <p className="mt-6 text-xs leading-relaxed text-faint">
              {cityFilter === 'ALL'
                ? 'Positions are national.'
                : `Positions are within ${cityFilter} only — a donor placed first here may sit lower nationally.`}{' '}
              Donation counts are donations confirmed by a hospital. Bars are scaled to the leading
              score.
            </p>
          </>
        )}

      </div>
    </div>
  )
}
