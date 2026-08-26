// app/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { ArrowRight, Siren, TriangleAlert } from 'lucide-react-native'
import api from '../src/lib/api'
import WeeklyHeroes from '../src/components/WeeklyHeroes'
import CityStats from '../src/components/CityStats'

import { useNetwork } from '../src/hooks/useNetwork'
import { saveCache, loadCache } from '../src/lib/cache'
import OfflineBanner from '../src/components/OfflineBanner'

import {
  Screen, SectionLabel, Panel, Chip, LiveDot, Stat, Button, TextAction, Label, Rule,
} from '../src/components/fk'
import { color, font, radius, riskTone, toneFor, bloodLabel, BLOOD_GROUPS } from '../src/theme'

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

export default function LandingScreen() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [statsStatus, setStatsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [shortage, setShortage] = useState<ShortagePrediction[]>([])

  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      if (!isOnline) {
        const cachedStats = await loadCache('public_stats')

        if (cachedStats) {
          setStats(cachedStats.data)
          setStatsStatus('ready')
          setCacheTime(cachedStats.time)
        } else {
          setStatsStatus('error')
        }

        return
      }

      try {
        const res = await api.get('/api/map/public-stats')

        if (!cancelled) {
          setStats(res.data)
          setStatsStatus('ready')

          await saveCache('public_stats', res.data)
          setCacheTime(Date.now())
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
    async function fetchShortage() {
      if (!isOnline) {
        const cached = await loadCache('public_shortage')

        if (cached) {
          setShortage(cached.data)
        }

        return
      }

      try {
        const res = await api.get('/api/map/shortage')

        const predictions = res.data.predictions
          .filter(
            (p: ShortagePrediction) =>
              p.risk === 'CRITICAL' || p.risk === 'HIGH'
          )
          .slice(0, 3)

        setShortage(predictions)

        await saveCache('public_shortage', predictions)
      } catch (err) {
        console.error(err)
      }
    }

    fetchShortage()
  }, [isOnline])

  const loadingStats = statsStatus === 'loading'

  /**
   * Which lattice cells to mark. Built from the shortage response, so a marked
   * cell always means the engine actually flagged that group — nothing is
   * highlighted for visual balance. Compared on display labels because
   * /api/map/shortage has been seen returning both the Prisma enum (`A_POS`)
   * and the display form; bloodLabel() is a no-op on the latter.
   */
  const flagged = new Map(shortage.map((p) => [bloodLabel(p.bloodGroup), p.risk]))

  return (
    <Screen>
      {!isOnline && (
        <View style={styles.gutter}>
          <OfflineBanner lastUpdated={cacheTime} />
        </View>
      )}

      {/* ---- Masthead. Small, ranged left, with the live indicator opposite —
              the app names itself once and then gets out of the way. ---- */}
      <View style={[styles.gutter, styles.masthead]}>
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkAccent}>Fori</Text>Khoon
        </Text>
        <View style={styles.liveWrap}>
          <LiveDot />
          <Label>Live · Pakistan</Label>
        </View>
      </View>

      {/* ---- Hero ---- */}
      <View style={[styles.gutter, styles.hero]}>
        <Rule tick style={{ marginBottom: 22 }} />

        <Text style={styles.heroTitle}>
          The right blood,{'\n'}at the{' '}
          <Text style={styles.heroTitleAccent}>right time.</Text>
        </Text>

        <Text style={styles.heroSub}>
          ForiKhoon connects willing donors with hospitals the moment blood is needed.
          No calls, no searching — just an instant match.
        </Text>

        <View style={styles.heroActions}>
          <Link href="/register?role=donor" asChild>
            <Button tone="primary" size="lg" icon={ArrowRight} full>Become a donor</Button>
          </Link>

          <View style={styles.heroRow}>
            <Link href="/register?role=hospital" asChild>
              <TextAction>Register a hospital</TextAction>
            </Link>
            <View style={styles.heroRowDivider} />
            <Link href="/requests" asChild>
              <TextAction tint={color.bloodLite}>Active requests</TextAction>
            </Link>
          </View>
        </View>
      </View>

      {/* ---- Stats band. Ruled top and bottom, figures split by hairlines, so
              it reads as a table of record rather than three feature cards. ---- */}
      <View style={styles.statsBand}>
        <View style={styles.statsRow}>
          <Stat
            value={stats ? formatCount(stats.totalDonors) : '—'}
            label={'Donors\nregistered'}
            loading={loadingStats}
            style={styles.statCell}
          />
          <View style={styles.statDivider} />
          <Stat
            value={stats ? formatCount(stats.totalHospitals) : '—'}
            label={'Hospitals\nconnected'}
            loading={loadingStats}
            style={styles.statCell}
          />
          <View style={styles.statDivider} />
          <Stat
            value={stats ? formatCount(stats.totalMatches) : '—'}
            label={'Matches\ncompleted'}
            loading={loadingStats}
            style={styles.statCell}
          />
        </View>

        {statsStatus === 'error' && (
          <Text style={styles.statsError}>
            Live figures are unavailable right now. Showing the last values this device stored.
          </Text>
        )}
      </View>

      {/* ---- Shortage. Only rendered when the engine returned CRITICAL or HIGH
              groups, so an empty band never implies "all clear". ---- */}
      {shortage.length > 0 && (
        <View style={[styles.gutter, styles.section]}>
          <SectionLabel index="01" aside={<LiveDot size={5} />}>Shortage forecast</SectionLabel>

          <Panel>
            <View style={styles.shortageHead}>
              <TriangleAlert size={14} color={color.warnLite} strokeWidth={2} />
              <Text style={styles.shortageHeadText}>
                {shortage.length === 1
                  ? 'One group is projected short'
                  : `${shortage.length} groups are projected short`}
              </Text>
            </View>

            <View style={styles.shortageList}>
              {shortage.map((pred) => {
                const tone = toneFor(riskTone, pred.risk)
                return (
                  <View key={pred.bloodGroup} style={styles.shortageRow}>
                    <Text style={[styles.shortageGroup, { color: tone.fg }]}>
                      {bloodLabel(pred.bloodGroup)}
                    </Text>
                    <View style={styles.shortageRule} />
                    <Chip tone={tone} />
                  </View>
                )
              })}
            </View>

            <Link href="/register?role=donor" asChild>
              <TextAction tint={color.bloodLite} style={{ marginTop: 18 }}>
                Register to help ↗
              </TextAction>
            </Link>
          </Panel>
        </View>
      )}

      {/* ---- Weekly heroes ---- */}
      <View style={[styles.gutter, styles.section]}>
        <SectionLabel index="02">This week</SectionLabel>
        <WeeklyHeroes />
      </View>

      {/* ---- Blood group lattice ---- */}
      <View style={[styles.gutter, styles.section]}>
        <SectionLabel index="03">Groups we match</SectionLabel>

        <View style={styles.lattice}>
          {BLOOD_GROUPS.map((group) => {
            const display = bloodLabel(group)
            const risk = flagged.get(display)
            const tone = risk ? toneFor(riskTone, risk) : null
            return (
              <View
                key={group}
                style={[styles.latticeCell, tone && { borderColor: tone.border, backgroundColor: tone.bg }]}
              >
                <Text style={[styles.latticeText, tone && { color: tone.fg }]}>{display}</Text>
                {tone && <View style={[styles.latticeTick, { backgroundColor: tone.fg }]} />}
              </View>
            )
          })}
        </View>

        <Text style={styles.latticeNote}>
          All eight groups are matched on the compatibility matrix, not on an exact-type rule —
          an O− donor can answer any request.
        </Text>
      </View>

      {/* ---- City activity ---- */}
      <View style={[styles.gutter, styles.section]}>
        <SectionLabel index="04">City activity</SectionLabel>
        <CityStats />
      </View>

      {/* ---- How it works. Numbered rows on hairlines — a sequence, which is
              what it is, rather than three equal cards. ---- */}
      <View style={[styles.gutter, styles.section]}>
        <SectionLabel index="05">How it works</SectionLabel>

        <View>
          {steps.map((step, i) => (
            <View key={step.num} style={[styles.step, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ---- Closing call. Left-aligned against a red rule; a centred stack
              with a glow behind it is the shape this design set out to avoid. ---- */}
      <View style={[styles.gutter, styles.cta]}>
        <View style={styles.ctaRule} />
        <Text style={styles.ctaTitle}>
          Two minutes now.{'\n'}
          <Text style={styles.ctaTitleAccent}>An instant match later.</Text>
        </Text>
        <Text style={styles.ctaSub}>
          Register once with your group and city. From then on the matching is automatic — you
          only hear from us when a nearby hospital posts a request you can actually answer.
        </Text>
        <Link href="/register" asChild>
          <Button tone="primary" size="lg" icon={Siren} style={{ marginTop: 22 }}>
            Get started
          </Button>
        </Link>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerMark}>
          <Text style={styles.wordmarkAccent}>Fori</Text>Khoon
        </Text>
        <Label>Dera Ismail Khan</Label>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  section: { paddingTop: 34 },

  // Masthead
  masthead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 6, paddingBottom: 30,
  },
  wordmark: { fontFamily: font.sans.semibold, fontSize: 15, color: color.bone, letterSpacing: -0.3 },
  wordmarkAccent: { color: color.blood },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },

  // Hero
  hero: { paddingBottom: 36 },
  heroTitle: {
    fontFamily: font.sans.semibold, fontSize: 36, lineHeight: 41,
    letterSpacing: -1.4, color: color.bone,
  },
  heroTitleAccent: {
    fontFamily: font.serif.italic, fontSize: 40, lineHeight: 41,
    color: color.bloodLite, letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: font.sans.regular, fontSize: 14.5, lineHeight: 22,
    color: color.mute, marginTop: 16, maxWidth: 420,
  },
  heroActions: { marginTop: 28, gap: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroRowDivider: { width: 1, height: 11, backgroundColor: color.line },

  // Stats
  statsBand: {
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line,
    paddingVertical: 24, marginTop: 4,
  },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20 },
  statCell: { flex: 1 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: color.lineSoft, marginHorizontal: 14 },
  statsError: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, paddingHorizontal: 20, paddingTop: 16,
  },

  // Shortage
  shortageHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  shortageHeadText: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2 },
  shortageList: { gap: 13 },
  shortageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shortageGroup: {
    fontFamily: font.mono.medium, fontSize: 17, letterSpacing: -0.5,
    minWidth: 44, fontVariant: ['tabular-nums'],
  },
  shortageRule: { flex: 1, height: 1, backgroundColor: color.lineSoft },

  // Lattice
  lattice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  latticeCell: {
    width: '22.6%',
    aspectRatio: 1.12,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  latticeText: {
    fontFamily: font.mono.medium, fontSize: 15, color: color.bone, letterSpacing: -0.4,
  },
  latticeTick: { position: 'absolute', top: 7, right: 7, width: 4, height: 4, borderRadius: 1 },
  latticeNote: {
    fontFamily: font.sans.regular, fontSize: 12, lineHeight: 18,
    color: color.faint, marginTop: 14, maxWidth: 400,
  },

  // Steps
  step: {
    flexDirection: 'row', gap: 16,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    paddingTop: 18, paddingBottom: 18,
  },
  stepNum: { fontFamily: font.mono.regular, fontSize: 11, color: color.blood, paddingTop: 3, width: 20 },
  stepBody: { flex: 1, minWidth: 0 },
  stepLabel: { fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.2 },
  stepDesc: { fontFamily: font.sans.regular, fontSize: 13, lineHeight: 19, color: color.mute, marginTop: 6 },

  // CTA
  cta: { paddingTop: 46, paddingBottom: 40 },
  ctaRule: { width: 34, height: 2, backgroundColor: color.blood, marginBottom: 20 },
  ctaTitle: {
    fontFamily: font.sans.semibold, fontSize: 24, lineHeight: 30,
    letterSpacing: -0.9, color: color.bone,
  },
  ctaTitleAccent: { fontFamily: font.serif.italic, fontSize: 27, color: color.bloodLite },
  ctaSub: {
    fontFamily: font.sans.regular, fontSize: 13.5, lineHeight: 21,
    color: color.mute, marginTop: 14, maxWidth: 420,
  },

  // Footer
  footer: {
    borderTopWidth: 1, borderTopColor: color.line,
    marginHorizontal: 20, paddingTop: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  footerMark: { fontFamily: font.sans.medium, fontSize: 13, color: color.mute },
})
