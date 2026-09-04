'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import {
  ArrowLeft,
  Pencil,
  TriangleAlert,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Layers,
  Save,
  X,
  ShieldAlert
} from 'lucide-react'
import { Texture } from '@/components/fk'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
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

const ALL_GROUPS = Object.keys(bloodGroupLabels)
const LOW_STOCK_THRESHOLD = 5

export default function HospitalInventoryPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [inventory, setInventory] = useState<Inventory[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterView, setFilterView] = useState<'ALL' | 'LOW'>('ALL')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'HOSPITAL') {
      router.push('/')
      return
    }
    fetchInventory()
  }, [user])

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/hospital/inventory')
      const data: Inventory[] = res.data.inventory || []

      const values: Record<string, number> = {}
      ALL_GROUPS.forEach((bg) => {
        values[bg] = 0
      })
      data.forEach((item) => {
        values[item.bloodGroup] = item.units
      })

      setInventory(data)
      setEditValues(values)
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (bloodGroup: string, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setEditValues((prev) => ({ ...prev, [bloodGroup]: num }))
  }

  const handleStep = (bloodGroup: string, delta: number) => {
    setEditValues((prev) => {
      const current = prev[bloodGroup] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [bloodGroup]: next }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALL_GROUPS.map((bg) =>
          api.put('/api/hospital/inventory', {
            bloodGroup: bg,
            units: editValues[bg] ?? 0,
          })
        )
      )
      await fetchInventory()
      setEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save inventory:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const values: Record<string, number> = {}
    ALL_GROUPS.forEach((bg) => {
      values[bg] = 0
    })
    inventory.forEach((item) => {
      values[item.bloodGroup] = item.units
    })
    setEditValues(values)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Syncing blood bank inventory...
          </p>
        </div>
      </div>
    )
  }

  const totalUnits = ALL_GROUPS.reduce((sum, bg) => sum + (editValues[bg] || 0), 0)
  const lowGroups = ALL_GROUPS.filter((bg) => (editValues[bg] || 0) < LOW_STOCK_THRESHOLD)
  const zeroStockGroups = ALL_GROUPS.filter((bg) => (editValues[bg] || 0) === 0)
  const peak = Math.max(...ALL_GROUPS.map((bg) => editValues[bg] || 0), 1)

  const displayedGroups = filterView === 'LOW' ? lowGroups : ALL_GROUPS

  return (
    <div className="relative min-h-screen overflow-hidden pb-32">
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
                Hospital Operations
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              Blood Bank Inventory
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">
              Real-time reserve levels matched directly against national emergency dispatches.
              Groups below {LOW_STOCK_THRESHOLD} units trigger automated matching alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-mute transition hover:bg-raised hover:text-bone disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-blood px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(220,38,38,0.4)] transition hover:bg-blood-dark disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Stock Levels'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-raised px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-bone transition hover:border-blood/40 hover:bg-surface"
              >
                <Pencil className="h-3.5 w-3.5 text-blood" />
                Adjust Stock Levels
              </button>
            )}
          </div>
        </div>

        {/* Status Notification */}
        {saveSuccess && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-xs text-bone shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-bone" />
            <span>Blood bank inventory levels successfully updated and saved.</span>
          </div>
        )}

        {/* Telemetry HUD Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-faint">
              <span className="font-mono text-[10px] uppercase tracking-widest">Total On Shelf</span>
              <Package className="h-4 w-4" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone sm:text-4xl">
              {totalUnits}
              <span className="ml-2 text-xs font-normal uppercase tracking-wider text-faint">units</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">Across all 8 antigen types</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-faint">
              <span className="font-mono text-[10px] uppercase tracking-widest">Low Stock (&lt;5)</span>
              <TriangleAlert className="h-4 w-4 text-warn" />
            </div>
            <p
              className={`mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl ${
                lowGroups.length > 0 ? 'text-warn' : 'text-bone'
              }`}
            >
              {lowGroups.length}
              <span className="ml-2 text-xs font-normal uppercase tracking-wider text-faint">of 8</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">Require donor call-out</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-faint">
              <span className="font-mono text-[10px] uppercase tracking-widest">Zero Reserve</span>
              <ShieldAlert className="h-4 w-4 text-blood" />
            </div>
            <p
              className={`mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl ${
                zeroStockGroups.length > 0 ? 'text-blood' : 'text-bone'
              }`}
            >
              {zeroStockGroups.length}
              <span className="ml-2 text-xs font-normal uppercase tracking-wider text-faint">groups</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">Complete supply exhaustion</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-faint">
              <span className="font-mono text-[10px] uppercase tracking-widest">Stock Health</span>
              <Layers className="h-4 w-4" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-bone sm:text-4xl">
              {Math.round(((8 - lowGroups.length) / 8) * 100)}%
            </p>
            <p className="mt-1 font-mono text-[11px] text-faint">Stabilized blood supply</p>
          </div>
        </div>

        {/* Low Stock Warning Alert if any */}
        {lowGroups.length > 0 && (
          <div className="mt-6 rounded-xl border border-warn/30 bg-warn/5 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warn">
                    Stock Depletion Alert
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    Immediate replenishment needed for{' '}
                    <span className="font-medium text-bone">
                      {lowGroups.map((bg) => bloodGroupLabels[bg]).join(', ')}
                    </span>
                    . We recommend filing emergency requests to notify matching donors in your district.
                  </p>
                </div>
              </div>
              <Link
                href="/hospital/request/new"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-blood/40 bg-blood/20 px-4 py-2 font-mono text-xs font-medium uppercase tracking-wider text-bone transition hover:bg-blood/30"
              >
                Post Emergency Request
              </Link>
            </div>
          </div>
        )}

        {/* Filter Tab Bar */}
        <div className="mt-10 flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterView('ALL')}
              className={`rounded-md px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                filterView === 'ALL'
                  ? 'bg-raised text-bone border border-line'
                  : 'text-faint hover:text-mute'
              }`}
            >
              All Groups (8)
            </button>
            <button
              type="button"
              onClick={() => setFilterView('LOW')}
              className={`rounded-md px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                filterView === 'LOW'
                  ? 'bg-raised text-warn border border-warn/30'
                  : 'text-faint hover:text-mute'
              }`}
            >
              Low Reserve ({lowGroups.length})
            </button>
          </div>

          <div className="hidden font-mono text-[11px] text-faint sm:block">
            {editing ? 'Editing mode active — adjust values directly or use + / -' : 'Read-only display'}
          </div>
        </div>

        {/* Main Stock Ledger / Cards */}
        <div className="mt-6 space-y-3">
          {displayedGroups.map((bg) => {
            const units = editValues[bg] ?? 0
            const isZero = units === 0
            const isLow = units < LOW_STOCK_THRESHOLD
            const fillPct = Math.min(100, Math.round((units / Math.max(peak, 10)) * 100))

            return (
              <div
                key={bg}
                className={`group relative rounded-xl border p-4 sm:p-5 transition-colors ${
                  isZero
                    ? 'border-blood/30 bg-blood/[0.03]'
                    : isLow
                    ? 'border-warn/25 bg-warn/[0.02]'
                    : 'border-line bg-surface hover:border-line/80'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Blood Group Badge & Tag */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border font-mono text-lg font-bold ${
                        isZero
                          ? 'border-blood/40 bg-blood/10 text-blood'
                          : isLow
                          ? 'border-warn/30 bg-warn/10 text-warn'
                          : 'border-line bg-raised text-bone'
                      }`}
                    >
                      {bloodGroupLabels[bg]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs uppercase tracking-wider text-bone">
                          Group {bloodGroupLabels[bg]}
                        </span>
                        {isZero ? (
                          <span className="rounded border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-blood">
                            Depleted
                          </span>
                        ) : isLow ? (
                          <span className="rounded border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warn">
                            Low Stock (&lt;5)
                          </span>
                        ) : (
                          <span className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
                            Adequate
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-faint">
                        {bg.replace('_POS', ' Positive').replace('_NEG', ' Negative')}
                      </p>
                    </div>
                  </div>

                  {/* Meter Bar */}
                  <div className="min-w-0 flex-1 sm:max-w-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-faint mb-1.5">
                      <span>Reserve Gauge</span>
                      <span className="tabular-nums text-bone">{units} units</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isZero ? 'bg-transparent' : isLow ? 'bg-warn' : 'bg-blood'
                        }`}
                        style={{ width: `${Math.max(fillPct, 3)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stock Value & Editor Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStep(bg, -1)}
                          disabled={units <= 0}
                          aria-label={`Decrease ${bloodGroupLabels[bg]}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-bone transition hover:border-blood/40 hover:bg-surface disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={units}
                          aria-label={`${bloodGroupLabels[bg]} units in stock`}
                          onChange={(e) => handleChange(bg, e.target.value)}
                          className="h-9 w-16 rounded-md border border-line bg-raised px-2 text-center font-mono text-base font-medium tabular-nums text-bone outline-none focus:border-blood focus:ring-1 focus:ring-blood/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStep(bg, 1)}
                          aria-label={`Increase ${bloodGroupLabels[bg]}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-bone transition hover:border-blood/40 hover:bg-surface"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold tabular-nums text-bone">
                          {units}
                        </span>
                        <span className="ml-1.5 font-mono text-xs uppercase tracking-wider text-faint">
                          units
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Technical Reference */}
        <div className="mt-12 rounded-xl border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Protocol Guidance & Thresholds
          </p>
          <div className="mt-3 grid gap-4 text-xs leading-relaxed text-mute sm:grid-cols-2">
            <p>
              • <strong className="text-bone">Low Reserve Threshold:</strong> Less than 5 units
              flags an automated warning in the regional distribution dispatch and highlights the
              deficiency on hospital analytics charts.
            </p>
            <p>
              • <strong className="text-bone">Deterministic AI Weight:</strong> Hospitals with
              depleted reserves are prioritized when matching incoming volunteer donors from nearby
              clusters within a 15 km radius.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
