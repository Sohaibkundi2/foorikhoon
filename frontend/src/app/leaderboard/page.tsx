'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import Link from 'next/link'

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

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-red-900/40 text-red-400 border-red-800/40',
    'bg-orange-900/40 text-orange-400 border-orange-800/40',
    'bg-green-900/40 text-green-400 border-green-800/40',
    'bg-blue-900/40 text-blue-400 border-blue-800/40',
    'bg-purple-900/40 text-purple-400 border-purple-800/40',
    'bg-yellow-900/40 text-yellow-400 border-yellow-800/40',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', label: '🥇' }
  if (rank === 2) return { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-300', label: '🥈' }
  if (rank === 3) return { bg: 'bg-orange-800/10 border-orange-700/30', text: 'text-orange-400', label: '🥉' }
  return { bg: 'bg-[#141414] border-[#222]', text: 'text-[#6B7280]', label: `#${rank}` }
}

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Community</p>
        <h1 className="text-3xl font-bold text-white">Donor Leaderboard</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">
          Top donors ranked by commitment score across Pakistan.
        </p>
      </div>

      {/* City filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {cities.map(city => (
          <button
            key={city}
            onClick={() => setCityFilter(city)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-150 ${
              cityFilter === city
                ? 'bg-[#DC2626] border-[#DC2626] text-white'
                : 'bg-[#141414] border-[#222] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-white'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && ranked.length === 0 && (
        <div className="bg-[#141414] border border-[#222] rounded-xl p-12 text-center">
          <p className="text-4xl mb-4">🩸</p>
          <p className="text-white font-semibold mb-1">No donors yet</p>
          <p className="text-[#6B7280] text-sm mb-6">Be the first donor in {cityFilter}.</p>
          <Link href="/register" className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-6 py-2.5 rounded-md transition-colors">
            Register as donor
          </Link>
        </div>
      )}

      {!loading && ranked.length > 0 && (
        <>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {top3.map(donor => {
                const rankStyle = getRankStyle(donor.rank)
                return (
                  <div
                    key={donor.rank}
                    className={`border rounded-xl p-5 text-center transition-all duration-150 ${rankStyle.bg} ${donor.rank === 1 ? 'scale-105' : ''}`}
                  >
                    <div className="text-3xl mb-3">{rankStyle.label}</div>
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm font-bold mx-auto mb-3 ${getAvatarColor(donor.name)}`}>
                      {getInitials(donor.name)}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{donor.name}</p>
                    <p className="text-[#6B7280] text-xs mt-0.5">{donor.city}</p>
                    {donor.bloodGroup && (
                      <span className="inline-block mt-2 text-xs text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20 px-2 py-0.5 rounded-full font-semibold">
                        {bloodGroupLabels[donor.bloodGroup]}
                      </span>
                    )}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className={`text-xl font-bold ${rankStyle.text}`}>{donor.commitmentScore}</p>
                      <p className="text-[#6B7280] text-xs">score</p>
                    </div>
                    {donor.totalDonations > 0 && (
                      <p className="text-green-400 text-xs mt-1">
                        {donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map(donor => (
                <div
                  key={donor.rank}
                  className="bg-[#141414] border border-[#222] hover:border-[#2A2A2A] rounded-xl px-5 py-4 flex items-center gap-4 transition-colors duration-150"
                >
                  <span className="text-[#6B7280] text-sm font-mono w-6 shrink-0 text-right">
                    {donor.rank}
                  </span>

                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(donor.name)}`}>
                    {getInitials(donor.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{donor.name}</p>
                    <p className="text-[#6B7280] text-xs">{donor.city}</p>
                  </div>

                  {donor.bloodGroup && (
                    <span className="text-xs text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20 px-2 py-0.5 rounded-full font-semibold shrink-0">
                      {bloodGroupLabels[donor.bloodGroup]}
                    </span>
                  )}

                  <div className="text-right shrink-0">
                    <p className="text-white font-bold text-sm">{donor.commitmentScore}</p>
                    {donor.totalDonations > 0 && (
                      <p className="text-green-400 text-xs">{donor.totalDonations} donated</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}