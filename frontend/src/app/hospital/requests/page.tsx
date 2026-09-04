'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import FulfillPhotoModal from '@/components/FulfillPhotoModal'
import { Check, ClipboardList, Clock, Plus, TriangleAlert, ArrowLeft, Droplet, User, Phone, X } from 'lucide-react'
import Link from 'next/link'
import {
  Chip,
  EmptyState,
  Texture,
  statusTone,
  urgencyTone
} from '@/components/fk'

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

type Tab = 'ALL' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED'
const TABS: Tab[] = ['ALL', 'PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

export default function HospitalRequestsPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [fulfillingRequest, setFulfillingRequest] = useState<BloodRequest | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
    fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/hospital/requests')
      setRequests(res.data.requests || [])
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

  const filteredRequests = useMemo(() => {
    if (activeTab === 'ALL') return requests
    return requests.filter(r => r.status === activeTab)
  }, [requests, activeTab])

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Retrieving hospital requisitions & donor responses...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/hospital/dashboard"
          className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-bone transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Hospital Dashboard</span>
        </Link>

        {/* Masthead */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-line pb-6 mb-8">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
              Hospital Requisitions Ledger
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-bone sm:text-4xl">
              All Blood Requests
            </h1>
            <p className="mt-1 text-sm text-mute">
              Monitor active candidate responses, donor contacts, and photo verification fulfillment.
            </p>
          </div>

          <Link
            href="/hospital/request/new"
            className="flex items-center gap-2 rounded-xl bg-blood px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Broadcast Request</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(tab => {
            const count = tab === 'ALL'
              ? requests.length
              : requests.filter(r => r.status === tab).length
            const active = activeTab === tab

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? 'border border-blood bg-blood text-white font-bold shadow-[0_0_15px_-3px_rgba(220,38,38,0.5)]'
                    : 'border border-line bg-surface/80 text-mute hover:text-bone hover:border-line-soft'
                }`}
              >
                <span>{tab}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  active ? 'bg-white/20 text-white' : 'bg-raised text-faint'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Requisitions List */}
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center backdrop-blur-md">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised text-mute">
              <ClipboardList className="h-6 w-6 text-faint" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-bone">No Requisitions in this Category</h3>
            <p className="mt-1 text-xs text-mute">
              {activeTab === 'ALL'
                ? 'Requests you broadcast to the emergency network will appear here.'
                : `You currently have no ${activeTab.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(req => {
              const acceptedContact = getAcceptedContact(req)
              const acceptedMatch = getAcceptedMatch(req)
              const completedMatch = getCompletedMatch(req)
              const matchCount = req.matches?.length ?? 0
              const isCritical = req.urgency === 'CRITICAL'

              const awaitingCount = req.matches?.filter(m => m.status === 'PENDING').length ?? 0
              const declinedCount = req.matches?.filter(m => m.status === 'DECLINED').length ?? 0
              const stalled = req.status === 'MATCHED' && !acceptedMatch && !completedMatch

              return (
                <div
                  key={req.id}
                  className={`rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all ${
                    isCritical
                      ? 'border-blood/40 bg-surface/90 shadow-[0_0_20px_-8px_rgba(220,38,38,0.25)]'
                      : 'border-line bg-surface/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: Blood specs & details */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-blood/30 bg-blood/10 shadow-inner">
                        <span className="font-mono text-xl font-extrabold text-blood">
                          {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-bone">
                            {req.units} Unit{req.units > 1 ? 's' : ''} Needed
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? 'border border-blood bg-blood/20 text-blood'
                                : 'border border-line bg-raised text-mute'
                            }`}
                          >
                            {req.urgency}
                          </span>
                          <span className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone font-medium">
                            {req.status}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                          <span>{matchCount} Donors Matched</span>
                          <span>•</span>
                          <span>Broadcasted {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>

                        {req.notes && (
                          <p className="mt-2 text-xs italic text-mute border-l-2 border-line pl-2.5">
                            "{req.notes}"
                          </p>
                        )}

                        {/* Accepted Match Info */}
                        {req.status === 'MATCHED' && acceptedMatch && (
                          <div className="mt-3.5 rounded-xl border border-bone/20 bg-raised/70 p-3 flex items-center gap-3">
                            <Check className="h-4 w-4 text-blood shrink-0" />
                            <div className="text-xs">
                              {acceptedContact ? (
                                <p className="text-bone font-semibold">
                                  Accepted by {acceptedContact.name} {acceptedContact.phone ? `(${acceptedContact.phone})` : ''}
                                </p>
                              ) : (
                                <p className="text-bone font-semibold">
                                  Accepted by on-call donor (Direct phone private)
                                </p>
                              )}
                              <p className="text-[10px] text-mute mt-0.5">
                                Please prepare cross-match and upload bag photo upon collection.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Stalled or Awaiting Info */}
                        {stalled && (
                          <div className="mt-3 text-xs text-amber-200/90 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>
                              {awaitingCount > 0
                                ? `Waiting on ${awaitingCount} alerted donor(s) to respond.`
                                : `All ${declinedCount} alerted donor(s) were unavailable.`}
                            </span>
                          </div>
                        )}

                        {/* Completed Photo Proof Preview */}
                        {completedMatch?.photoUrl && (
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(completedMatch.photoUrl!)}
                              className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line hover:border-blood cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={completedMatch.photoUrl}
                                alt="Blood bag proof"
                                className="h-full w-full object-cover"
                              />
                            </button>
                            <div>
                              <p className="text-xs font-semibold text-bone">Transfusion Completed</p>
                              <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                                Photo Proof Attached
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Hospital Action Buttons */}
                    {(req.status === 'PENDING' || req.status === 'MATCHED') && (
                      <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0 pt-3 sm:pt-0 border-t border-line sm:border-t-0">
                        {req.status === 'MATCHED' && acceptedMatch && (
                          <button
                            onClick={() => setFulfillingRequest(req)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-blood py-2 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-all active:scale-95 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Fulfilled</span>
                          </button>
                        )}

                        {req.status === 'MATCHED' && acceptedMatch && (
                          <button
                            onClick={() => handleNoShow(acceptedMatch.id)}
                            disabled={updatingKey === `${acceptedMatch.id}-noshow`}
                            className="flex-1 sm:flex-none rounded-xl border border-line bg-raised py-2 px-3 text-xs font-medium text-mute hover:text-bone transition-colors active:scale-95 cursor-pointer"
                          >
                            {updatingKey === `${acceptedMatch.id}-noshow` ? 'Reporting...' : 'Report No-Show'}
                          </button>
                        )}

                        <button
                          onClick={() => handleCancel(req.id)}
                          disabled={updatingKey === `${req.id}-cancel`}
                          className="flex-1 sm:flex-none rounded-xl border border-line bg-surface py-2 px-3 text-xs font-medium text-mute hover:text-bone hover:border-blood transition-colors active:scale-95 cursor-pointer"
                        >
                          {updatingKey === `${req.id}-cancel` ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fulfill Photo Verification Modal */}
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

      {/* Proof Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Blood bag proof of donation"
              className="max-h-[75vh] max-w-full rounded-2xl border border-line shadow-2xl"
            />
            <p className="max-w-sm text-center text-xs text-mute">
              Tamper-proof collection label photo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-5 top-5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-bone hover:border-blood transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
