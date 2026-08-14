'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface BloodRequest {
  id: string
  bloodGroup: string 
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
  hospital: {
    name: string
    address: string
    verified: boolean
    user: {
      city: string 
    } | null
  }
  matches: { id: string }[]
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

const urgencyOrder: Record<string, number> = {
  CRITICAL: 0, URGENT: 1, NORMAL: 2
}

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const urgencies = ['NORMAL', 'URGENT', 'CRITICAL']

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [copied, setCopied] = useState<string | null>(null)

  
  useEffect(() => {
    api.get('/api/requests')
      .then(res => setRequests(res.data.requests))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cities = Array.from(new Set(requests.map(r => r.hospital.user?.city).filter(Boolean))) as string[]

  const filtered = requests
    .filter(req => {
      if (cityFilter !== 'ALL' && req.hospital.user?.city !== cityFilter) return false
      if (bloodGroupFilter !== 'ALL' && req.bloodGroup !== bloodGroupFilter) return false
      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) return false
      return true
    })
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  const handleShare = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/requests/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const clearFilters = () => {
    setCityFilter('ALL')
    setBloodGroupFilter('ALL')
    setUrgencyFilter('ALL')
  }

  const hasFilters = cityFilter !== 'ALL' || bloodGroupFilter !== 'ALL' || urgencyFilter !== 'ALL'

  const selectClass = "bg-[#141414] border border-[#222] text-white text-sm px-3 py-2 rounded-md outline-none focus:border-[#DC2626] transition-colors cursor-pointer"

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Live</p>
        <h1 className="text-3xl font-bold text-white">Blood Requests</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">
          Active requests from hospitals across Pakistan.
          <Link href="/register" className="text-white hover:text-[#DC2626] transition-colors underline underline-offset-2 ml-1">
            Register as a donor
          </Link>
          {' '}to respond.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#141414] border border-[#222] rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={selectClass}>
            <option value="ALL">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={bloodGroupFilter} onChange={e => setBloodGroupFilter(e.target.value)} className={selectClass}>
            <option value="ALL">All Blood Groups</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>{bloodGroupLabels[bg]}</option>
            ))}
          </select>

          <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} className={selectClass}>
            <option value="ALL">All Urgency</option>
            {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#9CA3AF] hover:text-white transition-colors px-3 py-2 border border-[#2A2A2A] rounded-md"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-[#6B7280]">
            {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-[#141414] border border-[#222] rounded-xl p-12 text-center">
          <p className="text-4xl mb-4">🩸</p>
          <p className="text-white font-semibold mb-1">No requests found</p>
          <p className="text-[#6B7280] text-sm">
            {hasFilters ? 'Try changing your filters.' : 'No active blood requests right now.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-4 text-xs text-[#DC2626] hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Request cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(req => (
            <div
              key={req.id}
              className={`bg-[#141414] border rounded-xl p-5 transition-colors duration-150 ${
                req.urgency === 'CRITICAL'
                  ? 'border-red-500/20 hover:border-red-500/40'
                  : 'border-[#222] hover:border-[#2A2A2A]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">

                {/* Left */}
                <div className="flex items-start gap-4 flex-1 min-w-0">

                  {/* Blood group */}
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center">
                    <span className="text-[#DC2626] font-bold text-lg">
                      {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm truncate">
                        {req.hospital.name}
                      </span>
                      {req.hospital.verified && (
                        <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                          Verified
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${urgencyColors[req.urgency]}`}>
                        {req.urgency}
                      </span>
                    </div>

                    <p className="text-[#9CA3AF] text-xs mb-1">{req.hospital?.user?.city} · {req.hospital?.address}</p>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[#6B7280] text-xs">
                        {req.units} unit{req.units !== 1 ? 's' : ''} needed
                      </span>
                      <span className="text-[#6B7280] text-xs">·</span>
                      <span className="text-[#6B7280] text-xs">
                        {req.matches?.length} donor{req.matches?.length !== 1 ? 's' : ''} notified
                      </span>
                      <span className="text-[#6B7280] text-xs">·</span>
                      <span className="text-[#6B7280] text-xs">
                        {dayjs(req.createdAt).fromNow()}
                      </span>
                    </div>

                    {req.notes && (
                      <p className="text-[#9CA3AF] text-xs mt-2 italic">"{req.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Right — actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    href="/register"
                    className="text-xs bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md transition-colors duration-150"
                  >
                    I can help
                  </Link>
                  <button
                    onClick={() => handleShare(req.id)}
                    className="text-xs text-[#6B7280] hover:text-white transition-colors px-4 py-2 border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-md"
                  >
                    {copied === req.id ? 'Copied!' : 'Share'}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}