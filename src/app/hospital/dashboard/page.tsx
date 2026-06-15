'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import dayjs from 'dayjs'

import relativeTime from 'dayjs/plugin/relativeTime'

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
    if (!hydrated) return 
    if (!user) { router.push('/login'); return }
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Hospital Dashboard</p>
          <h1 className="text-3xl font-bold text-white">{hospital?.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-[#9CA3AF] text-sm">{hospital?.user.city}</p>
            {hospital?.verified ? (
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                Verified
              </span>
            ) : (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                Pending Verification
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/hospital/profile"
            className="text-sm border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-all duration-150"
          >
            Edit Profile
          </Link>
          <Link
            href="/hospital/request/new"
            className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20"
          >
            + New Request
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Total Requests</p>
          <p className="text-3xl font-bold text-white">{requests.length}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Active</p>
          <p className="text-3xl font-bold text-[#DC2626]">{activeRequests.length}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Fulfilled</p>
          <p className="text-3xl font-bold text-green-400">
            {requests.filter(r => r.status === 'FULFILLED').length}
          </p>
        </div>
      </div>

      {/* Inventory */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Blood Inventory</h2>
          <Link href="/hospital/inventory" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">
            Manage →
          </Link>
        </div>
        {inventory.length === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-xl p-6 text-center">
            <p className="text-[#6B7280] text-sm">No inventory added yet.</p>
            <Link href="/hospital/inventory" className="text-xs text-[#DC2626] hover:underline mt-1 inline-block">
              Add inventory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {inventory.map((item) => (
              <div key={item.id} className="bg-[#141414] border border-[#222] rounded-lg py-4 text-center hover:border-[#2A2A2A] transition-colors">
                <p className="text-[#DC2626] font-bold text-sm">{bloodGroupLabels[item.bloodGroup] || item.bloodGroup}</p>
                <p className="text-white text-lg font-bold mt-1">{item.units}</p>
                <p className="text-[#6B7280] text-xs">units</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active requests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
            Active Requests
            {activeRequests.length > 0 && (
              <span className="ml-2 bg-[#DC2626] text-white text-xs px-2 py-0.5 rounded-full">
                {activeRequests.length}
              </span>
            )}
          </h2>
          <Link href="/hospital/requests" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">
            View all →
          </Link>
        </div>

        {activeRequests.length === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-xl p-8 text-center">
            <p className="text-[#6B7280] text-sm">No active requests.</p>
            <Link
              href="/hospital/request/new"
              className="text-xs text-[#DC2626] hover:underline mt-1 inline-block"
            >
              Post a new request
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRequests.map((req) => (
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
                  <p className="text-[#9CA3AF] text-xs">
                    {req.units} unit{req.units > 1 ? 's' : ''} needed
                    {req.notes && ` · ${req.notes}`}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-1">
                    {req.matches?.length} donor{req.matches?.length !== 1 ? 's' : ''} matched ·{' '}
                    {dayjs(req.createdAt).fromNow()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past requests */}
      {pastRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest mb-4">Request History</h2>
          <div className="space-y-2">
            {pastRequests.map((req) => (
              <div key={req.id} className="bg-[#141414] border border-[#222] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">
                    {bloodGroupLabels[req.bloodGroup]} · {req.units} unit{req.units > 1 ? 's' : ''}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-0.5">{dayjs(req.createdAt).fromNow()}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColors[req.status]}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}