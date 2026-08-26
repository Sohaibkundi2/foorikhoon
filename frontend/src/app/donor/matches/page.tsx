'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Check, Inbox } from 'lucide-react'
import {
  Chip,
  EmptyState,
  SectionLabel,
  Texture,
  affirmBtn,
  ghostBtn,
  statusTone,
  urgencyTone
} from '@/components/fk'

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
  // Blood-bag proof photo opened full size.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-12">

        {/* Masthead. The count is the headline figure here — this page is a
            record of what the donor has been asked for, so it leads with how
            many, not with a restatement of the page name. */}
        <div className="relative flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Donor</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              My Matches
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Blood requests you&apos;ve been matched with.
            </p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] tabular-nums text-faint">
            {matches.length} total
          </p>
        </div>

        {/* Filter rail. A vertical mono list on wide screens instead of a tab
            strip: the counts line up as a column of figures you can compare,
            which a horizontal row of pills cannot do. */}
        <div className="mt-10 grid gap-10 md:grid-cols-[11rem_1fr] md:gap-12">

          <nav aria-label="Filter matches" className="md:border-r md:border-line-soft md:pr-6">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-line">
              Status
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 md:block">
              {TABS.map(tab => {
                const count = tab === 'ALL'
                  ? matches.length
                  : matches.filter(m => m.status === tab).length
                const active = activeTab === tab

                return (
                  <li key={tab}>
                    <button
                      onClick={() => setActiveTab(tab)}
                      aria-current={active ? 'true' : undefined}
                      className={`group relative flex w-full items-center justify-between gap-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150 ${
                        active ? 'text-bone' : 'text-faint hover:text-mute'
                      }`}
                    >
                      {/* The active marker is a rule, not a fill — it reads as a
                          cursor in a list rather than a selected chip. */}
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={`h-px transition-all duration-200 ${
                            active ? 'w-4 bg-blood' : 'w-0 bg-transparent group-hover:w-2 group-hover:bg-line'
                          }`}
                        />
                        {tab}
                      </span>
                      <span className={`tabular-nums ${active ? 'text-blood' : 'text-line'}`}>
                        {count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Ledger. Each row carries the date in its own left gutter, so the
              list reads chronologically down the page. */}
          <div className="min-w-0">
            <SectionLabel heading>
              {activeTab === 'ALL' ? 'All matches' : activeTab.toLowerCase()}
            </SectionLabel>

            {filteredMatches.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No matches in this category."
                hint={
                  activeTab === 'ALL'
                    ? 'Requests you are matched with will appear here.'
                    : `You have no ${activeTab.toLowerCase()} matches.`
                }
              />
            ) : (
              <ul className="border-t border-line">
                {filteredMatches.map((match) => (
                  <li
                    key={match.id}
                    className="relative border-b border-line-soft py-6 transition-colors duration-150 hover:bg-surface/50"
                  >
                    {match.request.urgency === 'CRITICAL' && match.status === 'PENDING' && (
                      <span aria-hidden className="absolute inset-y-0 -left-4 w-[2px] bg-blood" />
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">

                      <div className="min-w-0 flex-1">
                        {/* Date sits above the hospital name as a dateline —
                            small, mono, unemphasised. */}
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] tabular-nums text-line">
                          {new Date(match.createdAt).toLocaleDateString()}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          <span className="truncate text-base font-medium tracking-[-0.01em] text-bone">
                            {match.request.hospital.name}
                          </span>
                          <Chip tone={urgencyTone[match.request.urgency]}>
                            {match.request.urgency}
                          </Chip>
                          <Chip tone={statusTone[match.status]}>{match.status}</Chip>
                        </div>

                        <p className="mt-1.5 truncate text-xs text-mute">
                          {match.request.hospital.address}
                        </p>

                        <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-faint">
                          Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                          <span className="text-blood">
                            {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                          </span>
                        </p>

                        {match.status === 'COMPLETED' && match.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(match.photoUrl!)}
                            className="group mt-3.5 flex items-center gap-2.5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={match.photoUrl}
                              alt="Blood bag proof of donation"
                              className="h-10 w-10 rounded-md border border-line object-cover transition-colors duration-150 group-hover:border-blood/40"
                            />
                            <span className="flex items-center gap-1.5 text-xs text-life/80 transition-colors duration-150 group-hover:text-life">
                              <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                              Collection verified by photo
                            </span>
                          </button>
                        )}
                      </div>

                      {match.status === 'PENDING' && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => respondToMatch(match.id, 'ACCEPTED')}
                            disabled={respondingId === match.id}
                            className={affirmBtn}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                            Accept
                          </button>
                          <button
                            onClick={() => respondToMatch(match.id, 'DECLINED')}
                            disabled={respondingId === match.id}
                            className={ghostBtn}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Blood bag proof of donation"
              className="max-h-[75vh] max-w-full rounded-xl border border-line"
            />
            <p className="max-w-sm text-center text-xs text-faint">
              Photo uploaded by the hospital when your donation was collected. Only you and
              that hospital can view it.
            </p>
          </div>
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
