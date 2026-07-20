// app/index.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Easing
} from 'react-native'
import { Link } from 'expo-router'
import api from '../src/lib/api'
import WeeklyHeroes from '../src/components/WeeklyHeroes'
import CityStats from '../src/components/CityStats'
import { registerForPushNotifications, savePushTokenToBackend } from '../src/lib/notifications'

const bloodGroups = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

const steps = [
  {
    num: '01',
    label: 'Register as a donor',
    desc: 'Add your blood group, city, and availability. Takes two minutes.',
  },
  {
    num: '02',
    label: 'Get matched automatically',
    desc: 'When a hospital near you posts a request matching your blood type, you are notified immediately.',
  },
  {
    num: '03',
    label: 'Respond and donate',
    desc: 'Accept the request and head to the hospital. Your commitment score improves with every donation.',
  },
]

interface PublicStats {
  totalDonors: number
  totalHospitals: number
  totalMatches: number
}

interface ShortagePrediction {
  bloodGroup: string
  risk: string
}

function formatCount(n: number) {
  if (n === 0) return '0'
  return `${n.toLocaleString('en-US')}+`
}

function usePulse() {
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return pulse
}

export default function LandingScreen() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [statsStatus, setStatsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [shortage, setShortage] = useState<ShortagePrediction[]>([])
  const pulse = usePulse()

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await api.get('/api/map/public-stats')
        if (!cancelled) {
          setStats(res.data)
          setStatsStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ForiKhoon] Failed to fetch public-stats:', err)
          setStatsStatus('error')
        }
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    api.get('/api/map/shortage')
      .then(res => {
        const predictions = res.data.predictions
          .filter((p: ShortagePrediction) => p.risk === 'CRITICAL' || p.risk === 'HIGH')
          .slice(0, 3)
        setShortage(predictions)
      })
      .catch(console.error)
  }, [])

    useEffect(() => {
    // register for push notifications
    registerForPushNotifications().then(token => {
      if (token) savePushTokenToBackend(token)
    })
  }, [])

  const loadingStats = statsStatus === 'loading'

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
          <Text style={styles.liveBadgeText}>Live donor matching — Pakistan</Text>
        </View>

        <Text style={styles.heroTitle}>
          The right blood,{'\n'}
          <Text style={styles.heroTitleAccent}>at the right time.</Text>
        </Text>

        <Text style={styles.heroSub}>
          ForiKhoon connects willing donors with hospitals the moment blood is needed.
          No calls, no searching — just an instant match.
        </Text>

        <View style={styles.heroActions}>
          <Link href="/register?role=donor" asChild>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Become a donor</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/register?role=hospital" asChild>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>Register your hospital</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/requests" asChild>
            <TouchableOpacity style={styles.tertiaryBtn} activeOpacity={0.8}>
              <Text style={styles.tertiaryBtnText}>Active Requests →</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          <StatBlock value={stats ? formatCount(stats.totalDonors) : '—'} label="Donors Registered" loading={loadingStats} />
          <StatBlock value={stats ? formatCount(stats.totalHospitals) : '—'} label="Hospitals Connected" loading={loadingStats} />
          <StatBlock value={stats ? formatCount(stats.totalMatches) : '—'} label="Successful Matches" loading={loadingStats} />
        </View>
        {statsStatus === 'error' && (
          <Text style={styles.statsError}>Live stats are temporarily unavailable. Showing last known data.</Text>
        )}
      </View>

      {/* Shortage alert */}
      {shortage.length > 0 && (
        <View style={styles.section}>
          <View style={styles.shortageHeader}>
            <Animated.View style={[styles.shortageDot, { opacity: pulse }]} />
            <Text style={styles.shortageEyebrow}>Shortage Alert</Text>
          </View>
          <View style={styles.shortageRow}>
            {shortage.map((pred) => {
              const critical = pred.risk === 'CRITICAL'
              return (
                <View
                  key={pred.bloodGroup}
                  style={[
                    styles.shortagePill,
                    { backgroundColor: critical ? 'rgba(248,113,113,0.1)' : 'rgba(251,146,60,0.1)',
                      borderColor: critical ? 'rgba(248,113,113,0.25)' : 'rgba(251,146,60,0.25)' },
                  ]}
                >
                  <Text style={[styles.shortagePillGroup, { color: critical ? '#F87171' : '#FB923C' }]}>
                    {pred.bloodGroup}
                  </Text>
                  <Text style={styles.shortagePillRisk}>{pred.risk}</Text>
                </View>
              )
            })}
          </View>
          <Link href="/register?role=donor" asChild>
            <TouchableOpacity style={styles.shortageLink}>
              <Text style={styles.shortageLinkText}>Donate now →</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}

      {/* Weekly heroes */}
      <View style={styles.section}>
        <WeeklyHeroes />
      </View>

      {/* Blood groups */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>Blood groups we match</Text>
        <View style={styles.bloodGrid}>
          {bloodGroups.map((bg) => (
            <View key={bg} style={styles.bloodCard}>
              <Text style={styles.bloodCardText}>{bg}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* City activity */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>Live city activity</Text>
        <CityStats />
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>How it works</Text>
        <View style={styles.stepsWrap}>
          {steps.map((step) => (
            <View key={step.num} style={styles.stepCard}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready to save a life?</Text>
        <Text style={styles.ctaSub}>Register in two minutes. We handle the matching.</Text>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>Get started</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={styles.footerAccent}>Fori</Text>Khoon
        </Text>
      </View>

    </ScrollView>
  )
}

function StatBlock({ value, label, loading }: { value: string; label: string; loading: boolean }) {
  return (
    <View style={styles.statBlock}>
      {loading ? (
        <View style={styles.statSkeleton} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { paddingBottom: 48 },

  // Hero
  hero: { padding: 24, paddingTop: 32 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 7 },
  liveBadgeText: { color: '#F87171', fontSize: 11.5, fontWeight: '600' },

  heroTitle: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', lineHeight: 44, marginBottom: 14 },
  heroTitleAccent: { color: '#DC2626' },
  heroSub: { color: '#9CA3AF', fontSize: 15, lineHeight: 22, marginBottom: 24 },

  heroActions: { gap: 10 },
  primaryBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  tertiaryBtn: { backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  tertiaryBtnText: { color: '#F87171', fontSize: 15, fontWeight: '600' },

  // Stats
  statsSection: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1A1A1A', paddingVertical: 24, marginBottom: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20 },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statSkeleton: { width: 60, height: 24, backgroundColor: '#1A1A1A', borderRadius: 6, marginBottom: 4 },
  statLabel: { color: '#9CA3AF', fontSize: 11.5, textAlign: 'center' },
  statsError: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },

  // Generic section
  section: { paddingHorizontal: 20, paddingVertical: 24 },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 14 },

  // Shortage
  shortageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  shortageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', marginRight: 8 },
  shortageEyebrow: { color: '#F87171', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  shortageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  shortagePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  shortagePillGroup: { fontSize: 14, fontWeight: '700' },
  shortagePillRisk: { color: '#9CA3AF', fontSize: 10.5 },
  shortageLink: { alignSelf: 'flex-start' },
  shortageLinkText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },

  // Blood groups grid
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bloodCard: {
    width: '22%', backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 10, paddingVertical: 18, alignItems: 'center',
  },
  bloodCardText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Steps
  stepsWrap: { gap: 12 },
  stepCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 14, padding: 18 },
  stepNum: { color: '#DC2626', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  stepLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  stepDesc: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },

  // CTA
  ctaSection: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  ctaTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  ctaSub: { color: '#9CA3AF', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  ctaBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  ctaBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Footer
  footer: { borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingVertical: 20, alignItems: 'center' },
  footerText: { color: '#6B7280', fontSize: 12 },
  footerAccent: { color: '#DC2626', fontWeight: '700' },
})