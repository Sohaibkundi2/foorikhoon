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
            Aggregating clinical analytics & demand telemetry...
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
          Back to Command Center
        </Link>

        {/* Masthead */}
        <div className="relative mt-7 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-14 bg-blood" />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-blood" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-blood">
                Clinical Intelligence
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              Demand & Reserve Telemetry
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">
              Real-time audit of hospital emergency dispatches, fulfillment ratios, and regional
              antigen supply levels.
            </p>
          </div>

          {/* Large Hero Metric */}
          <div className="rounded-xl border border-line bg-surface p-5 sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
              Fulfillment Efficacy
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-bone sm:text-5xl">
              {fulfillmentRate}
              <span className="ml-1 text-2xl font-normal text-blood">%</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">
              {fulfilled} of {totalRequests} emergency calls met
            </p>
          </div>
        </div>

        {/* Fulfillment Ratio Visualizer */}
        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Percent className="h-4 w-4 text-blood" />
              <span className="font-mono text-xs uppercase tracking-wider text-bone">
                Fulfillment Distribution (All Time)
              </span>
            </div>
            <span className="font-mono text-xs tabular-nums text-faint">
              {totalRequests} Total Cases
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
                  Fulfilled Cases: <strong className="text-bone">{fulfilled}</strong> (
                  {totalRequests > 0 ? fulfillmentRate : 0}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="text-mute">
                  Unfulfilled / Active: <strong className="text-bone">{unfulfilled}</strong>
                </span>
              </div>
            </div>
            <span className="text-faint">Source: ForiKhoon Dispatch Core</span>
          </div>
        </div>

        {/* Section 01: Core Activity Counters */}
        <div className="mt-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                01. Requisition Activity
              </h2>
            </div>
            <span className="font-mono text-[11px] text-faint">Trailing 30 Days vs All-Time</span>
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
              <p className="mt-1.5 text-xs text-mute">Cases initiated since 1st of this month</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-faint">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Total Dispatches
                </span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone">
                {totalRequests}
              </p>
              <p className="mt-1.5 text-xs text-mute">Cumulative requests broadcast by facility</p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-faint">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Peak Deficit Group
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
                  ? 'Most requested antigen profile by your doctors'
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
                02. Reserve Distribution By Antigen Group
              </h2>
            </div>
            <Link
              href="/hospital/inventory"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-mute transition hover:text-bone"
            >
              Update Shelf Quantities
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="mt-6 rounded-xl border border-line bg-surface p-12 text-center">
              <Boxes className="mx-auto h-8 w-8 text-faint" />
              <p className="mt-4 text-sm font-medium text-bone">No inventory levels recorded</p>
              <p className="mt-1 text-xs text-mute">
                Initialize stock values on the inventory page to activate distribution telemetry.
              </p>
              <Link
                href="/hospital/inventory"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-blood px-4 py-2 font-mono text-xs uppercase tracking-wider text-white"
              >
                Go to Inventory
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
                    Depletion Alert (&lt; {LOW_STOCK_UNITS} Units)
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
                {inventory.length} of {TOTAL_GROUPS} antigen profiles mapped. Bars scale relative to
                maximum active stock ({peak} units).
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
                      Critical Shortage Detected
                    </h3>
                    <p className="mt-1 text-xs text-mute">
                      {lowStock.length} blood group{lowStock.length > 1 ? 's' : ''} currently hold
                      fewer than {LOW_STOCK_UNITS} emergency units.
                    </p>
                  </div>
                  <Link
                    href="/hospital/request/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blood px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow transition hover:bg-blood-dark"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Broadcast Emergency Request
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
                        {item.units} unit{item.units !== 1 ? 's' : ''} remaining
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
