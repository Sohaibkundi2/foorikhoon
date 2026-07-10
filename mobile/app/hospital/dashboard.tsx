// app/hospital/dashboard.tsx
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { useEffect, useState } from 'react'
import { router, Link } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

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
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

type PillStyle = { bg: string; border: string; text: string }

const urgencyStyle: Record<string, PillStyle> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', text: '#F87171' },
  URGENT:   { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  text: '#FB923C' },
  NORMAL:   { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
}

const statusStyle: Record<string, PillStyle> = {
  PENDING:   { bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)', text: '#FACC15' },
  MATCHED:   { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', text: '#60A5FA' },
  FULFILLED: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', text: '#4ADE80' },
  EXPIRED:   { bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.2)',text: '#6B7280' },
}

// Simple relative time without dayjs
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
  const pastRequests   = requests.filter(r => r.status === 'FULFILLED' || r.status === 'EXPIRED')
  const fulfilledCount = requests.filter(r => r.status === 'FULFILLED').length

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.eyebrow}>HOSPITAL DASHBOARD</Text>
          {/* Action buttons row */}
          <View style={styles.headerActions}>
            <Link href="/hospital/analytics" asChild>
              <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
                <Text style={styles.outlineBtnText}>Analytics</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/hospital/profile" asChild>
              <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
                <Text style={styles.outlineBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <Text style={styles.title}>{hospital?.name}</Text>

        <View style={styles.headerMeta}>
          <Text style={styles.city}>{hospital?.user.city}</Text>
          {hospital?.verified ? (
            <Pill s={{ bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', text: '#4ADE80' }} label="Verified" />
          ) : (
            <Pill s={{ bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)', text: '#FACC15' }} label="Pending Verification" />
          )}
        </View>

        {/* New Request — full width CTA */}
        <Link href="/hospital/request/new" asChild>
          <TouchableOpacity style={styles.newRequestBtn} activeOpacity={0.85}>
            <Text style={styles.newRequestText}>+ New Request</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <StatCard label="Total" value={requests.length} color="#FFFFFF" />
        <StatCard label="Active" value={activeRequests.length} color="#DC2626" />
        <StatCard label="Fulfilled" value={fulfilledCount} color="#4ADE80" />
      </View>

      {/* ── Inventory ── */}
      <Section
        title="BLOOD INVENTORY"
        action={<Link href="/hospital/inventory" asChild>
          <TouchableOpacity><Text style={styles.sectionAction}>Manage →</Text></TouchableOpacity>
        </Link>}
      >
        {inventory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No inventory added yet.</Text>
            <Link href="/hospital/inventory" asChild>
              <TouchableOpacity>
                <Text style={styles.emptyLink}>Add inventory</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.inventoryRow}>
              {inventory.map((item) => (
                <View key={item.id} style={styles.inventoryCard}>
                  <Text style={styles.inventoryBlood}>
                    {bloodGroupLabels[item.bloodGroup] || item.bloodGroup}
                  </Text>
                  <Text style={styles.inventoryUnits}>{item.units}</Text>
                  <Text style={styles.inventoryLabel}>units</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Section>

      {/* ── Active Requests ── */}
      <Section
        title="ACTIVE REQUESTS"
        count={activeRequests.length}
        action={<Link href="/hospital/requests" asChild>
          <TouchableOpacity><Text style={styles.sectionAction}>View all →</Text></TouchableOpacity>
        </Link>}
      >
        {activeRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active requests.</Text>
            <Link href="/hospital/request/new" asChild>
              <TouchableOpacity>
                <Text style={styles.emptyLink}>Post a new request</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          activeRequests.map((req) => {
            const up = urgencyStyle[req.urgency] ?? urgencyStyle.NORMAL
            const sp = statusStyle[req.status]  ?? statusStyle.PENDING
            return (
              <View key={req.id} style={styles.requestCard}>
                {/* Top row: blood group + pills */}
                <View style={styles.requestTopRow}>
                  <Text style={styles.requestBlood}>
                    {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                  </Text>
                  <View style={styles.pillRow}>
                    <Pill s={up} label={req.urgency} />
                    <Pill s={sp} label={req.status} />
                  </View>
                </View>
                {/* Details */}
                <Text style={styles.requestDetail}>
                  {req.units} unit{req.units > 1 ? 's' : ''} needed
                  {req.notes ? ` · ${req.notes}` : ''}
                </Text>
                <Text style={styles.requestMeta}>
                  {req.matches?.length} donor{req.matches?.length !== 1 ? 's' : ''} matched · {timeAgo(req.createdAt)}
                </Text>
              </View>
            )
          })
        )}
      </Section>

      {/* ── Past Requests ── */}
      {pastRequests.length > 0 && (
        <Section title="REQUEST HISTORY">
          {pastRequests.map((req) => {
            const sp = statusStyle[req.status] ?? statusStyle.EXPIRED
            return (
              <View key={req.id} style={styles.historyCard}>
                <View>
                  <Text style={styles.historyTitle}>
                    {bloodGroupLabels[req.bloodGroup]} · {req.units} unit{req.units > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.requestMeta}>{timeAgo(req.createdAt)}</Text>
                </View>
                <Pill s={sp} label={req.status} />
              </View>
            )
          })}
        </Section>
      )}

    </ScrollView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  )
}

function Pill({ s, label }: { s: PillStyle; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.pillText, { color: s.text }]}>{label}</Text>
    </View>
  )
}

function Section({
  title, count, action, children
}: {
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {count != null && count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 60 },
  center:  { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
  header:        { marginBottom: 20 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  eyebrow:       { color: '#6B7280', fontSize: 10, letterSpacing: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  title:         { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  headerMeta:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  city:          { color: '#9CA3AF', fontSize: 13 },

  // Buttons
  outlineBtn:      { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  outlineBtnText:  { color: '#9CA3AF', fontSize: 12 },
  newRequestBtn:   { backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  newRequestText:  { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 14,
  },
  statLabel: { color: '#6B7280', fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '700' },

  // Section
  section:        { marginBottom: 28 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:   { color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 2 },
  sectionAction:  { color: '#9CA3AF', fontSize: 12 },
  sectionBody:    { gap: 10 },
  countBadge:     { backgroundColor: '#DC2626', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText:      { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Inventory
  inventoryRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  inventoryCard: {
    width: 72,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inventoryBlood: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  inventoryUnits: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 4 },
  inventoryLabel: { color: '#6B7280', fontSize: 10, marginTop: 2 },

  // Request card
  requestCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  requestBlood:  { color: '#DC2626', fontSize: 20, fontWeight: '700' },
  pillRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  requestDetail: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  requestMeta:   { color: '#6B7280', fontSize: 12 },

  // History card
  historyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginBottom: 3 },

  // Empty state
  emptyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { color: '#6B7280', fontSize: 14, marginBottom: 6 },
  emptyLink:  { color: '#DC2626', fontSize: 12 },

  // Pill
  pill:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '500' },
})