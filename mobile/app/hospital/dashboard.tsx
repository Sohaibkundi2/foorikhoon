// app/hospital/dashboard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useEffect, useState } from 'react'
import { router, Link } from 'expo-router'
import {
  ArrowRight, ArrowUpRight, ChartColumn, Hourglass, Package, Pencil, Plus,
  ShieldCheck, Siren,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import { registerForPushNotifications, saveHospitalPushTokenToBackend } from '../../src/lib/notifications'

import {
  Screen, Label, SectionLabel, Rule, Chip, Button, Skeleton, SegmentMeter,
  EmptyState,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, toneFor, bloodLabel, Tone,
} from '../../src/theme'

// ── Types ────────────────────────────────────────────────────────────────────
interface HospitalProfile {
  id: string
  name: string
  address: string
  licenseNo: string
  verified: boolean
  user: { name: string; email: string; city: string; phone: string | null }
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const urgencyRank: Record<string, number> = { CRITICAL: 0, URGENT: 1, NORMAL: 2 }

/**
 * The shelf reads full at twenty units. Nothing in the schema declares a
 * capacity, so twenty is this screen's own scale for the meter — the unit count
 * beside it is the number of record.
 */
const SHELF_FULL = 20

/**
 * Stock tiers. The four-unit boundary is not arbitrary: the backend treats
 * `units < 5` as low stock, so this label agrees with the alerts a hospital
 * already receives.
 */
function stockLevel(units: number): { label: string; tint: string } {
  if (units <= 4) return { label: 'Low', tint: color.bloodLite }
  if (units <= 14) return { label: 'OK', tint: color.warnLite }
  return { label: 'Good', tint: color.lifeLite }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const verifiedTone: Tone = {
  fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Verified',
}
const unverifiedTone: Tone = {
  fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Pending verification',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HospitalDashboard() {
  const { user } = useAuthStore()

  const [hospital, setHospital]   = useState<HospitalProfile | null>(null)
  const [requests, setRequests]   = useState<BloodRequest[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'ADMIN') { router.replace('/admin/dashboard'); return }
    if (user.role === 'DONOR') { router.replace('/donor/dashboard'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
    fetchData()
  }, [user])

  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) saveHospitalPushTokenToBackend(token)
    })
  }, [])

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

  const activeRequests = requests
    .filter(r => r.status === 'PENDING' || r.status === 'MATCHED')
    .sort((a, b) => (urgencyRank[a.urgency] ?? 2) - (urgencyRank[b.urgency] ?? 2))
  const pastRequests   = requests.filter(r => r.status === 'FULFILLED' || r.status === 'EXPIRED')
  const criticalCount  = activeRequests.filter(r => r.urgency === 'CRITICAL').length
  const lowStockCount  = inventory.filter(i => i.units <= 4).length

  if (loading) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <Rule tick />
          <View style={{ marginTop: 22, gap: 12 }}>
            <Skeleton width="30%" height={11} />
            <Skeleton width="72%" height={24} />
            <Skeleton width="42%" height={12} />
          </View>
          <View style={{ marginTop: 36, gap: 1 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={styles.loadRow}>
                <Skeleton width={34} height={16} />
                <Skeleton width="46%" height={10} />
                <Skeleton width={26} height={16} />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen ember grid>
      {/* ── Masthead ───────────────────────────────────────────────────────
          The hospital's own name is the headline — a generic "Dashboard" title
          above it would push the one piece of identity on the screen down into
          the small print. */}
      <View style={styles.gutter}>
        <Rule tick />

        <View style={styles.mastRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Label style={{ marginBottom: 12 }}>Hospital · Operations</Label>
            <Text style={styles.hospitalName} numberOfLines={2}>{hospital?.name}</Text>

            <View style={styles.mastMeta}>
              <Text style={styles.city}>{hospital?.user.city}</Text>
              <View style={styles.metaDot} />
              {/* Verification was two coloured words; it is a state, so it takes
                  the same chip vocabulary states take everywhere else. */}
              <Chip
                tone={hospital?.verified ? verifiedTone : unverifiedTone}
                icon={hospital?.verified ? ShieldCheck : Hourglass}
              />
            </View>

            {hospital?.address && (
              <Text style={styles.address} numberOfLines={1}>{hospital.address}</Text>
            )}
          </View>

          <Link href="/hospital/profile" asChild>
            <Pressable style={styles.editBtn} hitSlop={6}>
              <Pencil size={12} color={color.mute} strokeWidth={2} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* ── Situation ──────────────────────────────────────────────────────
          A ruled band across the full width rather than a rounded hero card.
          The top rule goes red when something is critical, so the alert is
          structural — you see it before you read anything. */}
      <View style={styles.band}>
        <View
          style={[
            styles.bandTick,
            { backgroundColor: criticalCount > 0 ? color.blood : color.line },
          ]}
        />
        <View style={styles.gutter}>
          {criticalCount > 0 && (
            <View style={styles.sirenRow}>
              <Siren size={13} color={color.bloodLite} strokeWidth={2} />
              <Label loud style={{ color: color.bloodLite }}>Critical</Label>
            </View>
          )}

          <Text style={styles.bandStatus}>
            {criticalCount > 0
              ? `${criticalCount} critical request${criticalCount > 1 ? 's' : ''} need attention`
              : activeRequests.length > 0
                ? `${activeRequests.length} active request${activeRequests.length > 1 ? 's' : ''}`
                : 'No active requests'}
          </Text>
          <Text style={styles.bandSub}>
            {lowStockCount > 0
              ? `${lowStockCount} blood type${lowStockCount > 1 ? 's' : ''} running low in your inventory.`
              : 'Inventory levels look healthy.'}
          </Text>

          <Link href="/hospital/request/new" asChild>
            <Button tone="primary" size="lg" icon={Plus} full style={{ marginTop: 18 }}>
              New request
            </Button>
          </Link>
        </View>
      </View>

      {/* ── Inventory ──────────────────────────────────────────────────────
          Rows with a segmented meter, not a horizontal shelf of vertical
          bars. Eight groups don't fit across a phone, and comparing heights
          you have to scroll to see is guesswork. */}
      <View style={styles.gutter}>
        <SectionLabel
          index="01"
          aside={
            <Link href="/hospital/inventory" asChild>
              <Pressable hitSlop={6}>
                <Text style={styles.sectionAction}>Manage</Text>
              </Pressable>
            </Link>
          }
        >
          Blood inventory
        </SectionLabel>

        {inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory added yet"
            body="Record what is on the shelf and this screen will flag the groups that fall below five units."
            action={
              <Link href="/hospital/inventory" asChild>
                <Button tone="ghost" size="sm">Add inventory</Button>
              </Link>
            }
          />
        ) : (
          inventory.map((item) => {
            const level = stockLevel(item.units)
            return (
              <View key={item.id} style={styles.stockRow}>
                <Text style={styles.stockGroup}>{bloodLabel(item.bloodGroup)}</Text>
                <SegmentMeter
                  value={item.units}
                  max={SHELF_FULL}
                  segments={10}
                  tint={level.tint}
                  style={{ flex: 1 }}
                />
                <Text style={styles.stockUnits}>{item.units}</Text>
                <Text style={[styles.stockLevel, { color: level.tint }]}>{level.label}</Text>
              </View>
            )
          })
        )}
      </View>

      {/* ── Active requests ────────────────────────────────────────────── */}
      <View style={{ marginTop: 34 }}>
        <View style={styles.gutter}>
          <SectionLabel
            index="02"
            aside={
              <Link href="/hospital/requests" asChild>
                <Pressable hitSlop={6}>
                  <Text style={styles.sectionAction}>View all</Text>
                </Pressable>
              </Link>
            }
          >
            {activeRequests.length > 0
              ? `Active requests · ${activeRequests.length}`
              : 'Active requests'}
          </SectionLabel>
        </View>

        {activeRequests.length === 0 ? (
          <View style={styles.gutter}>
            <EmptyState
              icon={ArrowRight}
              title="No active requests"
              body="Nothing is open. Posting a request runs the match against donors in your radius straight away."
              action={
                <Link href="/hospital/request/new" asChild>
                  <Button tone="ghost" size="sm" icon={Plus}>Post a new request</Button>
                </Link>
              }
            />
          </View>
        ) : (
          activeRequests.map((req) => {
            const urg = toneFor(urgencyTone, req.urgency)
            const matchCount = req.matches?.length ?? 0
            return (
              /* The urgency carries down the page as a 2px edge; the chip
                 repeats it in words for anyone who can't read the colour. */
              <View key={req.id} style={styles.reqRow}>
                <View style={[styles.edge, { backgroundColor: urg.fg }]} />
                <View style={styles.reqBody}>
                  <View style={styles.reqTop}>
                    <Text style={styles.reqGroup}>{bloodLabel(req.bloodGroup)}</Text>
                    <Text style={styles.reqUnits}>
                      {req.units} unit{req.units > 1 ? 's' : ''} needed
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Chip tone={urg} />
                  </View>

                  {req.notes ? (
                    <Text style={styles.reqNotes} numberOfLines={2}>{req.notes}</Text>
                  ) : null}

                  <View style={styles.reqFoot}>
                    <Text style={styles.reqMetaMono}>
                      {matchCount} donor{matchCount !== 1 ? 's' : ''} matched
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.reqMeta}>{timeAgo(req.createdAt)}</Text>
                  </View>
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* ── History ────────────────────────────────────────────────────── */}
      {pastRequests.length > 0 && (
        <View style={[styles.gutter, { marginTop: 34 }]}>
          <SectionLabel index="03">History</SectionLabel>
          {pastRequests.map((req) => {
            const st = toneFor(statusTone, req.status)
            return (
              <View key={req.id} style={styles.histRow}>
                <View style={[styles.histTick, { backgroundColor: st.fg }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.histTitle} numberOfLines={1}>
                    {bloodLabel(req.bloodGroup)} · {req.units} unit{req.units > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.histMeta}>{timeAgo(req.createdAt)}</Text>
                </View>
                <Chip tone={st} />
              </View>
            )
          })}
        </View>
      )}

      {/* ── Analytics ──────────────────────────────────────────────────── */}
      <Rule style={{ marginTop: 34 }} />
      <View style={styles.gutter}>
        <Link href="/hospital/analytics" asChild>
          <Pressable style={styles.analyticsRow}>
            <ChartColumn size={14} color={color.mute} strokeWidth={2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.analyticsTitle}>Detailed analytics</Text>
              <Text style={styles.analyticsSub}>
                Fulfilment rate, response times and shortage predictions
              </Text>
            </View>
            <ArrowUpRight size={15} color={color.faint} strokeWidth={2} />
          </Pressable>
        </Link>
      </View>
    </Screen>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },

  // Masthead
  mastRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 24 },
  hospitalName: {
    fontFamily: font.sans.semibold, fontSize: 25, lineHeight: 30,
    color: color.bone, letterSpacing: -1,
  },
  mastMeta: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11, flexWrap: 'wrap' },
  city: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.faint },
  address: { fontFamily: font.sans.regular, fontSize: 12, color: color.faint, marginTop: 9 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 7, flexShrink: 0,
  },
  editText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  // Situation band
  band: {
    marginTop: 30, marginBottom: 34,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingBottom: 22, paddingTop: 20,
  },
  bandTick: { height: 2, marginBottom: 20 },
  sirenRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  bandStatus: {
    fontFamily: font.sans.semibold, fontSize: 19, lineHeight: 25,
    color: color.bone, letterSpacing: -0.6,
  },
  bandSub: {
    fontFamily: font.sans.regular, fontSize: 13, lineHeight: 19,
    color: color.mute, marginTop: 7,
  },

  sectionAction: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.bloodLite,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  // Inventory rows
  stockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  stockGroup: {
    fontFamily: font.mono.medium, fontSize: 14, color: color.bloodLite,
    letterSpacing: -0.4, width: 34,
  },
  stockUnits: {
    fontFamily: font.mono.medium, fontSize: 15, color: color.bone,
    fontVariant: ['tabular-nums'], width: 26, textAlign: 'right',
  },
  stockLevel: {
    fontFamily: font.mono.regular, fontSize: 9, letterSpacing: 1.1,
    textTransform: 'uppercase', width: 34, textAlign: 'right',
  },

  // Request rows
  reqRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  edge: { width: 2 },
  reqBody: { flex: 1, minWidth: 0, paddingHorizontal: 18, paddingVertical: 16 },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqGroup: {
    fontFamily: font.mono.medium, fontSize: 20, color: color.bone, letterSpacing: -1,
  },
  reqUnits: { fontFamily: font.sans.regular, fontSize: 12.5, color: color.mute },
  reqNotes: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18,
    color: color.mute, marginTop: 9,
  },
  reqFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  reqMetaMono: { fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute },
  reqMeta: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint },

  // History
  histRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  histTick: { width: 2, height: 26, borderRadius: 1 },
  histTitle: {
    fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2,
  },
  histMeta: { fontFamily: font.mono.regular, fontSize: 10, color: color.faint, marginTop: 4 },

  // Analytics
  analyticsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20 },
  analyticsTitle: {
    fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2,
  },
  analyticsSub: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 4,
  },
})
