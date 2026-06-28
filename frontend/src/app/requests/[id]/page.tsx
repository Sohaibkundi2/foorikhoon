'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyColors: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
  URGENT: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  NORMAL: 'text-green-400 bg-green-400/10 border-green-400/20',
}

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  MATCHED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  FULFILLED: 'text-green-400 bg-green-400/10 border-green-400/20',
  EXPIRED: 'text-[#6B7280] bg-[#6B7280]/10 border-[#6B7280]/20',
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get(`/api/requests/${id}`)
      .then(res => setRequest(res.data.request))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-4">
        <div className="h-8 w-48 bg-[#141414] rounded animate-pulse" />
        <div className="h-48 bg-[#141414] rounded-xl animate-pulse" />
        <div className="h-24 bg-[#141414] rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🩸</p>
          <h2 className="text-white font-bold text-xl mb-2">Request not found</h2>
          <p className="text-[#6B7280] text-sm mb-6">This request may have expired or been fulfilled.</p>
          <Link href="/requests" className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-6 py-2.5 rounded-md transition-colors">
            View all requests
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Back */}
      <Link href="/requests" className="text-xs text-[#6B7280] hover:text-white transition-colors mb-6 inline-block">
        ← Back to requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-2">Blood Request</p>
          <h1 className="text-2xl font-bold text-white">{request.hospital?.name}</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{request.hospital?.user?.city} · {request.hospital?.address}</p>
        </div>
        <button
          onClick={handleShare}
          className="text-xs border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-all shrink-0"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Main card */}
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center shrink-0">
            <span className="text-[#DC2626] font-bold text-2xl">
              {bloodGroupLabels[request.bloodGroup] || request.bloodGroup}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${urgencyColors[request.urgency]}`}>
              {request.urgency}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full border ${statusColors[request.status]}`}>
              {request.status}
            </span>
            {request.hospital?.verified && (
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full">
                Verified Hospital
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-4">
            <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-1">Units Needed</p>
            <p className="text-white font-bold text-2xl">{request.units}</p>
          </div>
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-4">
            <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-1">Donors Notified</p>
            <p className="text-white font-bold text-2xl">{request.matches?.length || 0}</p>
          </div>
        </div>

        {request.notes && (
          <div className="mt-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-lg p-4">
            <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-1">Notes</p>
            <p className="text-[#9CA3AF] text-sm">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Time info */}
      <div className="bg-[#141414] border border-[#222] rounded-xl p-5 mb-6">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-[#6B7280] text-xs mb-1">Posted</p>
            <p className="text-white">{dayjs(request.createdAt).fromNow()}</p>
          </div>
          <div className="text-right">
            <p className="text-[#6B7280] text-xs mb-1">Expires</p>
            <p className="text-white">
              {request.expiresAt ? dayjs(request.expiresAt).fromNow() : 'No expiry set'}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      {request.status === 'PENDING' && (
        <Link
          href="/register"
          className="block w-full text-center bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium py-3 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20"
        >
          I can help — Register as donor
        </Link>
      )}

      {request.status !== 'PENDING' && (
        <div className="text-center py-4">
          <p className="text-[#6B7280] text-sm">This request has been {request.status.toLowerCase()}.</p>
          <Link href="/requests" className="text-[#DC2626] text-sm hover:underline mt-1 inline-block">
            View other requests →
          </Link>
        </div>
      )}

    </div>
  )
}