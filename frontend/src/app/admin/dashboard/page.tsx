'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { BadgeCheck, Building2, Clock, Inbox, ShieldAlert, Users } from 'lucide-react'
import {
  Chip,
  EmptyState,
  Texture,
  affirmBtn,
  dangerBtn,
  neutralBtn,
  riskTone,
  statusTone,
  urgencyTone
} from '@/components/fk'

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
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

/**
 * Role → tone, drawn from the same four families as the rest of the app. The
 * original set was purple / blue / green, which made the three roles look like
 * three unrelated products; here ADMIN is the one role with power over the
 * others, so it gets the brand red and the rest stay quiet.
 */
const roleTone: Record<string, string> = {
  ADMIN: 'text-blood bg-blood/10 border-blood/25',
  HOSPITAL: 'text-bone bg-raised border-line',
  DONOR: 'text-life bg-life/10 border-life/25',
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<any[]>([])

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'ADMIN') { router.push('/'); return }
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
      setHospitals(hospitalsRes.data.hospitals)
      setUsers(usersRes.data.users)
      setRequests(requestsRes.data.requests)
      setPredictions(shortageRes.data.predictions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVerify = async (id: string) => {
    setVerifyingId(id)
    try {
      await api.put(`/api/admin/hospitals/${id}/verify`)
      setHospitals(hospitals.map(h =>
        h.id === id ? { ...h, verified: !h.verified } : h
      ))
    } catch (err) {
      console.error(err)
    } finally {
      setVerifyingId(null)
    }
  }

  const deleteHospital = async (id: string) => {
    if (!confirm('Are you sure? This will delete all requests and data for this hospital.')) return
    try {
      await api.delete(`/api/admin/hospitals/${id}`)
      setHospitals(hospitals.filter(h => h.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
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
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12">

        {/* Masthead */}
        <div className="relative flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Admin</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Dashboard
            </h1>
          </div>

          {stats && stats.pendingVerification > 0 && (
            <Chip tone={urgencyTone.URGENT} icon={Clock}>
              {stats.pendingVerification} hospital{stats.pendingVerification > 1 ? 's' : ''} pending
              verification
            </Chip>
          )}
        </div>

        {/* A vertical section rail rather than a row of tabs. Five sections of an
            operations console are a table of contents, not five alternative
            views of one list — and on a 6xl page there is room for it beside the
            content instead of stacked above it. */}
        <div className="mt-9 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12">

          <nav aria-label="Admin sections" className="lg:border-r lg:border-line">
            <ul className="-mx-6 flex overflow-x-auto border-y border-line-soft px-6 lg:mx-0 lg:block lg:border-0 lg:px-0">
              {TABS.map(tab => {
                const active = activeTab === tab
                const count = tabCount[tab]

                return (
                  <li key={tab}>
                    <button
                      onClick={() => setActiveTab(tab)}
                      aria-current={active ? 'true' : undefined}
                      className={`relative flex w-full items-center justify-between gap-3 whitespace-nowrap py-3 pr-4 text-left font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150 lg:pr-5 ${
                        active ? 'text-bone' : 'text-faint hover:text-mute'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-0 h-px w-full bg-blood lg:inset-y-0 lg:h-auto lg:w-[2px]"
                        />
                      )}
                      <span className="lg:pl-4">{tab}</span>
                      {count !== null && (
                        <span
                          className={`tabular-nums ${active ? 'text-blood' : 'text-line'}`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="mt-9 min-w-0 lg:mt-0">

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            {activeTab === 'OVERVIEW' && stats && (
              <dl className="grid gap-px overflow-hidden border border-line bg-line-soft sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Total Users', value: stats.totalUsers, tone: 'text-bone' },
                  { label: 'Donors', value: stats.totalDonors, tone: 'text-life' },
                  { label: 'Hospitals', value: stats.totalHospitals, tone: 'text-bone' },
                  { label: 'Blood Requests', value: stats.totalRequests, tone: 'text-blood' },
                  { label: 'Total Matches', value: stats.totalMatches, tone: 'text-bone' },
                  {
                    label: 'Pending Verification',
                    value: stats.pendingVerification,
                    tone: stats.pendingVerification > 0 ? 'text-warn' : 'text-life',
                  },
                ].map(({ label, value, tone }) => (
                  <div key={label} className="bg-ink px-5 py-6">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      {label}
                    </dt>
                    <dd
                      className={`mt-3 font-mono text-[2.75rem] font-medium leading-[0.85] tabular-nums ${tone}`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* ── HOSPITALS ────────────────────────────────────────────────── */}
            {activeTab === 'HOSPITALS' && (
              hospitals.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No hospitals registered."
                  hint="Hospitals appear here as soon as they sign up, whether or not they are verified."
                />
              ) : (
                <ul className="border-t border-line">
                  {hospitals.map(hospital => (
                    <li
                      key={hospital.id}
                      className="relative border-b border-line py-5 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6"
                    >
                      {!hospital.verified && (
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-warn" />
                      )}

                      <div className="min-w-0 pl-4 md:pl-5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-medium text-bone">{hospital.name}</span>
                          {hospital.verified ? (
                            <Chip tone={statusTone.FULFILLED} icon={BadgeCheck}>Verified</Chip>
                          ) : (
                            <Chip tone={statusTone.PENDING} icon={Clock}>Pending</Chip>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-mute">{hospital.address}</p>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-line">
                          License: {hospital.licenseNo} · {hospital.user.city} ·{' '}
                          {hospital.requests.length} requests
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2.5 pl-4 md:mt-0 md:pl-0">
                        <button onClick={() => deleteHospital(hospital.id)} className={dangerBtn}>
                          Delete
                        </button>
                        <button
                          onClick={() => toggleVerify(hospital.id)}
                          disabled={verifyingId === hospital.id}
                          className={hospital.verified ? neutralBtn : affirmBtn}
                        >
                          {verifyingId === hospital.id ? '...' : hospital.verified ? 'Revoke' : 'Verify'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {/* ── USERS ────────────────────────────────────────────────────── */}
            {activeTab === 'USERS' && (
              users.length === 0 ? (
                <EmptyState icon={Users} title="No users registered." />
              ) : (
                <div>
                  <div
                    aria-hidden
                    className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 border-y border-line px-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-line sm:grid-cols-[minmax(0,1fr)_6rem_6rem]"
                  >
                    <span>Name</span>
                    <span className="hidden sm:block">Role</span>
                    <span className="text-right">Joined</span>
                  </div>

                  <ul>
                    {users.map(u => (
                      <li
                        key={u.id}
                        className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 border-b border-line-soft px-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="truncate text-sm font-medium text-bone">{u.name || '—'}</p>
                            <span className="sm:hidden">
                              <Chip tone={roleTone[u.role]}>{u.role}</Chip>
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-faint">
                            {u.email} · {u.city}
                          </p>
                        </div>

                        <span className="hidden sm:block">
                          <Chip tone={roleTone[u.role]}>{u.role}</Chip>
                        </span>

                        <p className="text-right font-mono text-[10px] tabular-nums text-line">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}

            {/* ── REQUESTS ─────────────────────────────────────────────────── */}
            {activeTab === 'REQUESTS' && (
              requests.length === 0 ? (
                <EmptyState icon={Inbox} title="No requests filed yet." />
              ) : (
                <ul className="border-t border-line">
                  {requests.map(req => (
                    <li
                      key={req.id}
                      className="relative flex items-start gap-5 border-b border-line py-4 pl-4"
                    >
                      {req.urgency === 'CRITICAL' && (
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blood" />
                      )}

                      <span className="w-12 shrink-0 font-mono text-2xl font-medium leading-none tracking-[-0.02em] text-blood">
                        {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip tone={urgencyTone[req.urgency]}>{req.urgency}</Chip>
                          <Chip tone={statusTone[req.status]}>{req.status}</Chip>
                        </div>
                        <p className="mt-2 truncate text-sm text-mute">
                          {req.hospital.name} · {req.hospital.user.city}
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-line">
                          {req.units} unit{req.units > 1 ? 's' : ''} · {req.matches.length} match
                          {req.matches.length !== 1 ? 'es' : ''} ·{' '}
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}

            {/* ── SHORTAGE ─────────────────────────────────────────────────── */}
            {activeTab === 'SHORTAGE' && (
              predictions.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No shortage prediction available."
                  hint="This section is served by the prediction engine on port 5001. If it is not running, nothing is returned here."
                />
              ) : (
                <div>
                  <ul className="border-t border-line">
                    {predictions.map((pred) => (
                      <li
                        key={pred.bloodGroup}
                        className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4"
                      >
                        <div className="flex items-center gap-5">
                          <span className="w-12 shrink-0 font-mono text-2xl font-medium leading-none tracking-[-0.02em] text-blood">
                            {bloodGroupLabels[pred.bloodGroup] ?? pred.bloodGroup}
                          </span>
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-mute">
                            {pred.requestCount} requests · {pred.donorCount} available · ratio{' '}
                            <span className="text-bone">{pred.ratio}</span>
                          </p>
                        </div>
                        <Chip tone={riskTone[pred.risk] ?? statusTone.MATCHED}>{pred.risk}</Chip>
                      </li>
                    ))}
                  </ul>

                  {/* Exactly what the two figures are, since neither is obvious
                      from the row: requests are windowed, donors are not. */}
                  <p className="mt-5 text-xs leading-relaxed text-faint">
                    Requests are counted over the last 30 days. Donors are those currently marked
                    available, all time. The risk tier is assigned by the prediction engine on port
                    5001, not by this page.
                  </p>
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
