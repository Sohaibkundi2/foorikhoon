'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface Match {
  id: string
  status: string
  createdAt: string
  request: {
    bloodGroup: string
    units: number
    urgency: string
    hospital: {
      name: string
      address: string
    }
  }
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyColors: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
  URGENT: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  NORMAL: 'text-green-400 bg-green-400/10 border-green-400/20',
}

const matchStatusColors: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ACCEPTED: 'text-green-400 bg-green-400/10 border-green-400/20',
  DECLINED: 'text-red-400 bg-red-400/10 border-red-400/20',
  COMPLETED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

type Tab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
const TABS: Tab[] = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED']

export default function DonorMatchesPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'DONOR') { router.push('/'); return }
    fetchMatches()
  }, [user])

  const fetchMatches = async () => {
    try {
      const res = await api.get('/api/donor/matches')
      setMatches(res.data.matches)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const respondToMatch = async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setRespondingId(matchId)
    try {
      await api.put(`/api/donor/matches/${matchId}`, { status })
      setMatches(matches.map(m => m.id === matchId ? { ...m, status } : m))
    } catch (err) {
      console.error(err)
    } finally {
      setRespondingId(null)
    }
  }

  const filteredMatches = activeTab === 'ALL'
    ? matches
    : matches.filter(m => m.status === activeTab)

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Donor</p>
        <h1 className="text-3xl font-bold text-white">My Matches</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">
          Blood requests you've been matched with.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#222]">
        {TABS.map(tab => {
          const count = tab === 'ALL'
            ? matches.length
            : matches.filter(m => m.status === tab).length

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm px-4 py-2 border-b-2 transition-colors duration-150 ${
                activeTab === tab
                  ? 'border-[#DC2626] text-white'
                  : 'border-transparent text-[#6B7280] hover:text-[#9CA3AF]'
              }`}
            >
              {tab} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filteredMatches.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-xl p-8 text-center">
          <p className="text-[#6B7280] text-sm">No matches in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <div key={match.id} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold text-sm">{match.request.hospital.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColors[match.request.urgency]}`}>
                    {match.request.urgency}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${matchStatusColors[match.status]}`}>
                    {match.status}
                  </span>
                </div>
                <p className="text-[#9CA3AF] text-xs">{match.request.hospital.address}</p>
                <p className="text-[#6B7280] text-xs mt-1">
                  Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                  <span className="text-[#DC2626] font-semibold">
                    {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                  </span>
                </p>
                <p className="text-[#6B7280] text-xs mt-1">
                  {new Date(match.createdAt).toLocaleDateString()}
                </p>
              </div>

              {match.status === 'PENDING' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => respondToMatch(match.id, 'ACCEPTED')}
                    disabled={respondingId === match.id}
                    className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs px-4 py-2 rounded-md transition-all duration-150 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToMatch(match.id, 'DECLINED')}
                    disabled={respondingId === match.id}
                    className="bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[#9CA3AF] text-xs px-4 py-2 rounded-md transition-all duration-150 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}