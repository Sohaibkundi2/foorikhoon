// app/admin/dashboard.tsx
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

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

// ── Lookup maps ──────────────────────────────────────────────────────────────
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

const roleStyle: Record<string, PillStyle> = {
  ADMIN:    { bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)', text: '#C084FC' },
  HOSPITAL: { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  text: '#60A5FA' },
  DONOR:    { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
}

const riskStyle: Record<string, PillStyle> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', text: '#F87171' },
  HIGH:     { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  text: '#FB923C' },
  MODERATE: { bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.2)',  text: '#FACC15' },
  LOW:      { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
}

type Tab = 'OVERVIEW' | 'HOSPITALS' | 'USERS' | 'REQUESTS' | 'SHORTAGE'
const TABS: Tab[] = ['OVERVIEW', 'HOSPITALS', 'USERS', 'REQUESTS', 'SHORTAGE']

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore()

  const [stats, setStats]           = useState<Stats | null>(null)
  const [hospitals, setHospitals]   = useState<Hospital[]>([])
  const [users, setUsers]           = useState<User[]>([])
  const [requests, setRequests]     = useState<BloodRequest[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Tab>('OVERVIEW')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ADMIN</Text>
        <Text style={styles.title}>Dashboard</Text>
        {stats && stats.pendingVerification > 0 && (
          <Text style={styles.pendingWarning}>
            ⚠ {stats.pendingVerification} hospital{stats.pendingVerification > 1 ? 's' : ''} pending verification
          </Text>
        )}
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'OVERVIEW' && stats && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Total Users',          value: stats.totalUsers,           color: '#FFFFFF' },
              { label: 'Donors',               value: stats.totalDonors,          color: '#4ADE80' },
              { label: 'Hospitals',            value: stats.totalHospitals,       color: '#60A5FA' },
              { label: 'Blood Requests',       value: stats.totalRequests,        color: '#DC2626' },
              { label: 'Total Matches',        value: stats.totalMatches,         color: '#C084FC' },
              { label: 'Pending Verification', value: stats.pendingVerification,  color: '#FACC15' },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── HOSPITALS ── */}
        {activeTab === 'HOSPITALS' && (
          <View style={styles.list}>
            {hospitals.map(hospital => {
              const verPill: PillStyle = hospital.verified
                ? { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', text: '#4ADE80' }
                : { bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)', text: '#FACC15' }

              return (
                <View key={hospital.id} style={styles.card}>
                  <View style={styles.cardBody}>
                    <View style={styles.rowWrap}>
                      <Text style={styles.cardTitle}>{hospital.name}</Text>
                      <Pill s={verPill} label={hospital.verified ? 'Verified' : 'Pending'} />
                    </View>
                    <Text style={styles.cardSub}>{hospital.address}</Text>
                    <Text style={styles.cardMeta}>
                      License: {hospital.licenseNo} · {hospital.user.city} · {hospital.requests.length} requests
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      hospital.verified ? styles.verifyBtnRevoke : styles.verifyBtnVerify,
                    ]}
                    onPress={() => toggleVerify(hospital.id)}
                    disabled={verifyingId === hospital.id}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.verifyBtnText,
                      { color: hospital.verified ? '#F87171' : '#4ADE80' }
                    ]}>
                      {verifyingId === hospital.id ? '...' : hospital.verified ? 'Revoke' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

        {/* ── USERS ── */}
        {activeTab === 'USERS' && (
          <View style={styles.list}>
            {users.map(u => {
              const rp = roleStyle[u.role] ?? roleStyle.DONOR
              return (
                <View key={u.id} style={[styles.card, { alignItems: 'center' }]}>
                  <View style={styles.cardBody}>
                    <View style={styles.rowWrap}>
                      <Text style={styles.cardTitle}>{u.name || '—'}</Text>
                      <Pill s={rp} label={u.role} />
                    </View>
                    <Text style={styles.cardMeta}>{u.email} · {u.city}</Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* ── REQUESTS ── */}
        {activeTab === 'REQUESTS' && (
          <View style={styles.list}>
            {requests.map(req => {
              const up = urgencyStyle[req.urgency] ?? urgencyStyle.NORMAL
              const sp = statusStyle[req.status]  ?? statusStyle.PENDING
              return (
                <View key={req.id} style={styles.card}>
                  <View style={styles.cardBody}>
                    <View style={styles.rowWrap}>
                      <Text style={styles.bloodLabel}>
                        {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                      </Text>
                      <Pill s={up} label={req.urgency} />
                      <Pill s={sp} label={req.status}  />
                    </View>
                    <Text style={styles.cardSub}>
                      {req.hospital.name} · {req.hospital.user.city}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {req.units} unit{req.units > 1 ? 's' : ''} · {req.matches.length} match{req.matches.length !== 1 ? 'es' : ''} · {new Date(req.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── SHORTAGE ── */}
        {activeTab === 'SHORTAGE' && (
          <View style={styles.list}>
            {predictions.map((pred) => {
              const rp = riskStyle[pred.risk] ?? riskStyle.LOW
              return (
                <View key={pred.bloodGroup} style={[styles.card, { alignItems: 'center' }]}>
                  <View style={styles.bloodIcon}>
                    <Text style={styles.bloodIconText}>
                      {bloodGroupLabels[pred.bloodGroup]}
                    </Text>
                  </View>
                  <View style={[styles.cardBody, { flex: 1 }]}>
                    <Text style={styles.cardTitle}>{bloodGroupLabels[pred.bloodGroup]}</Text>
                    <Text style={styles.cardMeta}>
                      {pred.requestCount} requests · {pred.donorCount} donors · ratio {pred.ratio}
                    </Text>
                  </View>
                  <Pill s={rp} label={pred.risk} bold />
                </View>
              )
            })}
          </View>
        )}

      </ScrollView>
    </View>
  )
}

// ── Pill helper ──────────────────────────────────────────────────────────────
function Pill({ s, label, bold }: { s: PillStyle; label: string; bold?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.pillText, { color: s.text }, bold && { fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#0A0A0A' },
  center:  { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
  header:          { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 },
  eyebrow:         { color: '#6B7280', fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title:           { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  pendingWarning:  { color: '#FACC15', fontSize: 13, marginTop: 6 },

  // Tabs
  tabBar:        { borderBottomWidth: 1, borderBottomColor: '#222', flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 20, gap: 4 },
  tab:           { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: '#DC2626' },
  tabText:       { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },

  // Content
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:  {
    width: '47.5%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { color: '#6B7280', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '700' },

  // Cards
  list:     { gap: 10 },
  card:     {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cardBody: { flex: 1, gap: 4 },
  rowWrap:  { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cardSub:   { color: '#9CA3AF', fontSize: 12 },
  cardMeta:  { color: '#6B7280', fontSize: 11 },

  // Blood label (requests tab)
  bloodLabel: { color: '#DC2626', fontSize: 18, fontWeight: '700' },

  // Verify button
  verifyBtn:       { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  verifyBtnVerify: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)' },
  verifyBtnRevoke: { backgroundColor: 'transparent', borderColor: '#2A2A2A' },
  verifyBtnText:   { fontSize: 12, fontWeight: '500' },

  // Blood icon (shortage tab)
  bloodIcon:     {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bloodIconText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },

  // Pill
  pill:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '500' },
})