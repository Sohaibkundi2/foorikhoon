'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Pencil, TriangleAlert } from 'lucide-react'
import {
  Chip,
  SegmentMeter,
  Texture,
  ghostBtn,
  neutralBtn,
  primaryBtn,
  urgencyTone
} from '@/components/fk'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const ALL_GROUPS = Object.keys(bloodGroupLabels)
const LOW_STOCK_THRESHOLD = 5

/** Shared by the column header and every row so the two cannot drift. */
const LEDGER_COLS = 'grid grid-cols-[3.5rem_minmax(0,1fr)_5.5rem] items-center gap-4 sm:gap-6'

export default function HospitalInventoryPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [inventory, setInventory] = useState<Inventory[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
    fetchInventory()
  }, [user])

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/hospital/inventory')
      const data: Inventory[] = res.data.inventory

      // Build a map of bloodGroup -> units, defaulting to 0 for any
      // group the hospital hasn't set up yet
      const values: Record<string, number> = {}
      ALL_GROUPS.forEach(bg => { values[bg] = 0 })
      data.forEach(item => { values[item.bloodGroup] = item.units })

      setInventory(data)
      setEditValues(values)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (bloodGroup: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0)
    setEditValues(prev => ({ ...prev, [bloodGroup]: num }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALL_GROUPS.map(bg =>
          api.put('/api/hospital/inventory', {
            bloodGroup: bg,
            units: editValues[bg],
          })
        )
      )
      await fetchInventory()
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset edit values back to the last fetched state
    const values: Record<string, number> = {}
    ALL_GROUPS.forEach(bg => { values[bg] = 0 })
    inventory.forEach(item => { values[item.bloodGroup] = item.units })
    setEditValues(values)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  const totalUnits = ALL_GROUPS.reduce((sum, bg) => sum + (editValues[bg] || 0), 0)
  const lowGroups = ALL_GROUPS.filter(bg => (editValues[bg] || 0) < LOW_STOCK_THRESHOLD)
  // Bars are scaled to this hospital's own largest holding. The unit figure is
  // printed on every row, so nothing has to be inferred from bar length.
  const peak = Math.max(...ALL_GROUPS.map(bg => editValues[bg] || 0), 1)

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

        {/* Masthead */}
        <div className="relative mt-7 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Hospital</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Blood Inventory
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Keep your stock levels up to date so donors can be matched accurately.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {editing ? (
              <>
                <button onClick={handleCancel} disabled={saving} className={neutralBtn}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className={primaryBtn}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className={ghostBtn}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Edit Inventory
              </button>
            )}
          </div>
        </div>

        {/* Two standing figures, read as a sentence rather than boxed as cards.
            There are only two of them; a card each would be three borders around
            one number. */}
        <div className="mt-8 flex flex-wrap items-end gap-x-12 gap-y-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Total on shelf
            </p>
            <p className="mt-2 font-mono text-[2.5rem] font-medium leading-[0.85] tabular-nums text-bone">
              {totalUnits}
              <span className="ml-2 text-xs uppercase tracking-[0.14em] text-faint">units</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Groups below {LOW_STOCK_THRESHOLD}
            </p>
            <p
              className={`mt-2 font-mono text-[2.5rem] font-medium leading-[0.85] tabular-nums ${
                lowGroups.length > 0 ? 'text-warn' : 'text-life'
              }`}
            >
              {lowGroups.length}
              <span className="ml-2 text-xs uppercase tracking-[0.14em] text-faint">of 8</span>
            </p>
          </div>

          {lowGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {lowGroups.map(bg => (
                <Chip key={bg} tone={urgencyTone.URGENT}>{bloodGroupLabels[bg]}</Chip>
              ))}
            </div>
          )}
        </div>

        {/* Ledger. Eight rows against a shared baseline, so the groups can be
            compared at a glance — a grid of eight tiles makes every group look
            identical until all eight numbers have been read individually. */}
        <div className="mt-12">
          <div
            aria-hidden
            className={`${LEDGER_COLS} border-y border-line px-1 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-line`}
          >
            <span>Group</span>
            <span>Level</span>
            <span className="text-right">Units</span>
          </div>

          <ul>
            {ALL_GROUPS.map((bg) => {
              const units = editValues[bg]
              const isLow = units < LOW_STOCK_THRESHOLD

              return (
                <li key={bg} className={`${LEDGER_COLS} border-b border-line-soft px-1 py-4`}>
                  <span className="font-mono text-base font-medium tabular-nums text-blood">
                    {bloodGroupLabels[bg]}
                  </span>

                  <div className="min-w-0">
                    <SegmentMeter
                      value={units}
                      max={peak}
                      segments={14}
                      tone={isLow ? 'bg-warn' : 'bg-blood'}
                    />
                    {isLow && (
                      <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-warn">
                        <TriangleAlert className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                        Low stock
                      </p>
                    )}
                  </div>

                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      value={units}
                      aria-label={`${bloodGroupLabels[bg]} units in stock`}
                      onChange={(e) => handleChange(bg, e.target.value)}
                      className="w-full rounded-md border border-line bg-raised py-2 text-right font-mono text-base tabular-nums text-bone outline-none transition-colors duration-150 focus:border-blood focus:ring-1 focus:ring-blood/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <span className="text-right font-mono text-lg tabular-nums text-bone">
                      {units}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-faint">
            A group counts as low below {LOW_STOCK_THRESHOLD} units — the same threshold the
            analytics page uses. Bars are scaled to your largest holding, so they compare groups
            against each other, not against a target.
          </p>
        </div>

      </div>
    </div>
  )
}
