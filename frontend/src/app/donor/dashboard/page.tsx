'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import BadgePopup, { BadgeShelf } from '@/components/BadgePopup'
import api from '@/lib/api'
import Link from 'next/link'


interface DonorProfile {
  id: string
  bloodGroup: string | null
  isAvailable: boolean
  commitmentScore: number
  lastDonated: string | null
  area: string | null
  latitude: number | null
  longitude: number | null
  user: {
    name: string
    email: string
    city: string
    phone: string | null
  }
}

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

export default function DonorDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
      setHydrated(true)
    }, [])

useEffect(() => {
  if (!user) { router.push('/login'); return }
  if (user.role === 'ADMIN') { router.push('/admin/dashboard'); return }
  if (user.role === 'HOSPITAL') { router.push('/hospital/dashboard'); return }
  if (user.role !== 'DONOR') { router.push('/'); return }
  fetchData()
}, [hydrated, user])

  const fetchData = async () => {
    try {
      const [profileRes, matchesRes] = await Promise.all([
        api.get('/api/donor/profile'),
        api.get('/api/donor/matches')
      ])
      setDonor(profileRes.data.donor)
      setMatches(matchesRes.data.matches)
      setBadges(profileRes.data.badges) 
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async () => {
    if (!donor) return
    try {
      setToggling(true)
      await api.put('/api/donor/availability', { isAvailable: !donor.isAvailable })
      setDonor({ ...donor, isAvailable: !donor.isAvailable })
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  const respondToMatch = async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.put(`/api/donor/matches/${matchId}`, { status })
      setMatches(matches.map(m => m.id === matchId ? { ...m, status } : m))
    } catch (err) {
      console.error(err)
    }
  }

  const daysUntilEligible = () => {
    if (!donor?.lastDonated) return null
    const last = new Date(donor.lastDonated)
    const eligible = new Date(last.getTime() + 90 * 24 * 60 * 60 * 1000)
    const today = new Date()
    const days = Math.ceil((eligible.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const pendingMatches = matches.filter(m => m.status === 'PENDING')
  const pastMatches = matches.filter(m => m.status !== 'PENDING')
  const daysLeft = daysUntilEligible()

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
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Donor Dashboard</p>
          <h1 className="text-3xl font-bold text-white">
            Welcome, {donor?.user.name?.split(' ')[0] || 'Donor'}
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">
            {donor?.user.city}
            {donor?.area && <span className="text-[#6B7280]"> · {donor.area}</span>}
          </p>
          {!donor?.area && (
            <Link href="/donor/profile" className="text-xs text-[#DC2626] hover:text-[#B91C1C] transition-colors mt-1 inline-block">
              ⚠️ Add your area to get matched with nearby requests
            </Link>
          )}
        </div>
        <Link
          href="/donor/profile"
          className="text-sm border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-all duration-150"
        >
          Edit Profile
        </Link>
      </div>

      {/* Badges dashboard */}

      {badges.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
              Your Badges
              <span className="ml-2 text-[#DC2626]">{badges.length}</span>
            </h2>
          </div>
          <BadgeShelf badges={badges} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        {/* Blood group */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Blood Group</p>
          <p className="text-3xl font-bold text-[#DC2626]">
            {donor?.bloodGroup ? bloodGroupLabels[donor.bloodGroup] : '—'}
          </p>
        </div>

        {/* Badges */}

        <BadgePopup badges={badges} donorId={donor?.id || ''} />

        {/* Availability */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Availability</p>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${donor?.isAvailable ? 'text-green-400' : 'text-[#9CA3AF]'}`}>
              {donor?.isAvailable ? 'Available' : 'Unavailable'}
            </p>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                donor?.isAvailable ? 'bg-green-500' : 'bg-[#333]'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                donor?.isAvailable ? 'translate-x-0' : '-translate-x-4'
              }`} />
            </button>
          </div>
        </div>

        {/* Commitment score */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Commitment</p>
          <p className="text-3xl font-bold text-white">{donor?.commitmentScore ?? 0}</p>
          <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#DC2626] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((donor?.commitmentScore ?? 0), 100)}%` }}
            />
          </div>
        </div>

        {/* Eligibility */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Eligibility</p>
          {daysLeft === null ? (
            <p className="text-sm font-semibold text-green-400">Ready to donate</p>
          ) : daysLeft === 0 ? (
            <p className="text-sm font-semibold text-green-400">Ready to donate</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-white">{daysLeft}</p>
              <p className="text-[#6B7280] text-xs mt-0.5">days until eligible</p>
            </>
          )}
        </div>

      </div>

      {/* Pending matches */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
            Pending Requests
            {pendingMatches.length > 0 && (
              <span className="ml-2 bg-[#DC2626] text-white text-xs px-2 py-0.5 rounded-full">
                {pendingMatches.length}
              </span>
            )}
          </h2>
        </div>

        {pendingMatches.length === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-xl p-8 text-center">
            <p className="text-[#6B7280] text-sm">No pending requests right now.</p>
            <p className="text-[#6B7280] text-xs mt-1">Make sure your availability is turned on.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMatches.map((match) => (
              <div key={match.id} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{match.request?.hospital.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColors[match.request.urgency]}`}>
                      {match.request.urgency}
                    </span>
                  </div>
                  <p className="text-[#9CA3AF] text-xs">{match.request.hospital.address}</p>
                  <p className="text-[#6B7280] text-xs mt-1">
                    Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                    <span className="text-[#DC2626] font-semibold">
                      {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => respondToMatch(match.id, 'ACCEPTED')}
                    className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs px-4 py-2 rounded-md transition-all duration-150"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToMatch(match.id, 'DECLINED')}
                    className="bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[#9CA3AF] text-xs px-4 py-2 rounded-md transition-all duration-150"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past matches */}
      {pastMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest mb-4">Match History</h2>
          <div className="space-y-2">
            {pastMatches.map((match) => (
              <div key={match.id} className="bg-[#141414] border border-[#222] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{match.request.hospital.name}</p>
                  <p className="text-[#6B7280] text-xs mt-0.5">
                    {bloodGroupLabels[match.request.bloodGroup]} · {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${matchStatusColors[match.status]}`}>
                  {match.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}