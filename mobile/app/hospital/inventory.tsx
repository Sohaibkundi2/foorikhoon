// app/hospital/inventory.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Check, Minus, Pencil, Plus, X } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Button, Input, Skeleton,
  SegmentMeter,
} from '../../src/components/fk'
import {
  color, wash, font, radius, bloodLabel, BLOOD_GROUPS,
} from '../../src/theme'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

/** Enum order comes from the shared token file so the eight rows here sit in the
 *  same sequence as the lattice on the request form. */
const ALL_GROUPS: string[] = [...BLOOD_GROUPS]

/** The backend flags stock as low at `units < 5`. Same number here, so the row
 *  and the alert a hospital receives never disagree. */
const LOW_STOCK_THRESHOLD = 5

/**
 * The meter reads full at twenty units. Nothing in the schema declares a fridge
 * capacity, so twenty is this screen's own scale — the figure beside the meter
 * is the number of record, the bar is only there to be comparable at a glance.
 */
const SHELF_FULL = 20

function stockLevel(units: number): { label: string; tint: string } {
  if (units < LOW_STOCK_THRESHOLD) return { label: 'Low', tint: color.bloodLite }
  if (units <= 14) return { label: 'OK', tint: color.warnLite }
  return { label: 'Good', tint: color.lifeLite }
}

export default function HospitalInventoryScreen() {
  const { user } = useAuthStore()

  const [inventory, setInventory] = useState<Inventory[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
    fetchInventory()
  }, [user])

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/hospital/inventory')
      const data: Inventory[] = res.data.inventory

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
    const num = Math.max(0, parseInt(value, 10) || 0)
    setEditValues(prev => ({ ...prev, [bloodGroup]: num }))
  }

  const adjust = (bloodGroup: string, delta: number) => {
    setEditValues(prev => ({ ...prev, [bloodGroup]: Math.max(0, prev[bloodGroup] + delta) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALL_GROUPS.map(bg =>
          api.put('/api/hospital/inventory', { bloodGroup: bg, units: editValues[bg] })
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
    const values: Record<string, number> = {}
    ALL_GROUPS.forEach(bg => { values[bg] = 0 })
    inventory.forEach(item => { values[item.bloodGroup] = item.units })
    setEditValues(values)
    setEditing(false)
  }

  /* All three figures below are read off state that already exists — the total
     tracks the edits live, so you can see the shelf change as you type. */
  const totalUnits = ALL_GROUPS.reduce((sum, bg) => sum + (editValues[bg] ?? 0), 0)
  const lowCount = ALL_GROUPS.filter(bg => (editValues[bg] ?? 0) < LOW_STOCK_THRESHOLD).length
  const emptyCount = ALL_GROUPS.filter(bg => (editValues[bg] ?? 0) === 0).length
  const savedUnits = (bg: string) => inventory.find(i => i.bloodGroup === bg)?.units ?? 0

  if (loading) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <Rule tick />
          <View style={{ marginTop: 22, gap: 12 }}>
            <Skeleton width="26%" height={11} />
            <Skeleton width="66%" height={26} />
          </View>
          <View style={{ marginTop: 38, gap: 1 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <View key={i} style={styles.loadRow}>
                <Skeleton width={34} height={16} />
                <Skeleton width="44%" height={5} />
                <Skeleton width={24} height={16} />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen ember grid tail={40}>
      <PageHead
        eyebrow="Hospital · Stock"
        title="What's on"
        accent="the shelf."
        sub="Matching reads these numbers, so a group left at zero is a group nobody will be asked to cover. Anything under five units is flagged low."
        aside={
          editing ? undefined : (
            /* The mode control sits with the heading; the Save and Cancel pair
               lives at the foot of the rows it applies to. */
            <Pressable onPress={() => setEditing(true)} style={styles.editBtn} hitSlop={6}>
              <Pencil size={12} color={color.mute} strokeWidth={2} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          )
        }
      />

      {/* ── Shelf total ────────────────────────────────────────────────────
          One large figure carrying the whole shelf, then the two counts that
          qualify it. Eight small tiles gave every group equal weight and left
          no room for the number a hospital actually reports upward. */}
      <View style={styles.band}>
        <View
          style={[
            styles.bandTick,
            { backgroundColor: lowCount > 0 ? color.blood : color.line },
          ]}
        />
        <View style={styles.gutter}>
          <Label>Units on the shelf</Label>
          <View style={styles.totalRow}>
            <Text style={styles.totalFigure}>{totalUnits}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.totalNote}>
                across {ALL_GROUPS.length} blood groups
              </Text>
              <Text style={styles.totalSub}>
                {lowCount > 0
                  ? `${lowCount} group${lowCount > 1 ? 's' : ''} under five units${emptyCount > 0 ? `, ${emptyCount} at zero` : ''}`
                  : 'Every group is above the low-stock line'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── The ledger ─────────────────────────────────────────────────────
          One row per group on a hairline. The meter stays put between modes so
          the row doesn't jump when you start editing; only the right-hand side
          swaps a figure for a stepper. */}
      <View style={styles.gutter}>
        <SectionLabel
          index="01"
          aside={<Label>{editing ? 'Editing' : 'Read only'}</Label>}
        >
          Stock by group
        </SectionLabel>

        {ALL_GROUPS.map((bg) => {
          const units = editValues[bg] ?? 0
          const level = stockLevel(units)
          const delta = units - savedUnits(bg)

          return (
            <View key={bg} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={[styles.group, units < LOW_STOCK_THRESHOLD && { color: color.bloodLite }]}>
                  {bloodLabel(bg)}
                </Text>

                {editing ? (
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => adjust(bg, -1)}
                      style={[styles.stepBtn, units === 0 && styles.stepBtnOff]}
                      hitSlop={4}
                    >
                      {/* Were − and + text glyphs. */}
                      <Minus
                        size={15}
                        color={units === 0 ? color.faint : color.bone}
                        strokeWidth={2}
                      />
                    </Pressable>
                    <Input
                      value={String(units)}
                      onChangeText={(v) => handleChange(bg, v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={styles.input}
                    />
                    <Pressable onPress={() => adjust(bg, 1)} style={styles.stepBtn} hitSlop={4}>
                      <Plus size={15} color={color.bone} strokeWidth={2} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.units}>{units}</Text>
                    <Text style={styles.unitsWord}>
                      unit{units !== 1 ? 's' : ''}
                    </Text>
                  </>
                )}

                <Text style={[styles.level, { color: level.tint }]}>{level.label}</Text>
              </View>

              <View style={styles.rowMeter}>
                <SegmentMeter
                  value={units}
                  max={SHELF_FULL}
                  segments={20}
                  tint={level.tint}
                  style={{ flex: 1 }}
                />
                {/* Only while editing, and only when the row has actually moved:
                    the difference against what is currently saved. */}
                {editing && delta !== 0 ? (
                  <Text
                    style={[
                      styles.delta,
                      { color: delta > 0 ? color.lifeLite : color.bloodLite },
                    ]}
                  >
                    {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        })}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        {editing ? (
          <View style={{ marginTop: 26, gap: 9 }}>
            <Button
              tone="primary"
              size="lg"
              full
              icon={Check}
              busy={saving}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? 'Saving…' : 'Save stock levels'}
            </Button>
            <Button
              tone="quiet"
              size="md"
              full
              icon={X}
              disabled={saving}
              onPress={handleCancel}
            >
              Discard changes
            </Button>
          </View>
        ) : null}

        <Text style={styles.footnote}>
          Updating a group writes one record per blood type, so the eight rows
          save together. Nothing here is shared with donors — they only see that
          a request exists, never your shelf.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 7, flexShrink: 0,
  },
  editText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  // Shelf total
  band: {
    borderTopWidth: 1, borderTopColor: color.line,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingBottom: 22, marginBottom: 32,
  },
  bandTick: { height: 2, marginBottom: 20 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 10 },
  totalFigure: {
    fontFamily: font.mono.medium, fontSize: 46, lineHeight: 48,
    color: color.bone, letterSpacing: -3, fontVariant: ['tabular-nums'],
  },
  totalNote: {
    fontFamily: font.sans.regular, fontSize: 13, color: color.mute, letterSpacing: -0.2,
  },
  totalSub: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 5,
  },

  // Ledger rows
  row: { borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  group: {
    fontFamily: font.mono.medium, fontSize: 17, color: color.bone,
    letterSpacing: -0.7, width: 38,
  },
  units: {
    fontFamily: font.mono.medium, fontSize: 17, color: color.bone,
    letterSpacing: -0.6, fontVariant: ['tabular-nums'],
  },
  unitsWord: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint },
  level: {
    fontFamily: font.mono.regular, fontSize: 9, letterSpacing: 1.1,
    textTransform: 'uppercase', width: 34, textAlign: 'right',
  },

  rowMeter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  delta: {
    fontFamily: font.mono.medium, fontSize: 10.5, letterSpacing: 0.3,
    fontVariant: ['tabular-nums'], width: 34, textAlign: 'right',
  },

  // Edit stepper
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepBtn: {
    width: 34, height: 34, borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff: { borderColor: color.lineSoft, backgroundColor: color.ink },
  input: {
    flex: 1, textAlign: 'center',
    paddingVertical: 7, paddingHorizontal: 8,
    fontFamily: font.mono.medium, fontSize: 15,
    backgroundColor: color.ink, borderColor: wash.boneEdge,
  },

  footnote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 18,
    color: color.faint, marginTop: 26,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: 16,
  },
})
