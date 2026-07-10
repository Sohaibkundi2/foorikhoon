// app/donor/dashboard.tsx
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch
} from 'react-native'
import { useEffect, useState } from 'react'
import { router, Link } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

// ── Types ────────────────────────────────────────────────────────────────────
interface DonorProfile {
  id: string
  bloodGroup: string | null
  isAvailable: boolean
  commitmentScore: number
  lastDonated: string | null
  user: { name: string; email: string; city: string; phone: string | null }
}

interface Match {
  id: string
  status: string
  createdAt: string
  request: {
    bloodGroup: string
    units: number
    urgency: string
    hospital: { name: string; address: string }
  }
}

// ── Lookup maps ──────────────────────────────────────────────────────────────
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const urgencyStyle: Record<string, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', text: '#F87171' },
  URGENT:   { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  text: '#FB923C' },
  NORMAL:   { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
}

const matchStatusStyle: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:   { bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)', text: '#FACC15' },
  ACCEPTED:  { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', text: '#4ADE80' },
  DECLINED:  { bg: 'rgba(248,113,113,0.1)',border: 'rgba(248,113,113,0.2)',text: '#F87171' },
  COMPLETED: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', text: '#60A5FA' },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const { user } = useAuthStore()

  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'ADMIN')    { router.replace('/admin/dashboard'); return }
    if (user.role === 'HOSPITAL') { router.replace('/hospital/dashboard'); return }
    if (user.role !== 'DONOR')    { router.replace('/'); return }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [profileRes, matchesRes] = await Promise.all([
        api.get('/api/donor/profile'),
        api.get('/api/donor/matches'),
      ])
      setDonor(profileRes.data.donor)
      setMatches(matchesRes.data.matches)
      setBadges(profileRes.data.badges)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async () => {
    if (!donor) return
    try {
      setToggling(true)
      await api.put('/api/donor/availability', { isAvailable: !donor.isAvailable })
      setDonor({ ...donor, isAvailable: !donor.isAvailable })
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  const respondToMatch = async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.put(`/api/donor/matches/${matchId}`, { status })
      setMatches(matches.map(m => m.id === matchId ? { ...m, status } : m))
    } catch (err) {
      console.error(err)
    }
  }

  const daysUntilEligible = () => {
    if (!donor?.lastDonated) return null
    const eligible = new Date(new Date(donor.lastDonated).getTime() + 90 * 24 * 60 * 60 * 1000)
    const days = Math.ceil((eligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const pendingMatches = matches.filter(m => m.status === 'PENDING')
  const pastMatches    = matches.filter(m => m.status !== 'PENDING')
  const daysLeft       = daysUntilEligible()
  const score          = donor?.commitmentScore ?? 0

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>DONOR DASHBOARD</Text>
          <Text style={styles.title}>
            Welcome, {donor?.user.name?.split(' ')[0] || 'Donor'}
          </Text>
          <Text style={styles.city}>{donor?.user.city}</Text>
        </View>
        <Link href="/donor/profile" asChild>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            YOUR BADGES{'  '}
            <Text style={styles.badgeCount}>{badges.length}</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.badgeRow}>
              {badges.map((badge) => (
                <View key={badge} style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{badge.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>

        {/* Blood group */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>BLOOD GROUP</Text>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>
            {donor?.bloodGroup ? bloodGroupLabels[donor.bloodGroup] : '—'}
          </Text>
        </View>

        {/* Commitment */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>COMMITMENT</Text>
          <Text style={styles.statValue}>{score}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(score, 100)}%` }]} />
          </View>
        </View>

        {/* Availability */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>AVAILABILITY</Text>
          <Text style={[styles.availText, { color: donor?.isAvailable ? '#4ADE80' : '#9CA3AF' }]}>
            {donor?.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
          <Switch
            value={donor?.isAvailable ?? false}
            onValueChange={toggleAvailability}
            disabled={toggling}
            trackColor={{ false: '#333', true: '#16A34A' }}
            thumbColor="#FFFFFF"
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
          />
        </View>

        {/* Eligibility */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ELIGIBILITY</Text>
          {daysLeft === null || daysLeft === 0 ? (
            <Text style={[styles.availText, { color: '#4ADE80' }]}>Ready to donate</Text>
          ) : (
            <>
              <Text style={styles.statValue}>{daysLeft}</Text>
              <Text style={styles.statSub}>days until eligible</Text>
            </>
          )}
        </View>

      </View>

      {/* Pending requests */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>PENDING REQUESTS</Text>
          {pendingMatches.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingMatches.length}</Text>
            </View>
          )}
        </View>

        {pendingMatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No pending requests right now.</Text>
            <Text style={styles.emptyDesc}>Make sure your availability is turned on.</Text>
          </View>
        ) : (
          pendingMatches.map((match) => {
            const urg = urgencyStyle[match.request.urgency] ?? urgencyStyle.NORMAL
            return (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchInfo}>
                  <View style={styles.matchTitleRow}>
                    <Text style={styles.matchHospital}>{match.request.hospital.name}</Text>
                    <View style={[styles.pill, { backgroundColor: urg.bg, borderColor: urg.border }]}>
                      <Text style={[styles.pillText, { color: urg.text }]}>{match.request.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.matchAddress}>{match.request.hospital.address}</Text>
                  <Text style={styles.matchUnits}>
                    Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                    <Text style={styles.matchBlood}>
                      {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                    </Text>
                  </Text>
                </View>
                <View style={styles.matchActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => respondToMatch(match.id, 'ACCEPTED')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => respondToMatch(match.id, 'DECLINED')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* Match history */}
      {pastMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MATCH HISTORY</Text>
          {pastMatches.map((match) => {
            const st = matchStatusStyle[match.status] ?? matchStatusStyle.PENDING
            return (
              <View key={match.id} style={styles.historyCard}>
                <View>
                  <Text style={styles.matchHospital}>{match.request.hospital.name}</Text>
                  <Text style={styles.historyMeta}>
                    {bloodGroupLabels[match.request.bloodGroup]} · {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <Text style={[styles.pillText, { color: st.text }]}>{match.status}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

    </ScrollView>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  city: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  editBtn: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#9CA3AF', fontSize: 13 },

  // Badges
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: 12 },
  badgeCount: { color: '#DC2626' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badgePill: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgePillText: { color: '#DC2626', fontSize: 12, fontWeight: '500' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard: {
    width: '47.5%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { color: '#6B7280', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
  statValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  statSub: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  availText: { fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 4, backgroundColor: '#222', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#DC2626', borderRadius: 99 },

  // Count badge
  countBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    marginBottom: 12,
  },
  countBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Empty state
  emptyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { color: '#6B7280', fontSize: 14, marginBottom: 4 },
  emptyDesc: { color: '#6B7280', fontSize: 12 },

  // Match card
  matchCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  matchInfo: { flex: 1 },
  matchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  matchHospital: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  matchAddress: { color: '#9CA3AF', fontSize: 12 },
  matchUnits: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  matchBlood: { color: '#DC2626', fontWeight: '600' },
  matchActions: { gap: 8 },
  acceptBtn: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptText: { color: '#4ADE80', fontSize: 12, fontWeight: '500' },
  declineBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  declineText: { color: '#9CA3AF', fontSize: 12 },

  // Pill badge
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontWeight: '500' },

  // History
  historyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyMeta: { color: '#6B7280', fontSize: 12, marginTop: 3 },
})