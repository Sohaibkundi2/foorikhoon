// app/requests/[id].tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Share } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import {
  ArrowLeft, Droplet, HandHeart, Share2, ShieldCheck,
} from 'lucide-react-native'
import api from '../../src/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import {
  Screen, Label, SectionLabel, Rule, Chip, Button, Skeleton, EmptyState,
  TextAction, ContextualLoading,
} from '../../src/components/fk'
import {
  color, font, radius, urgencyTone, statusTone, toneFor, bloodLabel,
} from '../../src/theme'

dayjs.extend(relativeTime)

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/api/requests/${id}`)
      .then(res => setRequest(res.data.request))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ForiKhoon — Blood request: ${bloodLabel(request?.bloodGroup)} needed at ${request?.hospital?.name}. Check it out on ForiKhoon app.`,
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Emergency Requisition"
          message="Retrieving emergency case details…"
          subtext="Fetching clinical requirements, hospital location, and donor dispatch status"
          variant="default"
        />
      </Screen>
    )
  }

  if (!request) {
    return (
      <Screen ember>
        <View style={[styles.gutter, { paddingTop: 6 }]}>
          <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
            {/* Was a → arrow inside the button copy. */}
            <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
            <Text style={styles.backLinkText}>Requests</Text>
          </Pressable>

          <EmptyState
            /* Was a 🩸 emoji at 48px. */
            icon={Droplet}
            title="Request not found"
            body="This request may have expired or been fulfilled. Open requests are listed on the requests screen."
            action={
              <Button tone="primary" onPress={() => router.back()}>
                View all requests
              </Button>
            }
            style={{ marginTop: 28 }}
          />
        </View>
      </Screen>
    )
  }

  const urg = toneFor(urgencyTone, request.urgency)
  const stat = toneFor(statusTone, request.status)
  const notified = request.matches?.length || 0
  const isOpen = request.status === 'PENDING'
  const expiryPassed = request.expiresAt ? dayjs(request.expiresAt).isBefore(dayjs()) : false

  return (
    <Screen ember grid tail={40}>
      {/* ── Header rail ────────────────────────────────────────────────────*/}
      <View style={[styles.gutter, styles.rail, { paddingTop: 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
          {/* Was a ← text arrow. */}
          <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
          <Text style={styles.backLinkText}>Requests</Text>
        </Pressable>

        <Pressable onPress={handleShare} style={styles.shareBtn} hitSlop={6}>
          <Share2 size={12} color={color.mute} strokeWidth={2} />
          <Text style={styles.shareText}>Share</Text>
        </Pressable>
      </View>

      {/* ── Masthead ───────────────────────────────────────────────────────
          The hospital is the headline, because that is the fact a donor acts
          on. The old version put a rounded 64px badge beside three pill
          badges — three competing focal points and no reading order. */}
      <View style={[styles.gutter, { marginTop: 24 }]}>
        <Label loud style={{ color: urg.fg }}>
          {urg.label} · blood request
        </Label>
        <Text style={styles.hospital}>{request.hospital?.name}</Text>
        <Text style={styles.where}>
          {request.hospital?.user?.city} · {request.hospital?.address}
        </Text>

        {request.hospital?.verified ? (
          <View style={styles.verifiedRow}>
            {/* Was a "Verified" pill in a row of three pills. */}
            <ShieldCheck size={13} color={color.lifeLite} strokeWidth={2} />
            <Text style={styles.verifiedText}>
              Licence checked by a ForiKhoon admin
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── The ask ────────────────────────────────────────────────────────
          One large figure, the group, set against an urgency-tinted rule.
          Everything else on this screen is a supporting record. */}
      <View style={styles.band}>
        <View style={[styles.bandTick, { backgroundColor: urg.fg }]} />
        <View style={[styles.gutter, styles.askRow]}>
          <Text style={styles.askFigure}>{bloodLabel(request.bloodGroup)}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.askUnits}>
              {request.units} unit{request.units !== 1 ? 's' : ''} needed
            </Text>
            <Text style={styles.askNote}>
              {notified > 0
                ? `${notified} matching donor${notified !== 1 ? 's' : ''} already notified`
                : 'No donor has been matched to this request yet'}
            </Text>
          </View>
          <Chip tone={stat} />
        </View>
      </View>

      {/* ── Record ─────────────────────────────────────────────────────────*/}
      <View style={styles.gutter}>
        <SectionLabel index="01">The record</SectionLabel>

        <DetailRow label="Blood group" value={bloodLabel(request.bloodGroup)} mono tint={color.bloodLite} />
        <DetailRow label="Units needed" value={String(request.units)} mono />
        <DetailRow
          label="Donors notified"
          value={String(notified)}
          mono
          tint={notified > 0 ? color.lifeLite : color.faint}
        />
        <DetailRow label="Urgency" value={urg.label} tint={urg.fg} />
        <DetailRow label="Status" value={stat.label} tint={stat.fg} />
        <DetailRow label="Posted" value={dayjs(request.createdAt).fromNow()} />
        <DetailRow
          label={expiryPassed ? 'Expired' : 'Expires'}
          value={request.expiresAt ? dayjs(request.expiresAt).fromNow() : 'No expiry set'}
          tint={expiryPassed ? color.faint : undefined}
        />

        {request.notes ? (
          <View style={{ marginTop: 30 }}>
            <SectionLabel index="02">From the hospital</SectionLabel>
            <Text style={styles.notes}>{request.notes}</Text>
          </View>
        ) : null}

        {/* ── Action ───────────────────────────────────────────────────────*/}
        {isOpen ? (
          <View style={{ marginTop: 30 }}>
            <Button
              tone="primary"
              size="lg"
              full
              icon={HandHeart}
              onPress={() => router.push('/register')}
            >
              I can help — register as a donor
            </Button>
            <Text style={styles.ctaNote}>
              Registering takes your blood group and city. You are only contacted
              when a hospital near you needs your group.
            </Text>
          </View>
        ) : (
          <View style={styles.closed}>
            <Rule />
            <Text style={styles.closedText}>
              This request is{' '}
              <Text style={[styles.closedStrong, { color: stat.fg }]}>
                {stat.label.toLowerCase()}
              </Text>
              , so no further donors are being contacted for it.
            </Text>
            <TextAction onPress={() => router.back()} tint={color.bloodLite}>
              View other requests
            </TextAction>
          </View>
        )}
      </View>
    </Screen>
  )
}

/** One line of the record: name left, hairline, value right. */
function DetailRow({ label, value, mono, tint }: {
  label: string
  value: string
  mono?: boolean
  tint?: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailFill} />
      <Text
        style={[
          mono ? styles.detailValueMono : styles.detailValue,
          tint ? { color: tint } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },

  rail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  backLinkText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  shareText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  // Masthead
  hospital: {
    fontFamily: font.sans.semibold, fontSize: 30, lineHeight: 34,
    color: color.bone, letterSpacing: -1.4, marginTop: 12,
  },
  where: {
    fontFamily: font.sans.regular, fontSize: 13, lineHeight: 19,
    color: color.mute, marginTop: 9,
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  verifiedText: {
    flex: 1, fontFamily: font.sans.regular, fontSize: 12, color: color.faint,
  },

  // The ask
  band: {
    borderTopWidth: 1, borderTopColor: color.line,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingBottom: 22, marginTop: 30, marginBottom: 32,
  },
  bandTick: { height: 2, marginBottom: 20 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  askFigure: {
    fontFamily: font.mono.medium, fontSize: 50, lineHeight: 54,
    color: color.bone, letterSpacing: -3.5,
  },
  askUnits: {
    fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.3,
  },
  askNote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 5,
  },

  // Record ledger
  detailRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  detailLabel: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  detailFill: { flex: 1, height: 1, backgroundColor: color.lineSoft, alignSelf: 'center' },
  detailValue: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone },
  detailValueMono: {
    fontFamily: font.mono.medium, fontSize: 15, color: color.bone,
    letterSpacing: -0.4, fontVariant: ['tabular-nums'],
  },

  notes: {
    fontFamily: font.sans.regular, fontSize: 13.5, lineHeight: 21,
    color: color.mute, marginTop: 4,
    borderLeftWidth: 2, borderLeftColor: color.line, paddingLeft: 14,
  },

  ctaNote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17.5,
    color: color.faint, marginTop: 14,
  },

  closed: { marginTop: 30, gap: 14 },
  closedText: {
    fontFamily: font.sans.regular, fontSize: 13, lineHeight: 20,
    color: color.mute, marginTop: 16,
  },
  closedStrong: { fontFamily: font.sans.medium },
})
