'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import FulfillPhotoModal from '@/components/FulfillPhotoModal'

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
  matches: Match[]
}

interface Match {
  id: string
  donorId: string
  status: string
  photoUrl?: string | null
  photoUploadedAt?: string | null
  donorContact?: { name: string; phone: string | null } | null
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
  NO_SHOW: 'text-[#F87171] bg-[#F87171]/10 border-[#F87171]/20',
}

type Tab = 'ALL' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED'

const TABS: Tab[] = ['ALL', 'PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

export default function HospitalRequestsPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  // Which request is currently having a proof photo attached, if any.
  const [fulfillingRequest, setFulfillingRequest] = useState<BloodRequest | null>(null)
  // Blood-bag photo opened full size.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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

  const getAcceptedMatch = (req: BloodRequest) =>
    req.matches?.find(m => m.status === 'ACCEPTED')

  const getAcceptedContact = (req: BloodRequest) =>
    req.matches?.find(m => m.status === 'ACCEPTED')?.donorContact

  // The proof photo lives on the COMPLETED match once the donation is confirmed.
  const getCompletedMatch = (req: BloodRequest) =>
    req.matches?.find(m => m.status === 'COMPLETED')

  const handleCancel = async (id: string) => {
    setUpdatingKey(`${id}-cancel`)
    try {
      await api.put(`/api/requests/${id}`, { newStatus: 'EXPIRED' })
      await fetchRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleNoShow = async (matchId: string) => {
    setUpdatingKey(`${matchId}-noshow`)
    try {
      await api.patch(`/api/hospital/matches/${matchId}/no-show`)
      await fetchRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingKey(null)
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
              className={`text-sm px-4 py-2 border-b-2 transition-colors duration-150 ${activeTab === tab
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
          {filteredRequests.map((req) => {
            const acceptedContact = getAcceptedContact(req)
            const acceptedMatch = getAcceptedMatch(req)
            const completedMatch = getCompletedMatch(req)

            return (
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

                  {req.status === 'MATCHED' && acceptedMatch && (
                    acceptedContact ? (
                      <p className="text-green-400 text-xs mt-1">
                        ✓ Accepted by {acceptedContact.name}
                        {acceptedContact.phone ? ` · ${acceptedContact.phone}` : ''}
                      </p>
                    ) : (
                      <p className="text-[#6B7280] text-xs mt-1">
                        ✓ Accepted — contact info not shared
                      </p>
                    )
                  )}

                  {completedMatch?.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(completedMatch.photoUrl!)}
                      className="mt-2.5 flex items-center gap-2 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={completedMatch.photoUrl}
                        alt="Blood bag proof of donation"
                        className="w-10 h-10 rounded-md object-cover border border-[#2A2A2A] group-hover:border-[#3A3A3A] transition-colors duration-150"
                      />
                      <span className="text-[#6B7280] group-hover:text-[#9CA3AF] text-xs transition-colors duration-150">
                        Proof photo
                        {completedMatch.photoUploadedAt
                          ? ` · ${new Date(completedMatch.photoUploadedAt).toLocaleDateString()}`
                          : ''}
                      </span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {req.status === 'MATCHED' && acceptedMatch && (
                    <button
                      onClick={() => setFulfillingRequest(req)}
                      className="text-xs bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/20 px-3 py-1.5 rounded-md transition-colors duration-150"
                    >
                      Mark Fulfilled
                    </button>
                  )}

                  {req.status === 'MATCHED' && acceptedMatch && (
                    <button
                      onClick={() => handleNoShow(acceptedMatch.id)}
                      disabled={updatingKey === `${acceptedMatch.id}-noshow`}
                      className="text-xs bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-400/20 px-3 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-50"
                    >
                      {updatingKey === `${acceptedMatch.id}-noshow` ? 'Processing...' : 'Report No-Show'}
                    </button>
                  )}

                  {(req.status === 'PENDING' || req.status === 'MATCHED') && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={updatingKey === `${req.id}-cancel`}
                      className="text-xs bg-[#6B7280]/10 hover:bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/20 px-3 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-50"
                    >
                      {updatingKey === `${req.id}-cancel` ? 'Processing...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {fulfillingRequest && (
        <FulfillPhotoModal
          requestId={fulfillingRequest.id}
          bloodGroupLabel={bloodGroupLabels[fulfillingRequest.bloodGroup] || fulfillingRequest.bloodGroup}
          donorName={getAcceptedContact(fulfillingRequest)?.name}
          onClose={() => setFulfillingRequest(null)}
          onSuccess={async () => {
            setFulfillingRequest(null)
            await fetchRequests()
          }}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Blood bag proof of donation"
            className="max-w-full max-h-full rounded-xl border border-[#2A2A2A]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-5 right-5 text-[#9CA3AF] hover:text-white text-sm bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-1.5"
          >
            Close
          </button>
        </div>
      )}

    </div>
  )
}