'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Check, Inbox, Droplet, ArrowLeft, ShieldCheck, MapPin, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { Texture } from '@/components/fk'

interface Match {
  id: string
  status: string
  createdAt: string
  photoUrl?: string | null
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

type Tab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
const TABS: Tab[] = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED']

export default function DonorMatchesPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'DONOR') { router.push('/'); return }
    fetchMatches()
  }, [user])

  const fetchMatches = async () => {
    try {
      const res = await api.get('/api/donor/matches')
      setMatches(res.data.matches || [])
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

  const filteredMatches = useMemo(() => {
    if (activeTab === 'ALL') return matches
    return matches.filter(m => m.status === activeTab)
  }, [matches, activeTab])

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Loading incoming emergency dispatches...
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
          href="/donor/dashboard"
          className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-bone transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Donor Dashboard</span>
        </Link>

        {/* Masthead */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-line pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood w-fit mb-3">
              <Droplet className="h-3 w-3 fill-blood" />
              <span>Transfusion Dispatch Log</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl">
              My Emergency Matches
            </h1>
            <p className="mt-1.5 text-sm text-mute">
              History of all hospital emergency dispatches routed to your profile.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/80 px-4 py-2 text-right font-mono text-xs text-bone">
            <span className="font-bold text-blood text-lg">{matches.length}</span> Total Requests
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(tab => {
            const count = tab === 'ALL'
              ? matches.length
              : matches.filter(m => m.status === tab).length
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

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center backdrop-blur-md">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised text-mute">
              <Inbox className="h-6 w-6 text-faint" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-bone">No Matches Found</h3>
            <p className="mt-1 text-xs text-mute">
              {activeTab === 'ALL'
                ? 'When a verified medical center alerts your blood group, it will appear here.'
                : `You currently have no ${activeTab.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map(match => {
              const isPending = match.status === 'PENDING'
              const isCritical = match.request.urgency === 'CRITICAL'

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border p-5 backdrop-blur-md transition-all ${
                    isPending && isCritical
                      ? 'border-blood/50 bg-surface shadow-[0_0_20px_-8px_rgba(220,38,38,0.3)]'
                      : 'border-line bg-surface/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-blood/30 bg-blood/10 shadow-inner">
                        <span className="font-mono text-lg font-bold text-blood">
                          {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-bone truncate">{match.request.hospital.name}</p>
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? 'border border-blood bg-blood/20 text-blood'
                                : 'border border-line bg-raised text-mute'
                            }`}
                          >
                            {match.request.urgency}
                          </span>
                          <span className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone font-medium">
                            {match.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-mute truncate">{match.request.hospital.address}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                          <span>{match.request.units} Unit{match.request.units > 1 ? 's' : ''} Needed</span>
                          <span>•</span>
                          <span>{new Date(match.createdAt).toLocaleDateString()}</span>
                        </div>

                        {match.status === 'COMPLETED' && match.photoUrl && (
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(match.photoUrl!)}
                              className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line hover:border-blood cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={match.photoUrl} alt="Bag proof" className="h-full w-full object-cover" />
                            </button>
                            <span className="text-xs text-bone font-medium">
                              Photo-verified collection proof
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-line sm:border-t-0">
                        <button
                          onClick={() => respondToMatch(match.id, 'ACCEPTED')}
                          disabled={respondingId === match.id}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-blood py-2 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => respondToMatch(match.id, 'DECLINED')}
                          disabled={respondingId === match.id}
                          className="flex-1 sm:flex-none rounded-xl border border-line bg-raised py-2 px-3 text-xs font-medium text-mute hover:text-bone transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          Decline
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

      {/* Lightbox for Photo Proof */}
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
              Tamper-proof photo proof uploaded by the hospital upon collection.
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
