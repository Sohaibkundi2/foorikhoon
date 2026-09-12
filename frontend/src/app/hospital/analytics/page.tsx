'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  TriangleAlert,
  Activity,
  BarChart3,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ShieldCheck,
  Plus
} from 'lucide-react'
import { Texture } from '@/components/fk'

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
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−'
}

const LOW_STOCK_UNITS = 5
const TOTAL_GROUPS = Object.keys(bloodGroupLabels).length

export default function HospitalAnalyticsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'HOSPITAL') {
      router.push('/')
      return
    }

    api
      .get('/api/hospital/analytics')
      .then((res) => setAnalytics(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Loading hospital analytics and statistics...
          </p>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const { inventory, lowStock, totalRequests, fulfilled, fulfillmentRate } = analytics
  const unfulfilled = Math.max(0, totalRequests - fulfilled)

  const peak = Math.max(...inventory.map((i) => i.units), 0)
  const chartMax = Math.max(peak, LOW_STOCK_UNITS + 2)
  const thresholdPct = (LOW_STOCK_UNITS / chartMax) * 100

  return (
    <div className="relative min-h-screen overflow-hidden pb-28">
      <Texture />

      <div className="relative mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14">
        {/* Navigation Breadcrumb */}
        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          Back to Dashboard
        </Link>

        {/* Masthead */}
        <div className="relative mt-7 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-14 bg-blood" />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-blood" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-blood">
                Hospital Overview
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              Hospital Analytics & Stats
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">
              Overview of your blood requests, fulfilled donations, and current blood stock.
            </p>
          </div>

          {/* Large Hero Metric */}
          <div className="rounded-xl border border-line bg-surface p-5 sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
              Fulfilled Requests
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-bone sm:text-5xl">
              {fulfillmentRate}
              <span className="ml-1 text-2xl font-normal text-blood">%</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">
              {fulfilled} of {totalRequests} requests completed
            </p>
          </div>
        </div>

        {/* Fulfillment Ratio Visualizer */}
        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Percent className="h-4 w-4 text-blood" />
              <span className="font-mono text-xs uppercase tracking-wider text-bone">
                All-Time Requests Fulfilled
              </span>
            </div>
            <span className="font-mono text-xs tabular-nums text-faint">
              {totalRequests} Total Requests
            </span>
          </div>

          {/* Bar track */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-raised">
            {totalRequests > 0 ? (
              <>
                <div
                  className="bg-blood transition-all duration-500"
                  style={{ width: `${fulfillmentRate}%` }}
                />
                <div className="flex-1 bg-line" />
              </>
            ) : (
              <div className="w-full bg-line-soft" />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blood" />
                <span className="text-mute">
                  Completed Requests: <strong className="text-bone">{fulfilled}</strong> (
                  {totalRequests > 0 ? fulfillmentRate : 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="text-mute">
                  Pending / Active Requests: <strong className="text-bone">{unfulfilled}</strong>
                </span>
              </div>
            </div>
            <span className="text-faint">ForiKhoon Network</span>
          </div>
        </div>

        {/* Section 01: Core Activity Counters */}
        <div className="mt-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                01. Blood Requests Summary
              </h2>
            </div>
            <span className="font-mono text-[11px] text-faint">This Month & All-Time</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-faint">
                <span className="font-mono text-[10px] uppercase tracking-widest">This Month</span>
                <Calendar className="h-4 w-4" />
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                {analytics.totalRequestsThisMonth}
              </p>
              <p className="mt-1.5 text-xs text-mute">Requests posted this month</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-faint">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Total Requests
                </span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                {totalRequests}
              </p>
              <p className="mt-1.5 text-xs text-mute">Total blood requests posted</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-faint">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Most Needed Blood Group
                </span>
                <BarChart3 className="h-4 w-4 text-blood" />
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-blood">
                {analytics.mostRequested
                  ? bloodGroupLabels[analytics.mostRequested] ?? analytics.mostRequested
                  : '—'}
              </p>
              <p className="mt-1.5 text-xs text-mute">
                {analytics.mostRequested
                  ? 'Most requested blood group by your hospital'
                  : 'No hospital requests recorded yet'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 02: Stock Profile Distribution Chart */}
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <Boxes className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                02. Blood Stock by Blood Group
              </h2>
            </div>
            <Link
              href="/hospital/inventory"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-mute transition hover:text-bone"
            >
              Update Blood Stock
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="mt-6 rounded-xl border border-line bg-surface p-12 text-center">
              <Boxes className="mx-auto h-8 w-8 text-faint" />
              <p className="mt-4 text-sm font-medium text-bone">No blood stock recorded yet</p>
              <p className="mt-1 text-xs text-mute">
                Add your blood bags on the stock page to see the chart.
              </p>
              <Link
                href="/hospital/inventory"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-blood px-4 py-2 font-mono text-xs uppercase tracking-wider text-white"
              >
                Go to Blood Stock
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-line bg-surface p-6">
              {/* Chart Plot Area */}
              <div className="relative h-56 border-b border-line pb-2">
                {/* Low Stock Threshold Guideline */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 border-t border-dashed border-warn/50"
                  style={{ bottom: `${thresholdPct}%` }}
                >
                  <span className="absolute -top-4 right-0 font-mono text-[10px] uppercase tracking-wider text-warn">
                    Low Stock Warning (&lt; {LOW_STOCK_UNITS} Bags)
                  </span>
                </div>

                {/* Vertical Bars */}
                <div className="flex h-full items-end gap-2 sm:gap-4">
                  {inventory.map((item) => {
                    const isLow = item.units < LOW_STOCK_UNITS
                    const pct = (item.units / chartMax) * 100

                    return (
                      <div key={item.id} className="flex h-full flex-1 flex-col justify-end">
                        <span className="mb-2 text-center font-mono text-xs font-semibold tabular-nums text-bone">
                          {item.units}
                        </span>
                        <div
                          className={`w-full rounded-t-sm transition-all duration-500 ${
                            isLow ? 'bg-warn' : 'bg-blood'
                          }`}
                          style={{ height: `${Math.max(pct, 2.5)}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* X-axis Labels */}
              <div className="mt-3 flex gap-2 sm:gap-4">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex-1 text-center font-mono text-xs font-semibold uppercase text-mute"
                  >
                    {bloodGroupLabels[item.bloodGroup] ?? item.bloodGroup}
                  </div>
                ))}
              </div>

              <p className="mt-6 font-mono text-[11px] text-faint">
                {inventory.length} of {TOTAL_GROUPS} blood groups recorded. Bars scale based on highest stock ({peak} bags).
              </p>
            </div>
          )}
        </div>

        {/* Section 03: Critical Depletion Alerts */}
        {lowStock.length > 0 && (
          <div className="mt-12 rounded-xl border border-warn/30 bg-warn/5 p-6">
            <div className="flex items-start gap-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-warn">
                      Low Blood Stock Warning
                    </h3>
                    <p className="mt-1 text-xs text-mute">
                      {lowStock.length} blood group{lowStock.length > 1 ? 's' : ''} have fewer than {LOW_STOCK_UNITS} bags in stock.
                    </p>
                  </div>
                  <Link
                    href="/hospital/request/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blood px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow transition hover:bg-blood-dark"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Post Blood Request
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {lowStock.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-warn/30 bg-surface px-3 py-1.5 font-mono text-xs"
                    >
                      <span className="font-bold text-warn">
                        {bloodGroupLabels[item.bloodGroup] ?? item.bloodGroup}
                      </span>
                      <span className="text-faint">|</span>
                      <span className="text-bone">
                        {item.units} bag{item.units !== 1 ? 's' : ''} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
