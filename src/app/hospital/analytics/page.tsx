'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

interface Analytics {
  mostRequested: string | null
  totalRequestsThisMonth: number
  fulfillmentRate: number
  totalRequests: number
  fulfilled: number
  lowStock: Inventory[]
  inventory: Inventory[]
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

function getInventoryColor(units: number) {
  if (units === 0) return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (units < 5) return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  if (units < 10) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  return 'text-green-400 bg-green-400/10 border-green-400/20'
}

function getInventoryLabel(units: number) {
  if (units === 0) return 'Out of stock'
  if (units < 5) return 'Critical'
  if (units < 10) return 'Low'
  return 'Good'
}

export default function HospitalAnalyticsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }

    api.get('/api/hospital/analytics')
      .then(res => setAnalytics(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <Link href="/hospital/dashboard" className="text-xs text-[#6B7280] hover:text-white transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Hospital</p>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Overview of your blood request activity and inventory.</p>
      </div>

      {/* Low stock alert */}
      {analytics.lowStock.length > 0 && (
        <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <p className="text-orange-400 text-sm font-semibold">Low Stock Alert</p>
          </div>
          <p className="text-[#9CA3AF] text-xs mb-3">
            {analytics.lowStock.length} blood group{analytics.lowStock.length !== 1 ? 's' : ''} running low. Consider restocking soon.
          </p>
          <div className="flex flex-wrap gap-2">
            {analytics.lowStock.map(item => (
              <span key={item.id} className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-3 py-1 rounded-full font-semibold">
                {bloodGroupLabels[item.bloodGroup]} — {item.units} units
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">This Month</p>
          <p className="text-3xl font-bold text-white">{analytics.totalRequestsThisMonth}</p>
          <p className="text-[#6B7280] text-xs mt-1">requests posted</p>
        </div>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Total</p>
          <p className="text-3xl font-bold text-white">{analytics.totalRequests}</p>
          <p className="text-[#6B7280] text-xs mt-1">all time requests</p>
        </div>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Fulfilled</p>
          <p className="text-3xl font-bold text-green-400">{analytics.fulfilled}</p>
          <p className="text-[#6B7280] text-xs mt-1">donations completed</p>
        </div>

        <div className="bg-[#141414] border border-[#222] rounded-xl p-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Success Rate</p>
          <p className="text-3xl font-bold text-[#DC2626]">{analytics.fulfillmentRate}%</p>
          <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#DC2626] rounded-full transition-all duration-700"
              style={{ width: `${analytics.fulfillmentRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Most requested */}
      {analytics.mostRequested && (
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6 mb-6">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-4">Most Requested Blood Group</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center">
              <span className="text-[#DC2626] font-bold text-2xl">
                {bloodGroupLabels[analytics.mostRequested]}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{bloodGroupLabels[analytics.mostRequested]} Blood</p>
              <p className="text-[#9CA3AF] text-sm mt-0.5">
                Most frequently needed at your hospital
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory overview */}
      <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[#6B7280] text-xs uppercase tracking-widest">Inventory Status</p>
          <Link href="/hospital/inventory" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">
            Manage →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.inventory.map(item => (
            <div key={item.id} className={`border rounded-lg p-4 text-center ${getInventoryColor(item.units)}`}>
              <p className="font-bold text-lg">{bloodGroupLabels[item.bloodGroup]}</p>
              <p className="text-2xl font-bold mt-1">{item.units}</p>
              <p className="text-xs mt-1 opacity-70">{getInventoryLabel(item.units)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}