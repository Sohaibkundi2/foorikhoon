'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import FulfillPhotoModal from '@/components/FulfillPhotoModal'
import { Check, ClipboardList, Clock, Plus, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import {
  Chip,
  EmptyState,
  Texture,
  affirmBtn,
  dangerBtn,
  neutralBtn,
  primaryBtn,
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
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-12">

        {/* Masthead */}
        <div className="relative flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Hospital</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Blood Requests
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Every request you have filed, and what is outstanding on each one.
            </p>
          </div>
          <Link href="/hospital/request/new" className={primaryBtn}>
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            New Request
          </Link>
        </div>

        {/* Index row. A rule-bounded band rather than underlined tabs: tabs imply
            separate pages, and these are five views of one list. The count sits
            above the label as a figure, so the row reads as an index. */}
        <nav aria-label="Filter requests" className="mt-7 border-y border-line-soft">
          <ul className="flex flex-wrap">
            {TABS.map(tab => {
              const count = tab === 'ALL'
                ? requests.length
                : requests.filter(r => r.status === tab).length
              const active = activeTab === tab

              return (
                <li key={tab}>
                  <button
                    onClick={() => setActiveTab(tab)}
                    aria-current={active ? 'true' : undefined}
                    className={`relative px-4 py-3 text-left transition-colors duration-150 ${
                      active ? 'text-bone' : 'text-faint hover:text-mute'
                    }`}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-x-3 top-0 h-px bg-blood" />
                    )}
                    <span
                      className={`block font-mono text-lg font-medium leading-none tabular-nums ${
                        active ? 'text-blood' : 'text-line'
                      }`}
                    >
                      {count}
                    </span>
                    <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.14em]">
                      {tab}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Case files. Each request keeps its identifying figures in a left rail
            and everything actionable in the body, so the list can be scanned
            down the rail without reading any of the detail. */}
        {filteredRequests.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={ClipboardList}
              title="No requests in this category."
              hint={
                activeTab === 'ALL'
                  ? 'Requests you file will be listed here.'
                  : `You have no ${activeTab.toLowerCase()} requests.`
              }
            />
          </div>
        ) : (
          <ul className="mt-10 border-t border-line">
            {filteredRequests.map((req) => {
              const acceptedContact = getAcceptedContact(req)
              const acceptedMatch = getAcceptedMatch(req)
              const completedMatch = getCompletedMatch(req)
              const matchCount = req.matches?.length ?? 0

              // Why a MATCHED request can sit with nothing to act on. Both actions
              // are gated on an ACCEPTED match, so without one the hospital sees
              // only Cancel — and previously no reason why. Both figures come
              // straight off the matches already in the payload.
              const awaitingCount = req.matches?.filter(m => m.status === 'PENDING').length ?? 0
              const declinedCount = req.matches?.filter(m => m.status === 'DECLINED').length ?? 0
              const stalled =
                req.status === 'MATCHED' && !acceptedMatch && !completedMatch

              return (
                <li
                  key={req.id}
                  className="relative border-b border-line md:grid md:grid-cols-[7rem_minmax(0,1fr)]"
                >
                  {req.urgency === 'CRITICAL' && (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blood" />
                  )}

                  {/* Rail: group, quantity, date — a specimen label, mono and plain. */}
                  <div className="flex items-center gap-4 pl-5 pt-6 md:block md:border-r md:border-line-soft md:pb-6 md:pr-5">
                    <p className="font-mono text-3xl font-medium leading-none tracking-[-0.02em] text-blood">
                      {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] tabular-nums text-mute md:mt-3">
                      {req.units} unit{req.units > 1 ? 's' : ''}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-line md:mt-1.5">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="pb-6 pl-5 pt-4 md:pl-6 md:pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={urgencyTone[req.urgency]}>{req.urgency}</Chip>
                      <Chip tone={statusTone[req.status]}>{req.status}</Chip>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-faint">
                        {matchCount} donor{matchCount !== 1 ? 's' : ''} matched
                      </span>
                    </div>

                    {req.notes && (
                      <p className="mt-3 border-l border-line pl-3 text-sm leading-relaxed text-mute">
                        {req.notes}
                      </p>
                    )}

                    {req.status === 'MATCHED' && acceptedMatch && (
                      acceptedContact ? (
                        <p className="mt-3.5 flex items-center gap-2 text-sm text-life-lite">
                          <Check className="h-3.5 w-3.5 shrink-0 text-life" strokeWidth={2.5} aria-hidden />
                          Accepted by {acceptedContact.name}
                          {acceptedContact.phone ? ` · ${acceptedContact.phone}` : ''}
                        </p>
                      ) : (
                        <p className="mt-3.5 flex items-center gap-2 text-sm text-mute">
                          <Check className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={2.5} aria-hidden />
                          Accepted — contact info not shared
                        </p>
                      )
                    )}

                    {stalled && (
                      <p className="mt-3.5 flex items-start gap-2 text-xs leading-relaxed text-warn">
                        {awaitingCount > 0 ? (
                          <>
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                            <span>
                              Waiting on {awaitingCount} donor
                              {awaitingCount > 1 ? 's' : ''} to respond. Nothing to confirm until
                              one accepts.
                            </span>
                          </>
                        ) : (
                          <>
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                            <span>
                              {declinedCount > 0
                                ? `All ${declinedCount} matched donor${declinedCount > 1 ? 's' : ''} declined.`
                                : 'No donor has accepted.'}{' '}
                              There is no donor to confirm against, so this request can only be
                              cancelled and filed again.
                            </span>
                          </>
                        )}
                      </p>
                    )}

                    {completedMatch?.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(completedMatch.photoUrl!)}
                        className="group mt-4 flex items-center gap-2.5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={completedMatch.photoUrl}
                          alt="Blood bag proof of donation"
                          className="h-10 w-10 rounded-md border border-line object-cover transition-colors duration-150 group-hover:border-blood/40"
                        />
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint transition-colors duration-150 group-hover:text-bone">
                          Proof photo
                          {completedMatch.photoUploadedAt
                            ? ` · ${new Date(completedMatch.photoUploadedAt).toLocaleDateString()}`
                            : ''}
                        </span>
                      </button>
                    )}

                    {/* Actions sit below a hairline, not beside the detail: they
                        belong to the whole record, and a right-hand button stack
                        squeezes the notes into a column at tablet width. */}
                    {(req.status === 'PENDING' || req.status === 'MATCHED') && (
                      <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line-soft pt-4">
                        {req.status === 'MATCHED' && acceptedMatch && (
                          <button onClick={() => setFulfillingRequest(req)} className={affirmBtn}>
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                            Mark Fulfilled
                          </button>
                        )}

                        {req.status === 'MATCHED' && acceptedMatch && (
                          <button
                            onClick={() => handleNoShow(acceptedMatch.id)}
                            disabled={updatingKey === `${acceptedMatch.id}-noshow`}
                            className={dangerBtn}
                          >
                            {updatingKey === `${acceptedMatch.id}-noshow` ? 'Processing...' : 'Report No-Show'}
                          </button>
                        )}

                        <button
                          onClick={() => handleCancel(req.id)}
                          disabled={updatingKey === `${req.id}-cancel`}
                          className={neutralBtn}
                        >
                          {updatingKey === `${req.id}-cancel` ? 'Processing...' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Blood bag proof of donation"
            className="max-h-full max-w-full rounded-xl border border-line"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-5 top-5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-mute transition-colors hover:text-bone"
          >
            Close
          </button>
        </div>
      )}

    </div>
  )
}
