// app/donor/dashboard.tsx
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch
} from 'react-native'
import { useEffect, useState } from 'react'
import { router, Link } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import BadgePopup from '../../src/components/Badges'

import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

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

const urgencyStyle: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', text: '#F87171', bar: '#F87171' },
  URGENT:   { bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  text: '#FB923C', bar: '#FB923C' },
  NORMAL:   { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)',  text: '#4ADE80', bar: '#4ADE80' },
}

const statusDot: Record<string, string> = {
  PENDING: '#FACC15',
  ACCEPTED: '#4ADE80',
  DECLINED: '#F87171',
  COMPLETED: '#60A5FA',
}

const RING_SIZE = 128
const RING_STROKE = 10
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_RADIUS

// ── Component ────────────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const { user } = useAuthStore()

  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'ADMIN')    { router.replace('/admin/dashboard'); return }
    if (user.role === 'HOSPITAL') { router.replace('/hospital/dashboard'); return }
    if (user.role !== 'DONOR')    { router.replace('/'); return }
    fetchData()
  }, [user])

const fetchData = async () => {
  if (!isOnline) {
    // load from cache
    const cachedProfile = await loadCache('donor_profile')
    const cachedMatches = await loadCache('donor_matches')
    if (cachedProfile) {
      setDonor(cachedProfile.data)
      setCacheTime(cachedProfile.time)
    }
    if (cachedMatches) {
      setMatches(cachedMatches.data)
    }
    setLoading(false)
    return
  }

  try {
    const [profileRes, matchesRes] = await Promise.all([
      api.get('/api/donor/profile'),
      api.get('/api/donor/matches')
    ])
    setDonor(profileRes.data.donor)
    setMatches(matchesRes.data.matches)
    setBadges(profileRes.data.badges)

    // save to cache
    await saveCache('donor_profile', profileRes.data.donor)
    await saveCache('donor_matches', matchesRes.data.matches)
    setCacheTime(Date.now())
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
  const isReady        = daysLeft === null || daysLeft === 0
  const ringProgress   = isReady ? 1 : Math.max(0, Math.min(1, (90 - (daysLeft ?? 0)) / 90))
  const ringOffset     = RING_CIRC * (1 - ringProgress)

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

      {!isOnline && <OfflineBanner lastUpdated={cacheTime} />}
      {/* Badges Card, show one time */}
      {donor && <BadgePopup badges={badges} donorId={donor.id} />}

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            Hi, {donor?.user.name?.split(' ')[0] || 'Donor'}
          </Text>
          <Text style={styles.city}>{donor?.user.city}</Text>
        </View>
        <Link href="/donor/profile" asChild>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Hero: readiness ring */}
      <View style={styles.hero}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#222"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={isReady ? '#4ADE80' : '#DC2626'}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${RING_CIRC}, ${RING_CIRC}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              fill="none"
              rotation={-90}
              originX={RING_SIZE / 2}
              originY={RING_SIZE / 2}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringBloodGroup}>
              {donor?.bloodGroup ? bloodGroupLabels[donor.bloodGroup] : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.heroInfo}>
          <Text style={styles.heroStatus}>
            {isReady ? 'Ready to donate' : `${daysLeft} days until eligible`}
          </Text>
          <Text style={styles.heroSub}>
            {isReady
              ? 'You can accept a request right now.'
              : 'Your body needs a bit more recovery time.'}
          </Text>

          <View style={styles.availRow}>
            <View style={[styles.availDot, { backgroundColor: donor?.isAvailable ? '#4ADE80' : '#4B5563' }]} />
            <Text style={styles.availLabel}>
              {donor?.isAvailable ? 'Visible to hospitals' : 'Hidden from hospitals'}
            </Text>
            <Switch
              value={donor?.isAvailable ?? false}
              onValueChange={toggleAvailability}
              disabled={toggling}
              trackColor={{ false: '#333', true: '#16A34A' }}
              thumbColor="#FFFFFF"
              style={styles.availSwitch}
            />
          </View>
        </View>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.badgeScroll}
          contentContainerStyle={styles.badgeRow}
        >
          {badges.map((badge) => (
            <View key={badge} style={styles.badgePill}>
              <Text style={styles.badgePillText}>{badge.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Pending requests */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pending requests</Text>
          {pendingMatches.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingMatches.length}</Text>
            </View>
          )}
        </View>

        {pendingMatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing pending right now</Text>
            <Text style={styles.emptyDesc}>
              {donor?.isAvailable
                ? "You'll be notified the moment a hospital needs your blood type."
                : 'Turn on availability above so hospitals can find you.'}
            </Text>
          </View>
        ) : (
          pendingMatches.map((match) => {
            const urg = urgencyStyle[match.request.urgency] ?? urgencyStyle.NORMAL
            return (
              <View key={match.id} style={[styles.matchCard, { borderLeftColor: urg.bar }]}>
                <View style={styles.matchTitleRow}>
                  <Text style={styles.matchHospital} numberOfLines={1}>
                    {match.request.hospital.name}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: urg.bg, borderColor: urg.border }]}>
                    <Text style={[styles.pillText, { color: urg.text }]}>{match.request.urgency}</Text>
                  </View>
                </View>
                <Text style={styles.matchAddress} numberOfLines={1}>{match.request.hospital.address}</Text>
                <Text style={styles.matchUnits}>
                  Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                  <Text style={styles.matchBlood}>
                    {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                  </Text>
                </Text>

                <View style={styles.matchActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => respondToMatch(match.id, 'DECLINED')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => respondToMatch(match.id, 'ACCEPTED')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* Commitment score — quiet, secondary */}
      <View style={styles.footerStatRow}>
        <Text style={styles.footerStatLabel}>Commitment score</Text>
        <View style={styles.footerStatBarTrack}>
          <View style={[styles.footerStatBarFill, { width: `${Math.min(donor?.commitmentScore ?? 0, 100)}%` }]} />
        </View>
        <Text style={styles.footerStatValue}>{donor?.commitmentScore ?? 0}</Text>
      </View>

      {/* Match history */}
      {pastMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {pastMatches.map((match) => (
            <View key={match.id} style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: statusDot[match.status] ?? '#6B7280' }]} />
              <View style={styles.historyTextWrap}>
                <Text style={styles.matchHospital} numberOfLines={1}>{match.request.hospital.name}</Text>
                <Text style={styles.historyMeta}>
                  {bloodGroupLabels[match.request.bloodGroup]} · {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.historyStatus}>{match.status}</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  city: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  editBtn: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText: { color: '#D1D5DB', fontSize: 13, fontWeight: '500' },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 20,
    padding: 18,
    gap: 18,
    marginBottom: 16,
  },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringBloodGroup: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },

  heroInfo: { flex: 1 },
  heroStatus: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  heroSub: { color: '#9CA3AF', fontSize: 12.5, lineHeight: 18, marginBottom: 14 },

  availRow: { flexDirection: 'row', alignItems: 'center' },
  availDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  availLabel: { color: '#D1D5DB', fontSize: 12.5, flex: 1 },
  availSwitch: { transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] },

  // Badges
  badgeScroll: { marginBottom: 24, flexGrow: 0 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badgePill: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  badgePillText: { color: '#F87171', fontSize: 12, fontWeight: '500' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '700' },
  countBadge: { backgroundColor: '#DC2626', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 24,
  },
  emptyTitle: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { color: '#6B7280', fontSize: 12.5, lineHeight: 18 },

  // Match card
  matchCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  matchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  matchHospital: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  matchAddress: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  matchUnits: { color: '#6B7280', fontSize: 12.5 },
  matchBlood: { color: '#F87171', fontWeight: '700' },

  matchActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  declineBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  declineText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },

  // Pill badge
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10.5, fontWeight: '600' },

  // Footer commitment stat
  footerStatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  footerStatLabel: { color: '#6B7280', fontSize: 12, width: 108 },
  footerStatBarTrack: { flex: 1, height: 5, backgroundColor: '#1A1A1A', borderRadius: 99, overflow: 'hidden' },
  footerStatBarFill: { height: '100%', backgroundColor: '#DC2626', borderRadius: 99 },
  footerStatValue: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', width: 28, textAlign: 'right' },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 10 },
  historyDot: { width: 7, height: 7, borderRadius: 4 },
  historyTextWrap: { flex: 1 },
  historyMeta: { color: '#6B7280', fontSize: 11.5, marginTop: 2 },
  historyStatus: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
})