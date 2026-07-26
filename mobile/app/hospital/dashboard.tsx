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

const urgencyStyle: Record<string, PillStyle & { bar: string }> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', text: '#F87171', bar: '#F87171' },
  URGENT:   { bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  text: '#FB923C', bar: '#FB923C' },
  NORMAL:   { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  text: '#4ADE80', bar: '#4ADE80' },
}

const urgencyRank: Record<string, number> = { CRITICAL: 0, URGENT: 1, NORMAL: 2 }

const statusDot: Record<string, string> = {
  PENDING: '#FACC15',
  MATCHED: '#60A5FA',
  FULFILLED: '#4ADE80',
  EXPIRED: '#6B7280',
}

// Inventory stock level thresholds
function stockLevel(units: number): { label: string; color: string } {
  if (units <= 4) return { label: 'Low', color: '#F87171' }
  if (units <= 14) return { label: 'OK', color: '#FACC15' }
  return { label: 'Good', color: '#4ADE80' }
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

  const activeRequests = requests
    .filter(r => r.status === 'PENDING' || r.status === 'MATCHED')
    .sort((a, b) => (urgencyRank[a.urgency] ?? 2) - (urgencyRank[b.urgency] ?? 2))
  const pastRequests   = requests.filter(r => r.status === 'FULFILLED' || r.status === 'EXPIRED')
  const criticalCount  = activeRequests.filter(r => r.urgency === 'CRITICAL').length
  const lowStockCount  = inventory.filter(i => i.units <= 4).length

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header */}
{/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>{hospital?.name}</Text>

          <View style={styles.headerMeta}>
            <Text style={styles.city}>{hospital?.user.city}</Text>
            <View style={styles.metaDot} />
            {hospital?.verified ? (
              <Text style={styles.verifiedText}>Verified</Text>
            ) : (
              <Text style={styles.pendingText}>Pending verification</Text>
            )}
          </View>

          {hospital?.address && (
            <Text style={styles.address} numberOfLines={1}>{hospital.address}</Text>
          )}
        </View>

        <Link href="/hospital/profile" asChild>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Hero: what needs attention right now */}
      <View style={[styles.hero, criticalCount > 0 && styles.heroAlert]}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroStatus}>
            {criticalCount > 0
              ? `${criticalCount} critical request${criticalCount > 1 ? 's' : ''} need attention`
              : activeRequests.length > 0
                ? `${activeRequests.length} active request${activeRequests.length > 1 ? 's' : ''}`
                : 'No active requests'}
          </Text>
          <Text style={styles.heroSub}>
            {lowStockCount > 0
              ? `${lowStockCount} blood type${lowStockCount > 1 ? 's' : ''} running low in your inventory.`
              : 'Inventory levels look healthy.'}
          </Text>
        </View>
        <Link href="/hospital/request/new" asChild>
          <TouchableOpacity style={styles.newRequestBtn} activeOpacity={0.85}>
            <Text style={styles.newRequestText}>+ New Request</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Inventory shelf */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Blood inventory</Text>
          <Link href="/hospital/inventory" asChild>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Manage →</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {inventory.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No inventory added yet</Text>
            <Link href="/hospital/inventory" asChild>
              <TouchableOpacity>
                <Text style={styles.emptyLink}>Add inventory</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
            {inventory.map((item) => {
              const level = stockLevel(item.units)
              const fillPct = Math.max(6, Math.min(100, (item.units / 20) * 100))
              return (
                <View key={item.id} style={styles.shelfCard}>
                  <Text style={styles.shelfBlood}>{bloodGroupLabels[item.bloodGroup] || item.bloodGroup}</Text>
                  <View style={styles.shelfTrack}>
                    <View style={[styles.shelfFill, { height: `${fillPct}%`, backgroundColor: level.color }]} />
                  </View>
                  <Text style={styles.shelfUnits}>{item.units}</Text>
                  <Text style={[styles.shelfLevel, { color: level.color }]}>{level.label}</Text>
                </View>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* Active requests */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Active requests</Text>
            {activeRequests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeRequests.length}</Text>
              </View>
            )}
          </View>
          <Link href="/hospital/requests" asChild>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>View all →</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {activeRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active requests</Text>
            <Link href="/hospital/request/new" asChild>
              <TouchableOpacity>
                <Text style={styles.emptyLink}>Post a new request</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          activeRequests.map((req) => {
            const urg = urgencyStyle[req.urgency] ?? urgencyStyle.NORMAL
            const matchCount = req.matches?.length ?? 0
            return (
              <View key={req.id} style={[styles.requestCard, { borderLeftColor: urg.bar }]}>
                <View style={styles.requestTopRow}>
                  <Text style={styles.requestBlood}>
                    {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: urg.bg, borderColor: urg.border }]}>
                    <Text style={[styles.pillText, { color: urg.text }]}>{req.urgency}</Text>
                  </View>
                </View>
                <Text style={styles.requestDetail}>
                  {req.units} unit{req.units > 1 ? 's' : ''} needed
                  {req.notes ? ` · ${req.notes}` : ''}
                </Text>
                <View style={styles.requestFooterRow}>
                  <Text style={styles.requestMeta}>
                    {matchCount} donor{matchCount !== 1 ? 's' : ''} matched
                  </Text>
                  <Text style={styles.requestMeta}>{timeAgo(req.createdAt)}</Text>
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* History */}
      {pastRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {pastRequests.map((req) => (
            <View key={req.id} style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: statusDot[req.status] ?? '#6B7280' }]} />
              <View style={styles.historyTextWrap}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {bloodGroupLabels[req.bloodGroup]} · {req.units} unit{req.units > 1 ? 's' : ''}
                </Text>
                <Text style={styles.historyMeta}>{timeAgo(req.createdAt)}</Text>
              </View>
              <Text style={styles.historyStatus}>{req.status}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick link to analytics — low emphasis, secondary */}
      <Link href="/hospital/analytics" asChild>
        <TouchableOpacity style={styles.analyticsLink} activeOpacity={0.7}>
          <Text style={styles.analyticsLinkText}>View detailed analytics →</Text>
        </TouchableOpacity>
      </Link>

    </ScrollView>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 48 },
  center:  { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
      headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
      },
      headerInfo: {
        flex: 1,
        minWidth: 0, // allows text truncation to work correctly inside flex row on RN
      },
      title: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 28,
        marginBottom: 6,
      },
      headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 4,
      },
      metaDot: {
        width: 3,
        height: 3,
        borderRadius: 999,
        backgroundColor: '#4B5563',
        marginHorizontal: 8,
      },
      address: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 4,
      },
      editBtn: {
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.3)',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexShrink: 0, 
      },
      editBtnText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500',
      },
  city: { color: '#6B7280', fontSize: 13 },
  verifiedText: { color: '#4ADE80', fontSize: 12.5, fontWeight: '600' },
  pendingText: { color: '#FACC15', fontSize: 12.5, fontWeight: '600' },

  // Hero
  hero: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroAlert: { borderColor: 'rgba(248,113,113,0.3)' },
  heroTextWrap: { marginBottom: 14 },
  heroStatus: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  heroSub: { color: '#9CA3AF', fontSize: 12.5, lineHeight: 18 },
  newRequestBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  newRequestText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '700' },
  sectionAction: { color: '#9CA3AF', fontSize: 12.5 },
  countBadge: { backgroundColor: '#DC2626', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Inventory shelf
  shelfRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  shelfCard: {
    width: 68,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shelfBlood: { color: '#F87171', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  shelfTrack: {
    width: 20,
    height: 56,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  shelfFill: { width: '100%', borderRadius: 10 },
  shelfUnits: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  shelfLevel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Empty state
  emptyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 24,
    alignItems: 'flex-start',
  },
  emptyTitle: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  emptyLink: { color: '#F87171', fontSize: 12.5, fontWeight: '600' },

  // Request card
  requestCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  requestBlood: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  requestDetail: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  requestFooterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  requestMeta: { color: '#6B7280', fontSize: 12 },

  // Pill
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 10.5, fontWeight: '600' },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 10 },
  historyDot: { width: 7, height: 7, borderRadius: 4 },
  historyTextWrap: { flex: 1 },
  historyTitle: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
  historyMeta: { color: '#6B7280', fontSize: 11.5, marginTop: 2 },
  historyStatus: { color: '#6B7280', fontSize: 11, fontWeight: '600' },

  // Analytics link
  analyticsLink: { alignItems: 'center', paddingVertical: 14 },
  analyticsLinkText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
})