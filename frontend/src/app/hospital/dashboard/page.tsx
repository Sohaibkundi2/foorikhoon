'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ArrowRight, BadgeCheck, Clock, Plus, TriangleAlert } from 'lucide-react'
import {
  Chip,
  LiveDot,
  SectionLabel,
  SegmentMeter,
  Texture,
  primaryBtn,
  quietBtn,
  statusTone,
  urgencyTone
} from '@/components/fk'

dayjs.extend(relativeTime)

interface HospitalProfile {
  id: string
  name: string
  address: string
  licenseNo: string
  verified: boolean
  user: {
    name: string
    email: string
    city: string
    phone: string | null
  }
}

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

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

/**
 * Below this many units a group counts as low. Not a number invented for the UI —
 * it is the same threshold `hospital.controller.ts` uses to build the `lowStock`
 * array for the analytics endpoint, so the dashboard and the analytics page agree.
 */
const LOW_STOCK_UNITS = 5

/**
 * The worklist grid. One column template shared by the header row and every data
 * row, so the two cannot drift apart. Below `md` it collapses to a block stack —
 * a five-column table at phone width is unreadable, and a horizontally scrolling
 * one is worse.
 */
const WORKLIST_COLS =
  'md:grid md:grid-cols-[4.5rem_minmax(0,1fr)_8rem_7rem_6rem] md:items-center md:gap-x-5'

export default function HospitalDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [hospital, setHospital] = useState<HospitalProfile | null>(null)
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role === 'ADMIN') { router.push('/admin/dashboard'); return }
    if (user.role === 'DONOR') { router.push('/donor/dashboard'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
    fetchData()
  }, [hydrated, user])

  const fetchData = async () => {
    try {
      const [profileRes, requestsRes, inventoryRes] = await Promise.all([
        api.get('/api/hospital/profile'),
        api.get('/api/hospital/requests'),
        api.get('/api/hospital/inventory'),
      ])
      setHospital(profileRes.data.hospitalProfile)
      setRequests(requestsRes.data.requests)
      setInventory(inventoryRes.data.inventory)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'MATCHED')
  const pastRequests = requests.filter(r => r.status === 'FULFILLED' || r.status === 'EXPIRED')

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  // Every figure below is derived from the three payloads already fetched above.
  const fulfilledCount = requests.filter(r => r.status === 'FULFILLED').length
  const unitsOnShelf = inventory.reduce((sum, i) => sum + i.units, 0)
  const lowStock = inventory.filter(i => i.units < LOW_STOCK_UNITS)
  const peakStock = Math.max(...inventory.map(i => i.units), 1)

  return (
    <div className="relative overflow-hidden">
      <Texture ember />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12">

        {/* ── Masthead ────────────────────────────────────────────────────
            Asymmetric: the hospital's identity and its running tally are two
            different kinds of information, so they get two columns rather than
            being flattened into one row of equal-weight boxes. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_17rem] lg:gap-14">

          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              <LiveDot />
              Requisition board
            </p>

            <h1 className="mt-5 text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.04em] text-bone">
              {hospital?.name}
            </h1>

            {/* Hairline dividers rather than middot separators — the metadata is
                a set of distinct fields, not a sentence. */}
            <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              <span>{hospital?.user.city}</span>
              {hospital?.address && (
                <>
                  <span aria-hidden className="h-2.5 w-px bg-line" />
                  <span className="normal-case tracking-normal text-faint">{hospital.address}</span>
                </>
              )}
              {hospital?.licenseNo && (
                <>
                  <span aria-hidden className="h-2.5 w-px bg-line" />
                  <span className="tabular-nums text-faint">Lic {hospital.licenseNo}</span>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {hospital?.verified ? (
                <Chip tone={statusTone.FULFILLED} icon={BadgeCheck}>Verified</Chip>
              ) : (
                <Chip tone={statusTone.PENDING} icon={Clock}>Pending verification</Chip>
              )}
              {lowStock.length > 0 && (
                <Chip tone={urgencyTone.CRITICAL} icon={TriangleAlert}>
                  {lowStock.length} group{lowStock.length > 1 ? 's' : ''} low
                </Chip>
              )}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              <Link href="/hospital/request/new" className={primaryBtn}>
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                New Request
              </Link>
              <Link href="/hospital/requests" className={quietBtn}>All requests</Link>
              <Link href="/hospital/analytics" className={quietBtn}>Analytics</Link>
              <Link href="/hospital/profile" className={quietBtn}>Edit profile</Link>
            </div>
          </div>

          {/* ── Tally ─────────────────────────────────────────────────────
              A column of right-aligned figures rather than a row of cards: read
              down, the four numbers line up on their last digit and can be
              compared at a glance. Cards in a row cannot do that. */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -bottom-2.5 -right-2.5 left-3 top-3 rounded-lg border border-line-soft"
            />
            <div className="relative rounded-lg border border-line bg-surface">
              <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5">
                <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  Standing count
                </p>
                <span aria-hidden className="h-px flex-1 bg-line-soft" />
              </div>

              <dl className="divide-y divide-line-soft">
                {[
                  { label: 'Requests filed', value: requests.length, tone: 'text-bone' },
                  { label: 'Active now', value: activeRequests.length, tone: 'text-blood' },
                  { label: 'Fulfilled', value: fulfilledCount, tone: 'text-life' },
                  { label: 'Units on shelf', value: unitsOnShelf, tone: 'text-bone' },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      {row.label}
                    </dt>
                    <dd className={`font-mono text-2xl font-medium leading-none tabular-nums ${row.tone}`}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* ── 01 Inventory ─────────────────────────────────────────────────
            Stock as a bar per group instead of eight equal tiles. Eight tiles
            make every group look the same until you read all eight numbers; a
            bar is comparable without reading. Bars are scaled to this
            hospital's own largest holding — the unit count is printed beside
            each one so the absolute figure is never inferred from length. */}
        <section className="mt-16">
          <SectionLabel
            heading
            index="01"
            aside={
              <Link
                href="/hospital/inventory"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
              >
                Manage
                <ArrowRight className="h-3 w-3" strokeWidth={2.25} aria-hidden />
              </Link>
            }
          >
            Blood Inventory
          </SectionLabel>

          {inventory.length === 0 ? (
            <div className="border-t border-line py-10">
              <p className="text-sm text-mute">No inventory added yet.</p>
              <Link
                href="/hospital/inventory"
                className="mt-2 inline-block text-xs text-blood underline decoration-blood/30 underline-offset-4 hover:decoration-blood"
              >
                Add inventory
              </Link>
            </div>
          ) : (
            <ul className="border-t border-line md:grid md:grid-cols-2 md:gap-x-12">
              {inventory.map((item) => {
                const low = item.units < LOW_STOCK_UNITS
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 border-b border-line-soft py-3.5"
                  >
                    <span className="w-9 shrink-0 font-mono text-sm font-medium tabular-nums text-blood">
                      {bloodGroupLabels[item.bloodGroup] || item.bloodGroup}
                    </span>

                    <div className="min-w-0 flex-1">
                      <SegmentMeter
                        value={item.units}
                        max={peakStock}
                        segments={12}
                        tone={low ? 'bg-warn' : 'bg-blood'}
                      />
                    </div>

                    <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-bone">
                      {item.units}
                      <span className="ml-1 text-[9px] uppercase tracking-[0.12em] text-faint">u</span>
                    </span>

                    {/* The word, not only the colour — low stock is the one thing
                        on this row a colour-blind reader must not miss. */}
                    <span className="w-9 shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-warn">
                      {low ? 'Low' : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── 02 Active requests ──────────────────────────────────────────
            A worklist with a real column header, because that is what this is:
            a queue somebody works down. Stacked cards hide the comparison that
            matters — which line has the fewest donors matched against it. */}
        <section className="mt-16">
          <SectionLabel
            heading
            index="02"
            aside={
              <Link
                href="/hospital/requests"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
              >
                View all
                <ArrowRight className="h-3 w-3" strokeWidth={2.25} aria-hidden />
              </Link>
            }
          >
            Active Requests
          </SectionLabel>

          {activeRequests.length === 0 ? (
            <div className="border-t border-line py-10">
              <p className="text-sm text-mute">No active requests.</p>
              <Link
                href="/hospital/request/new"
                className="mt-2 inline-block text-xs text-blood underline decoration-blood/30 underline-offset-4 hover:decoration-blood"
              >
                Post a new request
              </Link>
            </div>
          ) : (
            <div>
              <div
                aria-hidden
                className={`${WORKLIST_COLS} hidden border-y border-line px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-line`}
              >
                <span>Group</span>
                <span>Requirement</span>
                <span>Urgency</span>
                <span>Matched</span>
                <span className="text-right">Filed</span>
              </div>

              <ul className="border-t border-line md:border-t-0">
                {activeRequests.map((req) => {
                  const matched = req.matches?.length ?? 0
                  return (
                    <li
                      key={req.id}
                      className="relative border-b border-line-soft transition-colors duration-150 hover:bg-surface/60"
                    >
                      {/* Critical requests get an edge rather than a coloured row:
                          it scans down the queue without shouting per line. */}
                      {req.urgency === 'CRITICAL' && (
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blood" />
                      )}

                      <div className={`${WORKLIST_COLS} px-4 py-4`}>
                        <span className="font-mono text-xl font-medium leading-none tracking-[-0.01em] text-blood">
                          {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                        </span>

                        <div className="mt-2 min-w-0 md:mt-0">
                          <p className="text-sm text-bone">
                            {req.units} unit{req.units > 1 ? 's' : ''}
                          </p>
                          {req.notes && (
                            <p className="mt-1 truncate border-l border-line pl-2.5 text-xs text-mute">
                              {req.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 md:mt-0">
                          <Chip tone={urgencyTone[req.urgency]}>{req.urgency}</Chip>
                          <Chip tone={statusTone[req.status]}>{req.status}</Chip>
                        </div>

                        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums md:mt-0">
                          <span className={matched > 0 ? 'text-bone' : 'text-warn'}>{matched}</span>
                          <span className="text-faint"> donor{matched !== 1 ? 's' : ''}</span>
                        </p>

                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint md:mt-0 md:text-right">
                          {dayjs(req.createdAt).fromNow()}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        {/* ── 03 History ──────────────────────────────────────────────────
            Closed lines, set tighter than the live queue. Nothing here needs
            acting on, so it gets less vertical space and no accent. */}
        {pastRequests.length > 0 && (
          <section className="mt-16">
            <SectionLabel heading index="03">Request History</SectionLabel>

            <ul className="border-t border-line">
              {pastRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line-soft py-3.5"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-9 font-mono text-sm tabular-nums text-mute">
                      {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-faint">
                      {req.units} unit{req.units > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-line">
                      {dayjs(req.createdAt).fromNow()}
                    </span>
                    <Chip tone={statusTone[req.status]}>{req.status}</Chip>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  )
}
