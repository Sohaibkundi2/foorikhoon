// app/donor/dashboard.tsx
import {
  View, Text, ScrollView, StyleSheet, Switch, Image, Pressable, Modal,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router, Link } from 'expo-router'
import {
  ArrowUpRight, BadgeCheck, Building2, Check, Droplet, MapPin, Pencil,
  ShieldCheck, TriangleAlert, X,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import BadgePopup, { badgeMeta } from '../../src/components/Badges'
import { registerForPushNotifications, savePushTokenToBackend } from '../../src/lib/notifications'
import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'
import HeroCertificate from '../../src/components/Herocertificate'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Chip, Button, Skeleton,
  EmptyState, LiveDot, SegmentMeter, TextAction, Notice, ContextualLoading,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, toneFor, bloodLabel,
} from '../../src/theme'

// ── Types ────────────────────────────────────────────────────────────────────
interface DonorProfile {
  id: string
  bloodGroup: string | null
  isAvailable: boolean
  commitmentScore: number
  area: string | null
  lastDonated: string | null
  user: { name: string; email: string; city: string; phone: string | null }
}

interface Match {
  id: string
  status: string
  createdAt: string
  photoUrl?: string | null
  photoUploadedAt?: string | null
  request: {
    bloodGroup: string
    units: number
    urgency: string
    hospital: { name: string; address: string }
  }
}

/**
 * The recovery interval the backend enforces between donations. The meter below
 * counts this out in segments rather than drawing a progress ring — 90 days is a
 * count of whole days, and a smooth arc implies a precision it doesn't have.
 */
const RECOVERY_DAYS = 90
const RECOVERY_SEGMENTS = 18

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
  const [certificate, setCertificate] = useState<any>(null)
  const [certificateOpen, setCertificateOpen] = useState(false)
  // Blood-bag proof photo opened full size.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'ADMIN')    { router.replace('/admin/dashboard'); return }
    if (user.role === 'HOSPITAL') { router.replace('/hospital/dashboard'); return }
    if (user.role !== 'DONOR')    { router.replace('/'); return }
    fetchData()
  }, [user])

  // new effect, added to the donor dashboard component:
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) savePushTokenToBackend(token)
    })
  }, [])

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

  const viewCertificate = async (matchId: string) => {
    try {
      const res = await api.get(`/api/donor/certificate/${matchId}`)
      setCertificate(res.data.certificate)
      setCertificateOpen(true)
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Donor · Command Center"
          message="Syncing donor record & nearby emergency matches…"
          subtext="Checking active blood requisitions and regional hospital needs"
          variant="metrics"
        />
      </Screen>
    )
  }

  const firstName = donor?.user.name?.split(' ')[0] || 'Donor'
  const group = donor?.bloodGroup ? bloodLabel(donor.bloodGroup) : '—'
  const score = donor?.commitmentScore ?? 0

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <Screen grid>

      {/* OfflineBanner no longer carries its own margin — it sits in this
          screen's gutter like everything else. */}
      {!isOnline && (
        <View style={styles.gutter}>
          <OfflineBanner lastUpdated={cacheTime} />
        </View>
      )}

      {/* Badges Card, show one time */}
      {donor && <BadgePopup badges={badges} donorId={donor.id} />}

      <PageHead
        eyebrow={`Donor · ${donor?.user.city ?? 'Pakistan'}${donor?.area ? ` · ${donor.area}` : ''}`}
        title={`${firstName},`}
        accent={isReady ? "you're clear." : "you're recovering."}
        aside={
          <Link href="/donor/profile" asChild>
            <Pressable style={styles.editBtn} hitSlop={6}>
              <Pencil size={11} color={color.mute} strokeWidth={2} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </Link>
        }
      />

      <View style={styles.gutter}>
        {!donor?.area && (
          <Pressable onPress={() => router.push('/donor/profile')} style={{ marginBottom: 22 }}>
            {/* Was a ⚠️ glyph. */}
            <Notice tone={toneFor(statusTone, 'PENDING')} icon={TriangleAlert}>
              Add your area so nearby hospitals can reach you first. Right now you are matched on
              city alone.
            </Notice>
          </Pressable>
        )}

        {/* ── Eligibility band ──────────────────────────────────────────────
            Ruled top and bottom and full-gutter width rather than a card with a
            progress ring in it. The group is the largest thing on the screen
            because it is the one fact every hospital request is filtered on. */}
        <View style={styles.band}>
          <View style={styles.bandRow}>
            <View style={styles.groupCol}>
              <Text style={styles.groupValue}>{group}</Text>
              <Label style={{ marginTop: 4 }}>Your group</Label>
            </View>

            <View style={styles.bandDivider} />

            <View style={styles.bandInfo}>
              <Text style={[styles.bandStatus, isReady && { color: color.lifeLite }]}>
                {isReady ? 'Ready to donate' : `${daysLeft} days until eligible`}
              </Text>
              <Text style={styles.bandSub}>
                {isReady
                  ? 'You can accept a request right now.'
                  : 'Your body needs a bit more recovery time.'}
              </Text>
              <SegmentMeter
                value={ringProgress * RECOVERY_SEGMENTS}
                max={RECOVERY_SEGMENTS}
                segments={RECOVERY_SEGMENTS}
                tint={isReady ? color.life : color.blood}
                style={{ marginTop: 12 }}
              />
              <Text style={styles.bandFoot}>
                {donor?.lastDonated
                  ? `${RECOVERY_DAYS}-day interval since your last donation`
                  : 'No donation on record yet'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Availability ─────────────────────────────────────────────────── */}
        <View style={styles.availRow}>
          {donor?.isAvailable
            ? <LiveDot size={7} tint={color.life} />
            : <View style={styles.availDotOff} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.availLabel}>
              {donor?.isAvailable ? 'Visible to hospitals' : 'Hidden from hospitals'}
            </Text>
            <Text style={styles.availSub}>
              {donor?.isAvailable
                ? 'You appear in searches for compatible donors in your radius.'
                : 'No hospital can match you while this is off.'}
            </Text>
          </View>
          <Switch
            value={donor?.isAvailable ?? false}
            onValueChange={toggleAvailability}
            disabled={toggling}
            trackColor={{ false: color.line, true: color.life }}
            thumbColor={color.bone}
            ios_backgroundColor={color.line}
            style={styles.availSwitch}
          />
        </View>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        {badges.length > 0 && (
          <View style={styles.badgeBlock}>
            <Label>Earned</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.badgeScroll}
              contentContainerStyle={styles.badgeRow}
            >
              {badges.map((badge) => {
                /* Each badge carries its own mark and tint, defined once in
                   Badges.tsx, so the shelf and the popup agree. */
                const meta = badgeMeta(badge)
                const Icon = meta.icon
                return (
                  <View key={badge} style={styles.badgePill}>
                    <Icon size={11} color={meta.tint} strokeWidth={2} />
                    <Text style={styles.badgePillText}>{badge.replace(/_/g, ' ')}</Text>
                  </View>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Pending requests ─────────────────────────────────────────────── */}
        <SectionLabel
          index="01"
          style={{ marginTop: 30 }}
          aside={
            pendingMatches.length > 0
              ? <Text style={styles.countText}>{String(pendingMatches.length).padStart(2, '0')}</Text>
              : null
          }
        >
          Waiting on you
        </SectionLabel>

        {pendingMatches.length === 0 ? (
          <EmptyState
            icon={Droplet}
            title="Nothing pending right now"
            body={donor?.isAvailable
              ? "You'll be notified the moment a hospital needs your blood type."
              : 'Turn on availability above so hospitals can find you.'}
          />
        ) : (
          pendingMatches.map((match, i) => {
            const urg = toneFor(urgencyTone, match.request.urgency)
            return (
              <View key={match.id} style={styles.matchCard}>
                {/* The urgency reads twice — as a 2px rule across the top of the
                    card and as the chip. The rule is what you see from a metre
                    away; the chip is what you read. */}
                <View style={[styles.matchTick, { backgroundColor: urg.fg }]} />

                <View style={styles.matchHead}>
                  <Text style={styles.matchIndex}>{String(i + 1).padStart(2, '0')}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.matchHospital} numberOfLines={1}>
                      {match.request.hospital.name}
                    </Text>
                    <View style={styles.matchAddrRow}>
                      <MapPin size={10} color={color.faint} strokeWidth={2} />
                      <Text style={styles.matchAddress} numberOfLines={1}>
                        {match.request.hospital.address}
                      </Text>
                    </View>
                  </View>
                  <Chip tone={urg} />
                </View>

                <View style={styles.matchFigures}>
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>
                      {bloodLabel(match.request.bloodGroup)}
                    </Text>
                    <Label style={{ marginTop: 3 }}>Group</Label>
                  </View>
                  <View style={styles.figureDivider} />
                  <View style={styles.figure}>
                    <Text style={styles.figureValue}>{match.request.units}</Text>
                    <Label style={{ marginTop: 3 }}>
                      {match.request.units > 1 ? 'Units' : 'Unit'}
                    </Label>
                  </View>
                </View>

                <View style={styles.matchActions}>
                  <Button
                    tone="ghost"
                    style={{ flex: 1 }}
                    onPress={() => respondToMatch(match.id, 'DECLINED')}
                  >
                    Decline
                  </Button>
                  <Button
                    tone="affirm"
                    icon={Check}
                    style={{ flex: 1 }}
                    onPress={() => respondToMatch(match.id, 'ACCEPTED')}
                  >
                    Accept
                  </Button>
                </View>
              </View>
            )
          })
        )}

        {/* ── Commitment score ─────────────────────────────────────────────── */}
        <SectionLabel index="02" style={{ marginTop: 34 }}>Standing</SectionLabel>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{score}</Text>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>Commitment score</Text>
            <SegmentMeter
              value={Math.min(score, 100)}
              max={100}
              segments={20}
              tint={color.blood}
              style={{ marginTop: 9 }}
            />
            <Text style={styles.scoreFoot}>
              Rises when you accept and complete a match. The public leaderboard is ordered by it.
            </Text>
          </View>
        </View>
        <Link href="/leaderboard" asChild>
          <Pressable style={styles.leaderRow} hitSlop={6}>
            <Text style={styles.leaderText}>See the leaderboard</Text>
            <ArrowUpRight size={13} color={color.bloodLite} strokeWidth={2} />
          </Pressable>
        </Link>

        {/* ── History ──────────────────────────────────────────────────────── */}
        {pastMatches.length > 0 && (
          <>
            <SectionLabel index="03" style={{ marginTop: 34 }}>History</SectionLabel>

            {pastMatches.map((match) => {
              const st = toneFor(statusTone, match.status)
              const done = match.status === 'COMPLETED'
              return (
                <Pressable
                  key={match.id}
                  style={styles.historyRow}
                  onPress={() => done && viewCertificate(match.id)}
                >
                  {done && match.photoUrl ? (
                    <Pressable onPress={() => setLightboxUrl(match.photoUrl!)}>
                      {/* Nested inside the row's Pressable on purpose. React Native's
                          touch responder system grants the responder to the deepest view that
                          claims it, so tapping the thumbnail opens the photo and does not also
                          fire the row's "view certificate" press. */}
                      <Image source={{ uri: match.photoUrl }} style={styles.historyThumb} />
                    </Pressable>
                  ) : (
                    <View style={[styles.historyMark, { borderColor: st.border, backgroundColor: st.bg }]}>
                      <Building2 size={13} color={st.fg} strokeWidth={2} />
                    </View>
                  )}

                  <View style={styles.historyTextWrap}>
                    <Text style={styles.matchHospital} numberOfLines={1}>{match.request.hospital.name}</Text>
                    <Text style={styles.historyMeta}>
                      {bloodLabel(match.request.bloodGroup)} · {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                    </Text>
                    {done && match.photoUrl && (
                      <View style={styles.verifiedRow}>
                        {/* Was a ✓ glyph. */}
                        <ShieldCheck size={10} color={color.lifeLite} strokeWidth={2} />
                        <Text style={styles.historyVerified}>Collection verified by photo</Text>
                      </View>
                    )}
                  </View>

                  {done ? (
                    <View style={styles.certRow}>
                      <BadgeCheck size={12} color={color.bloodLite} strokeWidth={2} />
                      <Text style={styles.certificateLink}>Certificate</Text>
                    </View>
                  ) : (
                    <Chip tone={st} />
                  )}
                </Pressable>
              )
            })}
          </>
        )}
      </View>

      <Modal
        visible={certificateOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCertificateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Scrolls because the card grows by ~60pt when the donor switches the
              blood-bag photo on, which is enough to push the Share and Save
              buttons off a short screen. */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={() => setCertificateOpen(false)} style={styles.modalClose}>
              {/* Was a ✕ glyph. */}
              <X size={13} color={color.mute} strokeWidth={2} />
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>

            {certificate && (
              <HeroCertificate
                donorName={certificate.donorName}
                bloodGroup={certificate.bloodGroup}
                city={certificate.city}
                hospitalName={certificate.hospitalName}
                donationDate={certificate.donationDate}
                badge={certificate.badge}
                totalDonations={certificate.totalDonations}
                commitmentScore={certificate.commitmentScore}
                photoUrl={certificate.photoUrl}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!lightboxUrl}
        animationType="fade"
        transparent
        onRequestClose={() => setLightboxUrl(null)}
      >
        <View style={styles.lightbox}>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          <Text style={styles.lightboxCaption}>
            Photo uploaded by the hospital when your donation was collected.
            Only you and that hospital can view it.
          </Text>
          <TextAction onPress={() => setLightboxUrl(null)} style={{ marginTop: 18 }}>
            Close
          </TextAction>
        </View>
      </Modal>

    </Screen>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  loadBand: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 26,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line,
    paddingVertical: 20,
  },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  editBtnText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  // Eligibility band
  band: {
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line,
    paddingVertical: 20,
  },
  bandRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  groupCol: { width: 92 },
  groupValue: {
    fontFamily: font.mono.medium, fontSize: 40, lineHeight: 44,
    letterSpacing: -2, color: color.bone, fontVariant: ['tabular-nums'],
  },
  bandDivider: { width: 1, alignSelf: 'stretch', backgroundColor: color.lineSoft },
  bandInfo: { flex: 1, minWidth: 0 },
  bandStatus: {
    fontFamily: font.sans.semibold, fontSize: 16, color: color.bone, letterSpacing: -0.4,
  },
  bandSub: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18,
    color: color.mute, marginTop: 5,
  },
  bandFoot: {
    fontFamily: font.mono.regular, fontSize: 8.5, color: color.faint,
    letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 10,
  },

  // Availability
  availRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingVertical: 16,
  },
  availDotOff: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.faint },
  availLabel: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2 },
  availSub: { fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 16.5, color: color.faint, marginTop: 3 },
  availSwitch: { transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] },

  // Badges
  badgeBlock: { marginTop: 22 },
  badgeScroll: { marginTop: 11, flexGrow: 0, marginHorizontal: -20 },
  badgeRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 20 },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: wash.blood,
    borderWidth: 1, borderColor: wash.bloodEdge, borderRadius: radius.pill,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  badgePillText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.bloodLite,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },

  countText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.blood,
    letterSpacing: 0.5, fontVariant: ['tabular-nums'],
  },

  // Pending match card
  matchCard: {
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.lg,
    padding: 16, paddingTop: 18, marginBottom: 10, overflow: 'hidden',
  },
  matchTick: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  matchHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  matchIndex: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.blood,
    letterSpacing: 0.5, marginTop: 3,
  },
  matchHospital: { fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.3 },
  matchAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  matchAddress: { flex: 1, fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint },

  matchFigures: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    marginTop: 15, paddingTop: 14,
  },
  figure: { minWidth: 62 },
  figureDivider: { width: 1, height: 26, backgroundColor: color.lineSoft },
  figureValue: {
    fontFamily: font.mono.medium, fontSize: 21, color: color.bone,
    letterSpacing: -0.9, fontVariant: ['tabular-nums'],
  },

  matchActions: { flexDirection: 'row', gap: 8, marginTop: 16 },

  // Commitment score
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  scoreValue: {
    fontFamily: font.mono.medium, fontSize: 34, lineHeight: 36, width: 66,
    letterSpacing: -1.6, color: color.bone, fontVariant: ['tabular-nums'],
  },
  scoreCol: { flex: 1, minWidth: 0 },
  scoreLabel: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2 },
  scoreFoot: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 10,
  },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    marginTop: 16, paddingTop: 14,
  },
  leaderText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.bloodLite,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  // History
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    paddingVertical: 14,
  },
  historyMark: {
    width: 34, height: 34, borderRadius: radius.sm,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  historyThumb: {
    width: 34, height: 34, borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
  },
  historyTextWrap: { flex: 1, minWidth: 0 },
  historyMeta: {
    fontFamily: font.mono.regular, fontSize: 11, color: color.mute,
    marginTop: 4, letterSpacing: -0.1,
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  historyVerified: { fontFamily: font.sans.regular, fontSize: 10.5, color: color.lifeLite },

  certRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  certificateLink: {
    fontFamily: font.mono.medium, fontSize: 9, color: color.bloodLite,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: wash.scrim,
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  // flex: 1 bounds the scroll view to the padded overlay — without it a
  // ScrollView in a centred container just grows past the screen edge.
  modalScroll: { width: '100%', flex: 1 },
  modalCard: {
    width: '100%', alignItems: 'center',
    // flexGrow + centre keeps the card vertically centred while it still fits,
    // and lets it scroll once it doesn't.
    flexGrow: 1, justifyContent: 'center', paddingVertical: 8,
  },
  modalClose: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 12, paddingHorizontal: 8, paddingVertical: 6,
  },
  modalCloseText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  lightbox: {
    flex: 1, backgroundColor: 'rgba(4,3,3,0.95)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  lightboxImage: { width: '100%', height: '68%' },
  lightboxCaption: {
    fontFamily: font.sans.regular, fontSize: 12, lineHeight: 18, color: color.faint,
    textAlign: 'center', marginTop: 16, maxWidth: 320,
  },
})
