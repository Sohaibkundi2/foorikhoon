'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Check, Droplet, Link2, ShieldCheck, X } from 'lucide-react'
import {
  Chip,
  EmptyState,
  LiveDot,
  PageHead,
  Texture,
  filterSelectClass,
  primaryBtn,
  quietBtn,
  urgencyTone
} from '@/components/fk'

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

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-5xl px-6 py-12">

        <PageHead
          eyebrow={<><LiveDot /> Live feed</>}
          title="Blood requests"
          lede={
            <>
              Active requests from hospitals across Pakistan.{' '}
              <Link
                href="/register"
                className="text-bone underline decoration-line underline-offset-4 transition-colors hover:decoration-blood"
              >
                Register as a donor
              </Link>{' '}
              to respond.
            </>
          }
        />

        {/* Filters. A rule-bounded band rather than a card — it is a control strip
            for the list below it, not a separate object sitting above it. */}
        <div className="mb-7 border-y border-line-soft py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span aria-hidden className="mr-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-line">
              Filter
            </span>

            <select
              aria-label="Filter by city"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className={filterSelectClass}
            >
              <option value="ALL">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              aria-label="Filter by blood group"
              value={bloodGroupFilter}
              onChange={e => setBloodGroupFilter(e.target.value)}
              className={filterSelectClass}
            >
              <option value="ALL">All Blood Groups</option>
              {bloodGroups.map(bg => (
                <option key={bg} value={bg}>{bloodGroupLabels[bg]}</option>
              ))}
            </select>

            <select
              aria-label="Filter by urgency"
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value)}
              className={filterSelectClass}
            >
              <option value="ALL">All Urgency</option>
              {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {hasFilters && (
              <button onClick={clearFilters} className={quietBtn}>
                <X className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                Clear filters
              </button>
            )}

            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] tabular-nums text-faint">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-6 sm:px-6">
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-raised" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-44 animate-pulse rounded bg-raised" />
                  <div className="h-2.5 w-64 animate-pulse rounded bg-raised" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Droplet}
            title="No requests found"
            hint={hasFilters ? 'Try changing your filters.' : 'No active blood requests right now.'}
          >
            {hasFilters && (
              <button onClick={clearFilters} className={quietBtn}>
                <X className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                Clear all filters
              </button>
            )}
          </EmptyState>
        )}

        {/* Request rows. One continuous list divided by hairlines: a queue of
            comparable items, which detached cards would not communicate. */}
        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
            {filtered.map(req => (
              <li
                key={req.id}
                className="relative transition-colors duration-150 hover:bg-raised/40"
              >
                {/* Critical requests get an edge rather than a whole coloured
                    border: it scans down the list without shouting per-row. */}
                {req.urgency === 'CRITICAL' && (
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blood" />
                )}

                <div className="flex items-start justify-between gap-5 px-5 py-6 sm:px-6">

                  {/* Left */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">

                    {/* Blood group. Mono, because it is an enum value out of the
                        database and not a decorative badge. */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blood/25 bg-blood/10">
                      <span className="font-mono text-base font-medium tracking-[0.02em] text-blood">
                        {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-bone">
                          {req.hospital.name}
                        </span>
                        {req.hospital.verified && (
                          <Chip tone="text-life bg-life/10 border-life/25" icon={ShieldCheck}>
                            Verified
                          </Chip>
                        )}
                        <Chip tone={urgencyTone[req.urgency]}>{req.urgency}</Chip>
                      </div>

                      <p className="truncate text-xs text-mute">
                        {req.hospital?.user?.city} · {req.hospital?.address}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-faint">
                        <span>
                          {req.units} unit{req.units !== 1 ? 's' : ''} needed
                        </span>
                        <span aria-hidden className="h-2.5 w-px bg-line" />
                        <span>
                          {req.matches?.length} donor{req.matches?.length !== 1 ? 's' : ''} notified
                        </span>
                        <span aria-hidden className="h-2.5 w-px bg-line" />
                        <span>{dayjs(req.createdAt).fromNow()}</span>
                      </div>

                      {req.notes && (
                        <p className="mt-3 border-l border-line pl-3 text-xs leading-relaxed text-mute">
                          {req.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right — actions */}
                  <div className="flex shrink-0 flex-col items-stretch gap-2">
                    <Link href="/register" className={primaryBtn}>
                      I can help
                    </Link>
                    <button onClick={() => handleShare(req.id)} className={quietBtn}>
                      {copied === req.id ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <Link2 className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                      )}
                      {copied === req.id ? 'Copied' : 'Share'}
                    </button>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  )
}
