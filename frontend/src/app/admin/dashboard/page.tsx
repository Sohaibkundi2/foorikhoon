'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  BadgeCheck,
  Building2,
  Clock,
  Inbox,
  ShieldAlert,
  Users,
  CheckCircle2,
  Trash2,
  Layers,
  Activity,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  XCircle,
  BarChart2
} from 'lucide-react'
import { Texture } from '@/components/fk'

interface Stats {
  totalUsers: number
  totalDonors: number
  totalHospitals: number
  totalRequests: number
  totalMatches: number
  pendingVerification: number
}

interface Hospital {
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
  requests: { id: string }[]
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
  city: string
  phone: string | null
  createdAt: string
}

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  createdAt: string
  matches: { id: string }[]
  hospital: {
    name: string
    user: { city: string }
  }
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−'
}

type Tab = 'OVERVIEW' | 'HOSPITALS' | 'USERS' | 'REQUESTS' | 'SHORTAGE'
const TABS: Tab[] = ['OVERVIEW', 'HOSPITALS', 'USERS', 'REQUESTS', 'SHORTAGE']

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [stats, setStats] = useState<Stats | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    try {
      const [statsRes, hospitalsRes, usersRes, requestsRes, shortageRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/hospitals'),
        api.get('/api/admin/users'),
        api.get('/api/admin/requests'),
        api.get('/api/map/shortage')
      ])
      setStats(statsRes.data.stats)
      setHospitals(hospitalsRes.data.hospitals || [])
      setUsers(usersRes.data.users || [])
      setRequests(requestsRes.data.requests || [])
      setPredictions(shortageRes.data.predictions || [])
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVerify = async (id: string) => {
    setVerifyingId(id)
    try {
      await api.put(`/api/admin/hospitals/${id}/verify`)
      setHospitals((prev) =>
        prev.map((h) => (h.id === id ? { ...h, verified: !h.verified } : h))
      )
      // refresh stats
      const statsRes = await api.get('/api/admin/stats')
      setStats(statsRes.data.stats)
    } catch (err) {
      console.error('Failed to toggle verification:', err)
    } finally {
      setVerifyingId(null)
    }
  }

  const deleteHospital = async (id: string) => {
    if (!confirm('Are you sure? This will delete all clinical records, requests, and data for this hospital.')) {
      return
    }
    setDeletingId(id)
    try {
      await api.delete(`/api/admin/hospitals/${id}`)
      setHospitals((prev) => prev.filter((h) => h.id !== id))
      const statsRes = await api.get('/api/admin/stats')
      setStats(statsRes.data.stats)
    } catch (err) {
      console.error('Failed to delete hospital:', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Initializing national admin console & registries...
          </p>
        </div>
      </div>
    )
  }

  const tabCount: Record<Tab, number | null> = {
    OVERVIEW: null,
    HOSPITALS: hospitals.length,
    USERS: users.length,
    REQUESTS: requests.length,
    SHORTAGE: predictions.length,
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-32">
      <Texture />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
        {/* Masthead */}
        <div className="relative flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-14 bg-blood" />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-blood" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-blood">
                Central Operations Console
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              National Blood Network Admin
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">
              Platform-wide telemetry, institutional verification gate, user registries, and
              real-time shortage intelligence.
            </p>
          </div>

          {stats && stats.pendingVerification > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs text-warn">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                <strong className="font-mono font-bold text-bone">
                  {stats.pendingVerification}
                </strong>{' '}
                hospital{stats.pendingVerification > 1 ? 's' : ''} awaiting credentials audit
              </span>
            </div>
          )}
        </div>

        {/* Console Layout: Navigation Rail + Tab Content */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          {/* Navigation Sidebar */}
          <nav aria-label="Admin console navigation">
            <div className="flex overflow-x-auto rounded-xl border border-line bg-surface p-1.5 lg:flex-col lg:space-y-1">
              {TABS.map((tab) => {
                const active = activeTab === tab
                const count = tabCount[tab]

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left font-mono text-xs uppercase tracking-wider transition ${
                      active
                        ? 'bg-raised text-bone shadow-sm border border-line'
                        : 'text-faint hover:bg-raised/40 hover:text-mute'
                    }`}
                  >
                    <span>{tab}</span>
                    {count !== null && (
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] tabular-nums ${
                          active
                            ? 'bg-blood/20 text-blood font-bold'
                            : 'bg-surface text-faint border border-line-soft'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Tab Workspaces */}
          <div className="min-w-0">
            {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
            {activeTab === 'OVERVIEW' && stats && (
              <div className="space-y-8">
                {/* 6 Key Telemetry Tiles */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Total Users
                      </span>
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                      {stats.totalUsers}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">All registered accounts</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Active Donors
                      </span>
                      <HeartHandshake className="h-4 w-4 text-blood" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-blood">
                      {stats.totalDonors}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Volunteer lifesavers</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Hospitals
                      </span>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                      {stats.totalHospitals}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Medical facilities</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Blood Requests
                      </span>
                      <Inbox className="h-4 w-4 text-blood" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-blood">
                      {stats.totalRequests}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Emergency calls filed</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Matches Dispatched
                      </span>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                      {stats.totalMatches}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Deterministic algorithm pairings</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between text-faint">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Pending Verification
                      </span>
                      <Clock className="h-4 w-4 text-warn" />
                    </div>
                    <p
                      className={`mt-3 font-mono text-3xl font-bold tracking-tight ${
                        stats.pendingVerification > 0 ? 'text-warn' : 'text-bone'
                      }`}
                    >
                      {stats.pendingVerification}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Requires PMDC inspection</p>
                  </div>
                </div>

                {/* Quick Action & Network Health Card */}
                <div className="rounded-xl border border-line bg-surface p-6">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-bone">
                    Operational Protocol Status
                  </h3>
                  <div className="mt-4 grid gap-4 text-xs leading-relaxed text-mute sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-raised p-4">
                      <p className="font-semibold text-bone">Deterministic Match Engine</p>
                      <p className="mt-1">
                        Active. Scoring weight formula (35% blood compatibility, 25% proximity, 25%
                        commitment, 15% urgency) operating nominally.
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-raised p-4">
                      <p className="font-semibold text-bone">Anti-Spam Requisition Gate</p>
                      <p className="mt-1">
                        Strictly enforced. Donors cannot broadcast blood requests; only verified
                        licensed hospitals possess authorization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HOSPITALS TAB ───────────────────────────────────────────── */}
            {activeTab === 'HOSPITALS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-bone">
                    Registered Medical Centers ({hospitals.length})
                  </h3>
                  <span className="font-mono text-[11px] text-faint">PMDC Verification Registry</span>
                </div>

                {hospitals.length === 0 ? (
                  <div className="rounded-xl border border-line bg-surface p-12 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-4 text-sm font-medium text-bone">No hospitals registered</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hospitals.map((hospital) => (
                      <div
                        key={hospital.id}
                        className={`rounded-xl border p-5 transition-colors ${
                          !hospital.verified
                            ? 'border-warn/30 bg-warn/[0.02]'
                            : 'border-line bg-surface hover:border-line/80'
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h4 className="font-medium text-bone">{hospital.name}</h4>
                              {hospital.verified ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bone">
                                  <BadgeCheck className="h-3 w-3 text-bone" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warn">
                                  <Clock className="h-3 w-3 text-warn" />
                                  Pending Verification
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-mute">{hospital.address}</p>
                            <p className="mt-2 font-mono text-[11px] text-faint">
                              License: <strong className="text-bone">{hospital.licenseNo}</strong> ·{' '}
                              City: {hospital.user?.city || 'N/A'} · Contact:{' '}
                              {hospital.user?.email || 'N/A'} · Requests Filed:{' '}
                              {hospital.requests?.length || 0}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleVerify(hospital.id)}
                              disabled={verifyingId === hospital.id}
                              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
                                hospital.verified
                                  ? 'border border-line bg-raised text-faint hover:text-bone'
                                  : 'bg-blood text-white font-semibold shadow hover:bg-blood-dark'
                              } disabled:opacity-50`}
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              {verifyingId === hospital.id
                                ? 'Updating...'
                                : hospital.verified
                                ? 'Revoke License'
                                : 'Grant Verification'}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteHospital(hospital.id)}
                              disabled={deletingId === hospital.id}
                              aria-label="Delete hospital"
                              className="inline-flex items-center justify-center rounded-md border border-blood/30 bg-blood/10 p-2 text-blood transition hover:bg-blood/20 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── USERS TAB ───────────────────────────────────────────────── */}
            {activeTab === 'USERS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-bone">
                    Platform Accounts ({users.length})
                  </h3>
                  <span className="font-mono text-[11px] text-faint">Role & City Manifest</span>
                </div>

                {users.length === 0 ? (
                  <div className="rounded-xl border border-line bg-surface p-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-4 text-sm font-medium text-bone">No users registered</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="grid grid-cols-[1fr_6rem_6rem] border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-faint sm:grid-cols-[1fr_7rem_6rem_7rem]">
                      <span>User</span>
                      <span className="text-center">Role</span>
                      <span className="hidden text-center sm:block">City</span>
                      <span className="text-right">Registered</span>
                    </div>

                    <div className="divide-y divide-line">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="grid grid-cols-[1fr_6rem_6rem] items-center px-4 py-3.5 sm:grid-cols-[1fr_7rem_6rem_7rem]"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="truncate font-medium text-bone">{u.name || 'Unnamed'}</p>
                            <p className="truncate font-mono text-[11px] text-faint">{u.email}</p>
                          </div>

                          <div className="text-center">
                            <span
                              className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                                u.role === 'ADMIN'
                                  ? 'border border-blood/40 bg-blood/20 text-blood font-bold'
                                  : u.role === 'HOSPITAL'
                                  ? 'border border-line bg-raised text-bone'
                                  : 'border border-line-soft bg-surface text-mute'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>

                          <div className="hidden text-center font-mono text-xs text-mute sm:block">
                            {u.city || '—'}
                          </div>

                          <div className="text-right font-mono text-[11px] text-faint">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── REQUESTS TAB ────────────────────────────────────────────── */}
            {activeTab === 'REQUESTS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-bone">
                    Emergency Requisitions ({requests.length})
                  </h3>
                  <span className="font-mono text-[11px] text-faint">National Broadcast Ledger</span>
                </div>

                {requests.length === 0 ? (
                  <div className="rounded-xl border border-line bg-surface p-12 text-center">
                    <Inbox className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-4 text-sm font-medium text-bone">No blood requests filed</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className={`rounded-xl border p-4 sm:p-5 transition ${
                          req.urgency === 'CRITICAL'
                            ? 'border-blood/40 bg-blood/[0.02]'
                            : 'border-line bg-surface'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blood/30 bg-blood/10 font-mono text-lg font-bold text-blood">
                            {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                                  req.urgency === 'CRITICAL'
                                    ? 'border border-blood/40 bg-blood/20 text-blood font-bold'
                                    : 'border border-line bg-raised text-warn'
                                }`}
                              >
                                {req.urgency}
                              </span>
                              <span className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bone">
                                Status: {req.status}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-bone">
                              {req.hospital?.name || 'Unknown Medical Center'}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-faint">
                              Units: <strong className="text-bone">{req.units}</strong> · City:{' '}
                              {req.hospital?.user?.city || 'N/A'} · Matched Donors:{' '}
                              {req.matches?.length || 0} · Filed:{' '}
                              {new Date(req.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SHORTAGE TAB ────────────────────────────────────────────── */}
            {activeTab === 'SHORTAGE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-blood" />
                    <h3 className="font-mono text-xs uppercase tracking-wider text-bone">
                      Predictive Shortage Intelligence ({predictions.length})
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] text-faint">Flask ML Engine Port 5001</span>
                </div>

                {predictions.length === 0 ? (
                  <div className="rounded-xl border border-line bg-surface p-12 text-center">
                    <ShieldAlert className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-4 text-sm font-medium text-bone">
                      No shortage predictions returned
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Ensure the predictive service is active on port 5001.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictions.map((pred) => (
                      <div
                        key={pred.bloodGroup}
                        className={`rounded-xl border p-4 sm:p-5 ${
                          pred.risk === 'CRITICAL'
                            ? 'border-blood/40 bg-blood/[0.03]'
                            : pred.risk === 'HIGH'
                            ? 'border-warn/30 bg-warn/[0.02]'
                            : 'border-line bg-surface'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-raised font-mono text-lg font-bold text-blood">
                              {bloodGroupLabels[pred.bloodGroup] || pred.bloodGroup}
                            </div>
                            <div>
                              <p className="font-mono text-xs uppercase tracking-wider text-bone">
                                Antigen Group {bloodGroupLabels[pred.bloodGroup] || pred.bloodGroup}
                              </p>
                              <p className="mt-1 font-mono text-xs text-faint">
                                30-Day Requests: <span className="text-bone">{pred.requestCount}</span> · Available Donors: <span className="text-bone">{pred.donorCount}</span> · Ratio: <span className="text-bone">{pred.ratio}</span>
                              </p>
                            </div>
                          </div>

                          <div>
                            <span
                              className={`inline-block rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
                                pred.risk === 'CRITICAL'
                                  ? 'border border-blood/40 bg-blood/20 text-blood'
                                  : pred.risk === 'HIGH'
                                  ? 'border border-warn/30 bg-warn/10 text-warn'
                                  : 'border border-line bg-raised text-bone'
                              }`}
                            >
                              Risk Level: {pred.risk}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
