'use client'

import { useEffect, useState, useMemo } from 'react'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Check, Droplet, Link2, ShieldCheck, X, AlertTriangle, Radio, Sparkles, Filter, ChevronRight } from 'lucide-react'
import {
  Chip,
  EmptyState,
  LiveDot,
  Texture,
  filterSelectClass,
  primaryBtn,
  quietBtn,
  urgencyTone
} from '@/components/fk'
import { motion, AnimatePresence } from 'motion/react'

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
      .then(res => setRequests(res.data.requests || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cities = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.hospital.user?.city).filter(Boolean))) as string[]
  }, [requests])

  const filtered = useMemo(() => {
    return requests
      .filter(req => {
        if (cityFilter !== 'ALL' && req.hospital.user?.city !== cityFilter) return false
        if (bloodGroupFilter !== 'ALL' && req.bloodGroup !== bloodGroupFilter) return false
        if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) return false
        return true
      })
      .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
  }, [requests, cityFilter, bloodGroupFilter, urgencyFilter])

  const criticalCount = useMemo(() => {
    return requests.filter(r => r.urgency === 'CRITICAL').length
  }, [requests])

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
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <Texture ember={true} noise={true} grid={true} />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Header with Telemetry Strip */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
              <LiveDot />
              <span>National Emergency Broadcast Grid</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-blood" />
              <span>Updated in real time</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl md:text-5xl">
                Active Hospital Requests
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute sm:text-base">
                Verified hospital emergency transmissions across Pakistan. Registered donors receive automatic geo-targeted dispatch alerts.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-xl bg-blood px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-95"
              >
                <Droplet className="h-4 w-4 fill-white" />
                <span>Join On-Call Donors</span>
              </Link>
            </div>
          </div>

          {/* Quick Telemetry Counters */}
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface/70 p-3.5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Open Requests</p>
              <p className="mt-1 font-mono text-2xl font-bold text-bone">{requests.length}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/70 p-3.5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Critical Status</p>
              <p className="mt-1 font-mono text-2xl font-bold text-blood">{criticalCount}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/70 p-3.5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Active Cities</p>
              <p className="mt-1 font-mono text-2xl font-bold text-bone">{cities.length || 1}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/70 p-3.5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Verification</p>
              <p className="mt-1 font-mono text-xs font-medium text-bone leading-tight">
                Photo Proof & Bag Label Required
              </p>
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="mb-6 rounded-2xl border border-line bg-surface/80 p-3.5 backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 pr-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-mute">
                <Filter className="h-3 w-3 text-blood" />
                <span>Filters</span>
              </div>

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
                <option value="ALL">All Urgency Levels</option>
                {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg border border-line bg-raised px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-mute transition-colors hover:text-bone hover:border-blood"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Blood Type Quick Badges (Horizontal scroll on mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar lg:pb-0">
              <button
                onClick={() => setBloodGroupFilter('ALL')}
                className={`shrink-0 rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                  bloodGroupFilter === 'ALL'
                    ? 'bg-bone text-ink font-bold shadow-sm'
                    : 'bg-raised text-mute hover:text-bone'
                }`}
              >
                All
              </button>
              {bloodGroups.map(bg => {
                const active = bloodGroupFilter === bg
                return (
                  <button
                    key={bg}
                    onClick={() => setBloodGroupFilter(active ? 'ALL' : bg)}
                    className={`shrink-0 rounded-lg px-2 py-1 font-mono text-[11px] transition-all ${
                      active
                        ? 'border border-blood bg-blood/20 font-bold text-blood shadow-[0_0_10px_-2px_rgba(220,38,38,0.5)]'
                        : 'border border-line bg-raised text-mute hover:text-bone'
                    }`}
                  >
                    {bloodGroupLabels[bg]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
              <p className="font-mono text-xs uppercase tracking-widest text-faint">
                Searching live emergency blood requests...
              </p>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-raised" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-raised" />
                    <div className="h-3 w-64 rounded bg-raised" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface/70 p-8 text-center backdrop-blur-md sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised text-mute">
              <Droplet className="h-6 w-6 text-blood" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-bone">No Active Broadcasts Found</h3>
            <p className="mt-1.5 text-xs text-mute sm:text-sm">
              {hasFilters
                ? 'No requests match your selected filters. Try clearing your search parameters.'
                : 'All hospital emergency requests are currently fulfilled or in transfusion transit.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-line bg-raised px-4 py-2 text-xs font-semibold text-bone hover:border-blood transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Request Cards Grid */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(req => {
              const isCritical = req.urgency === 'CRITICAL'
              return (
                <div
                  key={req.id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:bg-surface/90 ${
                    isCritical
                      ? 'border-blood/40 bg-surface/90 shadow-[0_0_20px_-8px_rgba(220,38,38,0.25)]'
                      : 'border-line bg-surface/70'
                  }`}
                >
                  {isCritical && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-blood" />
                  )}

                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    {/* Left: Blood Group & Details */}
                    <div className="flex items-start gap-3.5 sm:gap-4">
                      {/* Blood Group Tag */}
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-blood/30 bg-blood/10 shadow-inner">
                        <span className="font-mono text-xl font-bold tracking-tight text-blood">
                          {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-mute">
                          Required
                        </span>
                      </div>

                      {/* Hospital & Request Specs */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/requests/${req.id}`}
                            className="text-sm font-semibold tracking-tight text-bone hover:text-white sm:text-base"
                          >
                            {req.hospital.name}
                          </Link>

                          {req.hospital.verified && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone font-medium">
                              <ShieldCheck className="h-3 w-3 text-blood" />
                              <span>Verified Hospital</span>
                            </span>
                          )}

                          <span
                            className={`rounded-md px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${
                              isCritical
                                ? 'border border-blood bg-blood/20 text-blood'
                                : req.urgency === 'URGENT'
                                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                                : 'border border-line bg-raised text-mute'
                            }`}
                          >
                            {req.urgency}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-mute">
                          {req.hospital?.user?.city ? `${req.hospital.user.city} • ` : ''}
                          {req.hospital?.address}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                          <span className="text-bone font-semibold">
                            {req.units} Unit{req.units !== 1 ? 's' : ''} Needed
                          </span>
                          <span>•</span>
                          <span>{req.matches?.length || 0} Donors Notified</span>
                          <span>•</span>
                          <span>{dayjs(req.createdAt).fromNow()}</span>
                        </div>

                        {req.notes && (
                          <p className="mt-2 text-xs italic text-mute/90 border-l-2 border-line pl-2.5">
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-line sm:pt-0 sm:border-t-0 sm:flex-col sm:items-stretch sm:shrink-0 sm:w-36">
                      <Link
                        href={`/requests/${req.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blood py-2 px-3 text-center text-xs font-semibold text-white shadow transition-all hover:bg-blood-dark active:scale-98"
                      >
                        <span>Respond</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        onClick={() => handleShare(req.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-raised py-2 px-3 text-xs font-medium text-mute hover:text-bone hover:border-line-soft transition-colors cursor-pointer active:scale-98"
                        aria-label="Share emergency broadcast"
                      >
                        {copied === req.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-blood" />
                            <span className="text-bone font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
