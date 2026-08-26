'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Boxes, TriangleAlert } from 'lucide-react'
import { Chip, EmptyState, SectionLabel, Texture, quietBtn, urgencyTone } from '@/components/fk'

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

const TOTAL_GROUPS = Object.keys(bloodGroupLabels).length

/**
 * The one threshold in this file that isn't invented for the UI: it is the same
 * `units < 5` the analytics controller uses to build `lowStock`, so the figure,
 * the chips and the rule on the chart all agree with the payload.
 *
 * The previous version of this page also drew "Critical" under 5 and "Good" at
 * 10 or more. Ten is not a number the backend knows anything about, so a group
 * sitting at 9 was being called merely adequate on no evidence. Both invented
 * tiers are gone; a group is low or it isn't, and the exact count is printed.
 */
const LOW_STOCK_UNITS = 5

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
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  if (!analytics) return null

  const { inventory, lowStock, totalRequests, fulfilled, fulfillmentRate } = analytics
  const unfulfilled = Math.max(0, totalRequests - fulfilled)

  // Chart scale. Held at one above the threshold so the low-stock rule is always
  // drawn inside the plot rather than clipped off the top of a hospital whose
  // largest holding is two units.
  const peak = Math.max(...inventory.map(i => i.units), 0)
  const chartMax = Math.max(peak, LOW_STOCK_UNITS + 1)
  const thresholdPct = (LOW_STOCK_UNITS / chartMax) * 100

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-12">

        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
          Back to dashboard
        </Link>

        {/* Masthead. The fulfilment figure is set alongside the title rather than
            in a card below it — it is the one number that summarises the whole
            report, and dropping it into a grid of four equal tiles was the old
            page's way of saying it mattered no more than the others. */}
        <div className="mt-7 grid items-end gap-8 border-b border-line pb-8 md:grid-cols-[1fr_auto] md:gap-14">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">Hospital</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Analytics
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Your request activity and current stock, counted from every request you have filed.
            </p>
          </div>

          <div className="md:text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Fulfilment rate
            </p>
            <p className="mt-2 font-mono text-[4rem] font-medium leading-[0.8] tabular-nums text-bone">
              {fulfillmentRate}
              <span className="ml-1 align-top text-xl text-blood">%</span>
            </p>
          </div>
        </div>

        {/* Fulfilment split. One rule divided in proportion, which is the whole of
            what a percentage means, and the two counts underneath so the ratio is
            never read off pixel widths alone. */}
        <section className="pt-9">
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-raised"
            role="img"
            aria-label={`${fulfilled} of ${totalRequests} requests fulfilled`}
          >
            {totalRequests > 0 && (
              <>
                <span className="bg-life" style={{ width: `${fulfillmentRate}%` }} />
                <span className="flex-1 bg-line" />
              </>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="flex items-center gap-2 text-mute">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-life" />
              <span className="tabular-nums text-bone">{fulfilled}</span> fulfilled
            </span>
            <span className="flex items-center gap-2 text-mute">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-line" />
              <span className="tabular-nums text-bone">{unfulfilled}</span> not fulfilled
            </span>
            <span className="text-faint">All time</span>
          </div>
        </section>

        {/* ── 01 Activity ──────────────────────────────────────────────────── */}
        <section className="pt-12">
          <SectionLabel heading index="01">Request Activity</SectionLabel>

          {/* Three counts on one baseline with hairlines between them. A card each
              would put three borders around three integers. */}
          <dl className="grid gap-px overflow-hidden border-y border-line bg-line-soft sm:grid-cols-3">
            <div className="bg-ink px-1 py-5 sm:px-5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                This month
              </dt>
              <dd className="mt-2.5 font-mono text-3xl font-medium leading-none tabular-nums text-bone">
                {analytics.totalRequestsThisMonth}
              </dd>
              <dd className="mt-2 text-xs text-faint">requests filed since the 1st</dd>
            </div>

            <div className="bg-ink px-1 py-5 sm:px-5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                All time
              </dt>
              <dd className="mt-2.5 font-mono text-3xl font-medium leading-none tabular-nums text-bone">
                {totalRequests}
              </dd>
              <dd className="mt-2 text-xs text-faint">requests filed in total</dd>
            </div>

            <div className="bg-ink px-1 py-5 sm:px-5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Most requested
              </dt>
              <dd
                className={`mt-2.5 font-mono text-3xl font-medium leading-none ${
                  analytics.mostRequested ? 'text-blood' : 'text-line'
                }`}
              >
                {analytics.mostRequested
                  ? bloodGroupLabels[analytics.mostRequested] ?? analytics.mostRequested
                  : '—'}
              </dd>
              <dd className="mt-2 text-xs text-faint">
                {analytics.mostRequested
                  ? 'the group you have filed for most often'
                  : 'no requests filed yet'}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── 02 Stock profile ─────────────────────────────────────────────── */}
        <section className="pt-12">
          {/* The manage link goes through `aside` rather than sitting beside the
              label in a justify-between row — SectionLabel's hairline is a
              `flex-1` child, and it collapses to nothing the moment the label
              itself is shrunk to its content width. */}
          <SectionLabel
            heading
            index="02"
            aside={
              <Link href="/hospital/inventory" className={quietBtn}>
                Manage inventory
                <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden />
              </Link>
            }
          >
            Stock Profile
          </SectionLabel>

          {inventory.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No stock recorded yet."
              hint="Set your unit counts on the inventory page and they will be charted here."
            />
          ) : (
            <>
              {/* Columns rather than the horizontal meters used on the inventory
                  page: this is the same eight numbers read as a profile — which
                  groups are thin relative to the rest — and the low-stock rule
                  cutting across them is the point of drawing it at all. */}
              <div className="relative h-44 border-b border-line">
                <div
                  aria-hidden
                  className="absolute inset-x-0 border-t border-dashed border-warn/45"
                  style={{ bottom: `${thresholdPct}%` }}
                >
                  <span className="absolute -top-4 right-0 font-mono text-[9px] uppercase tracking-[0.14em] text-warn/80">
                    Low below {LOW_STOCK_UNITS}
                  </span>
                </div>

                <ul className="flex h-full items-end gap-2 sm:gap-3">
                  {inventory.map(item => {
                    const isLow = item.units < LOW_STOCK_UNITS
                    const pct = (item.units / chartMax) * 100

                    return (
                      <li key={item.id} className="flex h-full flex-1 flex-col justify-end">
                        <span className="mb-1.5 text-center font-mono text-[11px] tabular-nums text-bone">
                          {item.units}
                        </span>
                        <span
                          className={`w-full rounded-t-[2px] transition-[height] duration-500 ${
                            isLow ? 'bg-warn/70' : 'bg-blood'
                          }`}
                          // A group at zero still gets a visible stub, otherwise
                          // its column vanishes and the group reads as missing
                          // from the chart rather than empty on the shelf.
                          style={{ height: `${Math.max(pct, 1.5)}%` }}
                        />
                      </li>
                    )
                  })}
                </ul>
              </div>

              <ul className="mt-2.5 flex gap-2 sm:gap-3" aria-hidden>
                {inventory.map(item => (
                  <li
                    key={item.id}
                    className="flex-1 text-center font-mono text-[11px] font-medium text-mute"
                  >
                    {bloodGroupLabels[item.bloodGroup] ?? item.bloodGroup}
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-xs leading-relaxed text-faint">
                {inventory.length} of {TOTAL_GROUPS} blood groups are on record
                {inventory.length < TOTAL_GROUPS
                  ? ' — the rest have never had a unit count set, so they are not charted.'
                  : '.'}{' '}
                Columns are scaled to your largest holding, so they compare groups against each
                other rather than against a target.
              </p>
            </>
          )}
        </section>

        {/* ── 03 Low stock ─────────────────────────────────────────────────── */}
        {lowStock.length > 0 && (
          <section className="pt-12">
            <SectionLabel heading index="03">Running Low</SectionLabel>

            <div className="relative border-t border-line pt-6">
              <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-warn" />
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm text-bone">
                    {lowStock.length} blood group{lowStock.length !== 1 ? 's' : ''} below{' '}
                    {LOW_STOCK_UNITS} units.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lowStock.map(item => (
                      <Chip key={item.id} tone={urgencyTone.URGENT}>
                        {bloodGroupLabels[item.bloodGroup] ?? item.bloodGroup} — {item.units}{' '}
                        unit{item.units !== 1 ? 's' : ''}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
