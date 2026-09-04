'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Plus,
  TriangleAlert,
  Building2,
  Droplet,
  Activity,
  ShieldCheck,
  Layers,
  ChevronRight
} from 'lucide-react'
import {
  Chip,
  LiveDot,
  Texture,
  urgencyTone,
  statusTone
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

const LOW_STOCK_UNITS = 5

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
      setRequests(requestsRes.data.requests || [])
      setInventory(inventoryRes.data.inventory || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeRequests = useMemo(() => {
    return requests.filter(r => r.status === 'PENDING' || r.status === 'MATCHED')
  }, [requests])

  const pastRequests = useMemo(() => {
    return requests.filter(r => r.status === 'FULFILLED' || r.status === 'EXPIRED')
  }, [requests])

  const fulfilledCount = requests.filter(r => r.status === 'FULFILLED').length
  const unitsOnShelf = inventory.reduce((sum, i) => sum + i.units, 0)
  const lowStock = inventory.filter(i => i.units < LOW_STOCK_UNITS)
  const peakStock = Math.max(...inventory.map(i => i.units), 1)

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Loading hospital command center & active requests...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top Masthead & Telemetry */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood w-fit">
              <LiveDot />
              <span>Hospital Dispatch Console</span>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl md:text-5xl">
                {hospital?.name}
              </h1>
              <p className="mt-1.5 text-sm text-mute">
                {hospital?.user.city} • {hospital?.address}
                {hospital?.licenseNo && (
                  <span className="font-mono text-xs text-faint"> (Lic #{hospital.licenseNo})</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {hospital?.verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-bone">
                  <BadgeCheck className="h-4 w-4 text-blood" />
                  <span>Accredited Medical Center</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  <Clock className="h-4 w-4" />
                  <span>Verification Under Review</span>
                </span>
              )}

              {lowStock.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-blood/30 bg-blood/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
                  <TriangleAlert className="h-4 w-4" />
                  <span>{lowStock.length} Blood Group{lowStock.length > 1 ? 's' : ''} Deficit</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/hospital/request/new"
                className="flex items-center gap-2 rounded-xl bg-blood px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Post Emergency Request</span>
              </Link>
              <Link
                href="/hospital/requests"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-mute hover:text-bone hover:border-line-soft transition-colors"
              >
                All Requests ({requests.length})
              </Link>
              <Link
                href="/hospital/inventory"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-mute hover:text-bone hover:border-line-soft transition-colors"
              >
                Stock Tracker
              </Link>
              <Link
                href="/hospital/analytics"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-mute hover:text-bone hover:border-line-soft transition-colors"
              >
                Shortage AI
              </Link>
            </div>
          </div>

          {/* Standing Count Card */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Transfusion Operations
              </span>
              <span className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-blood font-semibold">
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-line bg-raised/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Total Requests</p>
                <p className="mt-1 font-mono text-xl font-bold text-bone">{requests.length}</p>
              </div>

              <div className="rounded-2xl border border-blood/30 bg-blood/10 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-blood">Active Now</p>
                <p className="mt-1 font-mono text-xl font-bold text-blood">{activeRequests.length}</p>
              </div>

              <div className="rounded-2xl border border-line bg-raised/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Fulfilled</p>
                <p className="mt-1 font-mono text-xl font-bold text-bone">{fulfilledCount}</p>
              </div>

              <div className="rounded-2xl border border-line bg-raised/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Stocked Units</p>
                <p className="mt-1 font-mono text-xl font-bold text-bone">{unitsOnShelf}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Blood Inventory Health */}
        <div className="mb-10 rounded-3xl border border-line bg-surface/80 p-5 sm:p-7 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blood">01</span>
              <h2 className="text-lg font-bold tracking-tight text-bone">
                Blood Bank Stock Monitor
              </h2>
            </div>

            <Link
              href="/hospital/inventory"
              className="flex items-center gap-1 font-mono text-xs text-mute hover:text-blood transition-colors"
            >
              <span>Manage Units</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-mute">No inventory data recorded for your facility.</p>
              <Link
                href="/hospital/inventory"
                className="mt-2 inline-block text-xs font-semibold text-blood hover:underline"
              >
                Add Inventory Units
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {inventory.map((item) => {
                const isLow = item.units < LOW_STOCK_UNITS
                const pct = Math.min(Math.round((item.units / peakStock) * 100), 100)

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isLow
                        ? 'border-blood/40 bg-blood/10 shadow-[0_0_15px_-4px_rgba(220,38,38,0.2)]'
                        : 'border-line bg-raised/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl font-extrabold text-blood">
                        {bloodGroupLabels[item.bloodGroup] || item.bloodGroup}
                      </span>
                      {isLow && (
                        <span className="font-mono text-[9px] uppercase font-bold text-blood">
                          Deficit
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-bold text-bone">{item.units}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Units</span>
                    </div>

                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isLow ? 'bg-blood' : 'bg-bone/60'
                        }`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 2: Active Requisitions Queue */}
        <div className="mb-10">
          <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blood">02</span>
              <h2 className="text-lg font-bold tracking-tight text-bone">
                Active Hospital Requisitions
              </h2>
            </div>

            <Link
              href="/hospital/requests"
              className="flex items-center gap-1 font-mono text-xs text-mute hover:text-blood transition-colors"
            >
              <span>View History</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activeRequests.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center backdrop-blur-md">
              <p className="text-sm font-semibold text-bone">No active broadcasts</p>
              <p className="mt-1 text-xs text-mute">All patient requests have been fulfilled.</p>
              <Link
                href="/hospital/request/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blood py-2 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Broadcast New Request</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((req) => {
                const isCritical = req.urgency === 'CRITICAL'
                const matched = req.matches?.length ?? 0

                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                      isCritical
                        ? 'border-blood/40 bg-surface/90 shadow-[0_0_20px_-8px_rgba(220,38,38,0.25)]'
                        : 'border-line bg-surface/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-blood/30 bg-blood/10">
                          <span className="font-mono text-lg font-bold text-blood">
                            {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-bone">
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

                          {req.notes && (
                            <p className="mt-1 text-xs text-mute italic">"{req.notes}"</p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                            <span className={matched > 0 ? 'text-blood font-bold' : 'text-faint'}>
                              {matched} Donor{matched !== 1 ? 's' : ''} Alerted
                            </span>
                            <span>•</span>
                            <span>{dayjs(req.createdAt).fromNow()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href="/hospital/requests"
                          className="rounded-xl border border-line bg-raised px-3.5 py-2 text-xs font-semibold text-bone hover:border-blood transition-colors"
                        >
                          Manage Matches
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
