'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
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

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  MATCHED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  FULFILLED: 'text-green-400 bg-green-400/10 border-green-400/20',
  EXPIRED: 'text-[#6B7280] bg-[#6B7280]/10 border-[#6B7280]/20',
}

type Tab = 'ALL' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED'

const TABS: Tab[] = ['ALL', 'PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

export default function HospitalRequestsPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
    fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/hospital/requests')
      setRequests(res.data.requests)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handler for fulfilling a request (MATCHED -> FULFILLED)
  const handleFulfill = async (id: string) => {
    setUpdatingId(id)
    try {
      await api.put(`/api/hospital/requests/${id}/fulfill`)
      await fetchRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handler for cancelling/expiring a request (PENDING or MATCHED -> EXPIRED)
  const handleCancel = async (id: string) => {
    setUpdatingId(id)
    try {
      await api.put(`/api/requests/${id}`, { status: 'EXPIRED' })
      await fetchRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredRequests = activeTab === 'ALL'
    ? requests
    : requests.filter(r => r.status === activeTab)

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
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Hospital</p>
        <h1 className="text-3xl font-bold text-white">Blood Requests</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">
          View and manage all blood requests you've posted.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#222]">
        {TABS.map(tab => {
          const count = tab === 'ALL'
            ? requests.length
            : requests.filter(r => r.status === tab).length

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
      {filteredRequests.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-xl p-8 text-center">
          <p className="text-[#6B7280] text-sm">No requests in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#DC2626] font-bold text-lg">
                    {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColors[req.urgency]}`}>
                    {req.urgency}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-[#9CA3AF] text-xs">
                  {req.units} unit{req.units > 1 ? 's' : ''} needed
                  {req.notes && ` · ${req.notes}`}
                </p>
                <p className="text-[#6B7280] text-xs mt-1">
                  {req.matches?.length} donor{req.matches?.length !== 1 ? 's' : ''} matched ·{' '}
                  {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {/* Fulfill button - ONLY for MATCHED requests */}
                {req.status === 'MATCHED' && (
                  <button
                    onClick={() => handleFulfill(req.id)}
                    disabled={updatingId === req.id}
                    className="text-xs bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/20 px-3 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-50"
                  >
                    {updatingId === req.id ? 'Processing...' : 'Mark Fulfilled'}
                  </button>
                )}

                {/* Cancel button - for PENDING and MATCHED requests */}
                {(req.status === 'PENDING' || req.status === 'MATCHED') && (
                  <button
                    onClick={() => handleCancel(req.id)}
                    disabled={updatingId === req.id}
                    className="text-xs bg-[#6B7280]/10 hover:bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/20 px-3 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-50"
                  >
                    {updatingId === req.id ? 'Processing...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}