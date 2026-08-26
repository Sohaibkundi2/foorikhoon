// app/admin/dashboard.tsx
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import {
  Ban, Building2, LogOut, ShieldCheck, TriangleAlert,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Chip, Button, Skeleton,
  EmptyState, Notice, useTabBarInset,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, riskTone, toneFor,
  bloodLabel, Tone,
} from '../../src/theme'

// ── Types ────────────────────────────────────────────────────────────────────
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
  user: { name: string; email: string; city: string; phone: string | null }
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
  hospital: { name: string; user: { city: string } }
}

/**
 * Roles get tones from the same four families as everything else. The previous
 * version painted ADMIN violet and HOSPITAL blue, which read as two more colour
 * families with no meaning attached to them.
 */
const roleTone: Record<string, Tone> = {
  ADMIN: { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'Admin' },
  HOSPITAL: { fg: color.bone, bg: wash.bone, border: wash.boneEdge, label: 'Hospital' },
  DONOR: { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Donor' },
}

const verifiedTone: Tone = {
  fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Verified',
}
const unverifiedTone: Tone = {
  fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Pending',
}

type Tab = 'OVERVIEW' | 'HOSPITALS' | 'USERS' | 'REQUESTS' | 'SHORTAGE'
const TABS: Tab[] = ['OVERVIEW', 'HOSPITALS', 'USERS', 'REQUESTS', 'SHORTAGE']

/** Display strings for the rail. The enum values stay the state keys. */
const TAB_LABEL: Record<Tab, string> = {
  OVERVIEW: 'Overview',
  HOSPITALS: 'Hospitals',
  USERS: 'Users',
  REQUESTS: 'Requests',
  SHORTAGE: 'Shortage',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuthStore()

  const [stats, setStats]           = useState<Stats | null>(null)
  const [hospitals, setHospitals]   = useState<Hospital[]>([])
  const [users, setUsers]           = useState<User[]>([])
  const [requests, setRequests]     = useState<BloodRequest[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>('OVERVIEW')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const bottomInset = useTabBarInset()

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'ADMIN') { router.replace('/'); return }
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    try {
      const [statsRes, hospitalsRes, usersRes, requestsRes, shortageRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/hospitals'),
        api.get('/api/admin/users'),
        api.get('/api/admin/requests'),
        api.get('/api/map/shortage'),
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
      setHospitals(hospitals.map(h => h.id === id ? { ...h, verified: !h.verified } : h))
    } catch (err) {
      console.error(err)
    } finally {
      setVerifyingId(null)
    }
  }

  /* ADMIN has no profile screen, so this is the only way out of the session on
     mobile. Same two steps every other sign-out uses. */
  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen>
        <View style={styles.gutter}>
          <Rule tick />
          <View style={{ marginTop: 22, gap: 12 }}>
            <Skeleton width="26%" height={11} />
            <Skeleton width="58%" height={26} />
          </View>
          <View style={{ marginTop: 34, gap: 1 }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View key={i} style={styles.loadRow}>
                <Skeleton width="44%" height={12} />
                <Skeleton width={38} height={20} />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    /* The inner ScrollView owns the scrolling, so the Screen is a plain frame. */
    <Screen scroll={false} grid>
      <PageHead
        eyebrow="Admin · Console"
        title="The whole"
        accent="register."
        sub="Every account, hospital, request and shortage reading the platform holds, read straight from the admin endpoints."
        aside={
          <Pressable onPress={handleLogout} style={styles.signOut} hitSlop={8}>
            <LogOut size={12} color={color.mute} strokeWidth={2} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        }
      />

      {/* Tab rail — same chip vocabulary as the donor match filter, so a rail of
          switches looks the same wherever it appears. */}
      <View style={styles.railWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {TABS.map(tab => {
            const active = activeTab === tab
            const count =
              tab === 'HOSPITALS' ? hospitals.length
              : tab === 'USERS' ? users.length
              : tab === 'REQUESTS' ? requests.length
              : tab === 'SHORTAGE' ? predictions.length
              : 0
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.railChip, active && styles.railChipOn]}
              >
                <Text style={[styles.railText, active && styles.railTextOn]}>
                  {TAB_LABEL[tab]}
                </Text>
                {count > 0 && (
                  <Text style={[styles.railCount, active && { color: color.bloodLite }]}>
                    {count}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      >
        {/* ── OVERVIEW ── */}
        {activeTab === 'OVERVIEW' && stats && (
          <View style={styles.gutter}>
            {stats.pendingVerification > 0 && (
              /* Was a ⚠ text glyph in the header. It belongs with the thing it
                 is about, and it now takes you there — the tap only sets the
                 tab state that already exists. */
              <Pressable onPress={() => setActiveTab('HOSPITALS')}>
                <Notice tone={unverifiedTone} icon={TriangleAlert} style={{ marginBottom: 26 }}>
                  {stats.pendingVerification} hospital
                  {stats.pendingVerification > 1 ? 's' : ''} waiting on verification. Tap to review.
                </Notice>
              </Pressable>
            )}

            {/* The headline figure gets the size; the rest is a ledger of
                hairline rows. Six equal cards in a grid say nothing about which
                number matters. */}
            <Label loud>Accounts on the platform</Label>
            <Text style={styles.bigFigure}>{stats.totalUsers}</Text>

            <View style={{ marginTop: 26 }}>
              <LedgerRow label="Donors" value={stats.totalDonors} tint={color.lifeLite} />
              <LedgerRow label="Hospitals" value={stats.totalHospitals} />
              <LedgerRow label="Blood requests" value={stats.totalRequests} tint={color.bloodLite} />
              <LedgerRow label="Matches created" value={stats.totalMatches} />
              <LedgerRow
                label="Pending verification"
                value={stats.pendingVerification}
                tint={stats.pendingVerification > 0 ? color.warnLite : undefined}
              />
            </View>

            <Rule style={{ marginTop: 28 }} />
            <Text style={styles.footnote}>
              Counts are whole-table totals, not a window. Nothing here is filtered by date.
            </Text>
          </View>
        )}

        {/* ── HOSPITALS ── */}
        {activeTab === 'HOSPITALS' && (
          <View>
            {hospitals.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No hospitals registered"
                body="A hospital appears here as soon as it registers, and stays unverified until you verify it."
                style={styles.emptyInset}
              />
            ) : (
              hospitals.map(hospital => (
                <View key={hospital.id} style={styles.row}>
                  <View
                    style={[
                      styles.edge,
                      { backgroundColor: hospital.verified ? color.life : color.warn },
                    ]}
                  />
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{hospital.name}</Text>
                      <Chip tone={hospital.verified ? verifiedTone : unverifiedTone} />
                    </View>

                    <Text style={styles.rowSub} numberOfLines={1}>{hospital.address}</Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaMono}>{hospital.licenseNo}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.meta}>{hospital.user.city}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.meta}>
                        {hospital.requests.length} request{hospital.requests.length !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <Button
                      tone={hospital.verified ? 'ghost' : 'affirm'}
                      size="sm"
                      icon={hospital.verified ? Ban : ShieldCheck}
                      busy={verifyingId === hospital.id}
                      disabled={verifyingId === hospital.id}
                      onPress={() => toggleVerify(hospital.id)}
                      style={{ alignSelf: 'flex-start', marginTop: 13 }}
                    >
                      {hospital.verified ? 'Revoke verification' : 'Verify hospital'}
                    </Button>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── USERS ── */}
        {activeTab === 'USERS' && (
          <View style={styles.gutter}>
            <SectionLabel index="01" aside={<Label>{`${users.length} total`}</Label>}>
              Accounts
            </SectionLabel>
            {users.map(u => {
              const rt = toneFor(roleTone, u.role)
              return (
                <View key={u.id} style={styles.userRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{u.name || '—'}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{u.email}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{u.city}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaMono}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Chip tone={rt} />
                </View>
              )
            })}
          </View>
        )}

        {/* ── REQUESTS ── */}
        {activeTab === 'REQUESTS' && (
          <View>
            {requests.map(req => {
              const up = toneFor(urgencyTone, req.urgency)
              const sp = toneFor(statusTone, req.status)
              return (
                <View key={req.id} style={styles.row}>
                  <View style={[styles.edge, { backgroundColor: sp.fg }]} />
                  <View style={styles.rowBody}>
                    <View style={styles.reqTop}>
                      <Text style={styles.reqGroup}>{bloodLabel(req.bloodGroup)}</Text>
                      <View style={styles.reqChips}>
                        <Chip tone={up} />
                        <Chip tone={sp} />
                      </View>
                    </View>

                    <Text style={styles.rowSub} numberOfLines={1}>
                      {req.hospital.name} · {req.hospital.user.city}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaMono}>
                        {req.units} unit{req.units > 1 ? 's' : ''}
                      </Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.meta}>
                        {req.matches.length} match{req.matches.length !== 1 ? 'es' : ''}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.metaMono}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── SHORTAGE ── */}
        {activeTab === 'SHORTAGE' && (
          <View style={styles.gutter}>
            <SectionLabel index="01" aside={<Label>Eight groups</Label>}>
              Risk by group
            </SectionLabel>
            {predictions.map((pred) => {
              const rp = toneFor(riskTone, pred.risk)
              return (
                <View key={pred.bloodGroup} style={styles.predRow}>
                  <View style={[styles.groupTile, { borderColor: rp.border, backgroundColor: rp.bg }]}>
                    <Text style={[styles.groupTileText, { color: rp.fg }]}>
                      {bloodLabel(pred.bloodGroup)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Chip tone={rp} />
                    <View style={[styles.metaRow, { marginTop: 9 }]}>
                      <Text style={styles.metaMono}>{pred.requestCount}</Text>
                      <Text style={styles.meta}>requests</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaMono}>{pred.donorCount}</Text>
                      <Text style={styles.meta}>donors</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.ratio}>{pred.ratio}</Text>
                    <Label>Ratio</Label>
                  </View>
                </View>
              )
            })}

            <Rule style={{ marginTop: 26 }} />
            <Text style={styles.footnote}>
              Ratio is requests against available donors for that group. The prediction service
              serves these; if it is down the list comes back empty.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

/** One line of the overview ledger: name left, figure right, hairline above. */
function LedgerRow({
  label, value, tint,
}: { label: string; value: number; tint?: string }) {
  return (
    <View style={styles.ledgerRow}>
      <Text style={styles.ledgerLabel}>{label}</Text>
      <View style={styles.ledgerFill} />
      <Text style={[styles.ledgerValue, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  content: { paddingTop: 22 },
  emptyInset: { marginHorizontal: 20 },

  signOut: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  signOutText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 17,
  },

  // Tab rail
  railWrap: { borderBottomWidth: 1, borderBottomColor: color.line },
  railContent: { paddingHorizontal: 20, paddingBottom: 14, gap: 7 },
  railChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  railChipOn: { backgroundColor: wash.blood, borderColor: wash.bloodEdge },
  railText: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.mute,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  railTextOn: { fontFamily: font.mono.medium, color: color.bone },
  railCount: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.faint,
    fontVariant: ['tabular-nums'],
  },

  // Overview
  bigFigure: {
    fontFamily: font.mono.medium, fontSize: 52, lineHeight: 56, color: color.bone,
    letterSpacing: -3, fontVariant: ['tabular-nums'], marginTop: 6,
  },
  ledgerRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 15,
  },
  ledgerLabel: { fontFamily: font.sans.regular, fontSize: 13.5, color: color.mute },
  ledgerFill: { flex: 1, height: 1, backgroundColor: color.lineSoft, alignSelf: 'center' },
  ledgerValue: {
    fontFamily: font.mono.medium, fontSize: 19, color: color.bone,
    letterSpacing: -0.8, fontVariant: ['tabular-nums'],
  },

  // Shared rows
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  edge: { width: 2 },
  rowBody: { flex: 1, minWidth: 0, paddingHorizontal: 18, paddingVertical: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: {
    flex: 1, fontFamily: font.sans.medium, fontSize: 14.5,
    color: color.bone, letterSpacing: -0.3,
  },
  rowSub: { fontFamily: font.sans.regular, fontSize: 12, color: color.mute, marginTop: 5 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  meta: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint },
  metaMono: { fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.faint },

  // Users
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 15,
  },

  // Requests
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqGroup: {
    fontFamily: font.mono.medium, fontSize: 20, color: color.bloodLite, letterSpacing: -1,
  },
  reqChips: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },

  // Shortage
  predRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },
  groupTile: {
    width: 46, height: 46, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  groupTileText: { fontFamily: font.mono.medium, fontSize: 14, letterSpacing: -0.5 },
  ratio: {
    fontFamily: font.mono.medium, fontSize: 17, color: color.bone,
    letterSpacing: -0.6, fontVariant: ['tabular-nums'], marginBottom: 4,
  },

  footnote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 13,
  },
})
