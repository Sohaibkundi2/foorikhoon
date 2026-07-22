'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

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

const urgencyColors: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
  URGENT: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  NORMAL: 'text-green-400 bg-green-400/10 border-green-400/20',
}

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  MATCHED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  FULFILLED: 'text-green-400 bg-green-400/10 border-green-400/20',
  EXPIRED: 'text-[#6B7280] bg-[#6B7280]/10 border-[#6B7280]/20',
}

const roleColors: Record<string, string> = {
  ADMIN: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  HOSPITAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  DONOR: 'text-green-400 bg-green-400/10 border-green-400/20',
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        {stats && stats.pendingVerification > 0 && (
          <p className="text-yellow-400 text-sm mt-2">
             {stats.pendingVerification} hospital{stats.pendingVerification > 1 ? 's' : ''} pending verification
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-[#222]">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors duration-150 ${
              activeTab === tab
                ? 'border-[#DC2626] text-white'
                : 'border-transparent text-[#6B7280] hover:text-[#9CA3AF]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'OVERVIEW' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, color: 'text-white' },
            { label: 'Donors', value: stats.totalDonors, color: 'text-green-400' },
            { label: 'Hospitals', value: stats.totalHospitals, color: 'text-blue-400' },
            { label: 'Blood Requests', value: stats.totalRequests, color: 'text-[#DC2626]' },
            { label: 'Total Matches', value: stats.totalMatches, color: 'text-purple-400' },
            { label: 'Pending Verification', value: stats.pendingVerification, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#141414] border border-[#222] rounded-xl p-5">
              <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* HOSPITALS */}
      {activeTab === 'HOSPITALS' && (
        <div className="space-y-3">
          {hospitals.map(hospital => (
            <div key={hospital.id} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">{hospital.name}</span>
                  {hospital.verified ? (
                    <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[#9CA3AF] text-xs">{hospital.address}</p>
                <p className="text-[#6B7280] text-xs mt-1">
                  License: {hospital.licenseNo} · {hospital.user.city} · {hospital.requests.length} requests
                </p>
              </div>
              <button onClick={() => deleteHospital(hospital.id)}
                className="text-xs px-4 py-2 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors duration-150">
                Delete
              </button>
              <button
                onClick={() => toggleVerify(hospital.id)}
                disabled={verifyingId === hospital.id}
                className={`text-xs px-4 py-2 rounded-md border transition-colors duration-150 disabled:opacity-50 ${
                  hospital.verified
                    ? 'text-[#9CA3AF] border-[#2A2A2A] hover:border-red-400/30 hover:text-red-400'
                    : 'text-green-400 border-green-400/20 bg-green-400/10 hover:bg-green-400/20'
                }`}
              >
                {verifyingId === hospital.id ? '...' : hospital.verified ? 'Revoke' : 'Verify'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'USERS' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-[#141414] border border-[#222] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{u.name || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${roleColors[u.role]}`}>
                    {u.role}
                  </span>
                </div>
                <p className="text-[#6B7280] text-xs">{u.email} · {u.city}</p>
              </div>
              <p className="text-[#6B7280] text-xs">
                {new Date(u.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#DC2626] font-bold text-lg">
                    {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColors[req.urgency]}`}>
                    {req.urgency}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-[#9CA3AF] text-xs">{req.hospital.name} · {req.hospital.user.city}</p>
                <p className="text-[#6B7280] text-xs mt-1">
                  {req.units} unit{req.units > 1 ? 's' : ''} · {req.matches.length} match{req.matches.length !== 1 ? 'es' : ''} · {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shortage tab */}
      {activeTab === 'SHORTAGE' && (
        <div className="space-y-3">
          {predictions.map((pred) => (
            <div key={pred.bloodGroup} className="bg-[#141414] border border-[#222] rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center">
                  <span className="text-[#DC2626] font-bold text-lg">
                    {bloodGroupLabels[pred.bloodGroup]}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold">{bloodGroupLabels[pred.bloodGroup]}</p>
                  <p className="text-[#6B7280] text-xs mt-0.5">
                    {pred.requestCount} requests · {pred.donorCount} donors · ratio {pred.ratio}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${
                pred.risk === 'CRITICAL' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                pred.risk === 'HIGH' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' :
                pred.risk === 'MODERATE' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                'text-green-400 bg-green-400/10 border-green-400/20'
              }`}>
                {pred.risk}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}