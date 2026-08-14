// app/leaderboard.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing
} from 'react-native'
import { Link } from 'expo-router'
import api from '../src/lib/api'

interface LeaderboardEntry {
  rank: number
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
  totalDonations: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const avatarPalettes = [
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#F87171' },
  { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  text: '#FB923C' },
  { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  text: '#4ADE80' },
  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  text: '#60A5FA' },
  { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)', text: '#C084FC' },
  { bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)',  text: '#FACC15' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getPalette(name: string) {
  return avatarPalettes[name.charCodeAt(0) % avatarPalettes.length]
}

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.3)', text: '#FACC15', label: '🥇' }
  if (rank === 2) return { bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.3)', text: '#D1D5DB', label: '🥈' }
  if (rank === 3) return { bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.3)', text: '#FB923C', label: '🥉' }
  return { bg: '#141414', border: '#222', text: '#6B7280', label: `#${rank}` }
}

function SkeletonRow() {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return <Animated.View style={[styles.skeletonRow, { opacity: pulse }]} />
}

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<'city' | null>(null)

  useEffect(() => {
    api.get('/api/map/leaderboard')
      .then(res => setLeaderboard(res.data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cities = ['ALL', ...Array.from(new Set(leaderboard.map(d => d.city).filter(Boolean)))]

  const filtered = cityFilter === 'ALL'
    ? leaderboard
    : leaderboard.filter(d => d.city === cityFilter)

  const ranked = filtered.map((d, i) => ({ ...d, rank: i + 1 }))
  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  const renderFilterRow = (
    label: string,
    key: 'city',
    options: string[],
    current: string,
    setter: (v: string) => void
  ) => (
    <View style={styles.filterGroup}>
      <TouchableOpacity
        style={[styles.filterBtn, activeFilter === key && styles.filterBtnActive]}
        onPress={() => setActiveFilter(activeFilter === key ? null : key)}
        activeOpacity={0.8}
      >
        <Text style={styles.filterBtnText}>
          {current === 'ALL' ? label : current}
        </Text>
        <Text style={styles.filterArrow}>{activeFilter === key ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {activeFilter === key && (
        <View style={styles.dropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, current === opt && styles.dropdownItemActive]}
              onPress={() => { setter(opt); setActiveFilter(null) }}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropdownText, current === opt && styles.dropdownTextActive]}>
                {opt === 'ALL' ? `All ${label}` : opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Donor Leaderboard</Text>
        <Text style={styles.subtitle}>Top donors ranked by commitment score across Pakistan.</Text>
      </View>

      {/* City filter — dropdown, not a wrapping chip row */}
      {renderFilterRow('Cities', 'city', cities, cityFilter, setCityFilter)}

      {loading && (
        <View style={{ gap: 10 }}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </View>
      )}

      {!loading && ranked.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🩸</Text>
          <Text style={styles.emptyTitle}>No donors yet</Text>
          <Text style={styles.emptyDesc}>Be the first donor in {cityFilter}.</Text>
          <Link href="/register" asChild>
            <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Register as donor</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}

      {!loading && ranked.length > 0 && (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <View style={styles.podiumWrap}>
              {/* #1 hero card */}
              {top3[0] && (() => {
                const donor = top3[0]
                const rankStyle = getRankStyle(1)
                const palette = getPalette(donor.name)
                return (
                  <View style={[styles.heroCard, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
                    <Text style={styles.heroMedal}>🥇</Text>
                    <View style={[styles.heroAvatar, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                      <Text style={[styles.heroAvatarText, { color: palette.text }]}>{getInitials(donor.name)}</Text>
                    </View>
                    <Text style={styles.heroName} numberOfLines={1}>{donor.name}</Text>
                    <Text style={styles.heroCity}>{donor.city}</Text>
                    <View style={styles.heroRow}>
                      {donor.bloodGroup && (
                        <View style={styles.bloodPill}>
                          <Text style={styles.bloodPillText}>{bloodGroupLabels[donor.bloodGroup]}</Text>
                        </View>
                      )}
                      <View style={styles.heroScoreWrap}>
                        <Text style={[styles.heroScore, { color: rankStyle.text }]}>{donor.commitmentScore}</Text>
                        <Text style={styles.heroScoreLabel}>score</Text>
                      </View>
                    </View>
                    {donor.totalDonations > 0 && (
                      <Text style={styles.donationsText}>
                        {donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                )
              })()}

              {/* #2 and #3 side by side */}
              {(top3[1] || top3[2]) && (
                <View style={styles.runnerUpRow}>
                  {[top3[1], top3[2]].filter(Boolean).map((donor) => {
                    const rankStyle = getRankStyle(donor!.rank)
                    const palette = getPalette(donor!.name)
                    return (
                      <View
                        key={donor!.rank}
                        style={[styles.runnerUpCard, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}
                      >
                        <Text style={styles.runnerUpMedal}>{rankStyle.label}</Text>
                        <View style={[styles.runnerUpAvatar, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                          <Text style={[styles.runnerUpAvatarText, { color: palette.text }]}>{getInitials(donor!.name)}</Text>
                        </View>
                        <Text style={styles.runnerUpName} numberOfLines={1}>{donor!.name}</Text>
                        <Text style={styles.runnerUpCity} numberOfLines={1}>{donor!.city}</Text>
                        <Text style={[styles.runnerUpScore, { color: rankStyle.text }]}>{donor!.commitmentScore}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <View style={{ gap: 8 }}>
              {rest.map((donor) => {
                const palette = getPalette(donor.name)
                return (
                  <View key={donor.rank} style={styles.row}>
                    <Text style={styles.rowRank}>{donor.rank}</Text>
                    <View style={[styles.rowAvatar, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                      <Text style={[styles.rowAvatarText, { color: palette.text }]}>{getInitials(donor.name)}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>{donor.name}</Text>
                      <Text style={styles.rowCity} numberOfLines={1}>{donor.city}</Text>
                    </View>
                    {donor.bloodGroup && (
                      <View style={styles.bloodPillSmall}>
                        <Text style={styles.bloodPillSmallText}>{bloodGroupLabels[donor.bloodGroup]}</Text>
                      </View>
                    )}
                    <View style={styles.rowScoreWrap}>
                      <Text style={styles.rowScore}>{donor.commitmentScore}</Text>
                      {donor.totalDonations > 0 && (
                        <Text style={styles.rowDonations}>{donor.totalDonations} donated</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F0F0F' },
  content: { padding: 20, paddingBottom: 48 },

  header: { marginBottom: 20 },
  eyebrow: { color: '#DC2626', fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  // Dropdown filter (replaces old horizontal chip row)
  filterGroup: { marginBottom: 20, position: 'relative', zIndex: 10 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
  },
  filterBtnActive: { borderColor: '#DC2626' },
  filterBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  filterArrow: { color: '#6B7280', fontSize: 10 },
  dropdown: {
    marginTop: 6, backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 10, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  dropdownItemActive: { backgroundColor: 'rgba(220,38,38,0.08)' },
  dropdownText: { color: '#9CA3AF', fontSize: 13.5 },
  dropdownTextActive: { color: '#DC2626', fontWeight: '600' },

  skeletonRow: { height: 80, backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 14 },

  emptyCard: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 16, padding: 40, alignItems: 'center',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  emptyBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },

  // Podium
  podiumWrap: { marginBottom: 24, gap: 10 },

  heroCard: {
    borderWidth: 1, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center',
  },
  heroMedal: { fontSize: 32, marginBottom: 10 },
  heroAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroAvatarText: { fontSize: 22, fontWeight: '700' },
  heroName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', maxWidth: '100%' },
  heroCity: { color: '#9CA3AF', fontSize: 12.5, marginTop: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  heroScoreWrap: { alignItems: 'center' },
  heroScore: { fontSize: 24, fontWeight: '800' },
  heroScoreLabel: { color: '#6B7280', fontSize: 10.5 },
  donationsText: { color: '#4ADE80', fontSize: 11.5, marginTop: 8, fontWeight: '600' },

  runnerUpRow: { flexDirection: 'row', gap: 10 },
  runnerUpCard: {
    flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center',
  },
  runnerUpMedal: { fontSize: 20, marginBottom: 8 },
  runnerUpAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  runnerUpAvatarText: { fontSize: 14, fontWeight: '700' },
  runnerUpName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', maxWidth: '100%' },
  runnerUpCity: { color: '#6B7280', fontSize: 11, marginTop: 1, marginBottom: 8 },
  runnerUpScore: { fontSize: 17, fontWeight: '800' },

  bloodPill: {
    backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  bloodPillText: { color: '#F87171', fontSize: 11.5, fontWeight: '700' },

  // Rest list
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  rowRank: { color: '#6B7280', fontSize: 13, fontWeight: '600', width: 20, textAlign: 'right' },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontSize: 11.5, fontWeight: '700' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
  rowCity: { color: '#6B7280', fontSize: 11.5, marginTop: 1 },
  bloodPillSmall: {
    backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
  },
  bloodPillSmallText: { color: '#F87171', fontSize: 10.5, fontWeight: '700' },
  rowScoreWrap: { alignItems: 'flex-end' },
  rowScore: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  rowDonations: { color: '#4ADE80', fontSize: 10.5, marginTop: 1 },
})