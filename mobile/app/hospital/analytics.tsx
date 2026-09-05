// app/hospital/analytics.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router, Link } from 'expo-router'
import { ArrowLeft, ArrowUpRight, Package } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Skeleton, SegmentMeter,
  EmptyState, LiveDot, ContextualLoading,
} from '../../src/components/fk'
import { color, font, bloodLabel } from '../../src/theme'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

interface Analytics {
  mostRequested: string | null
  totalRequestsThisMonth: number
  fulfillmentRate: number
  totalRequests: number
  fulfilled: number
  lowStock: Inventory[]
  inventory: Inventory[]
}

/** The meter's own scale. See the note on the inventory screen: no capacity is
 *  stored anywhere, so twenty units is a shared reading scale, not a claim. */
const SHELF_FULL = 20

/**
 * Four stock tiers, three colours. Zero and one-to-four both sit below the
 * five-unit line the backend alerts on, so both are red — the label separates
 * them. Inventing a fourth hue to make them differ by colour would break the
 * rule that a colour family means one thing across the app.
 */
function stockLevel(units: number): { label: string; tint: string } {
  if (units === 0) return { label: 'Out', tint: color.bloodLite }
  if (units < 5) return { label: 'Critical', tint: color.bloodLite }
  if (units < 10) return { label: 'Low', tint: color.warnLite }
  return { label: 'Good', tint: color.lifeLite }
}

export default function HospitalAnalyticsScreen() {
  const { user } = useAuthStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }

    api.get('/api/hospital/analytics')
      .then(res => setAnalytics(res.data.analytics))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Hospital · Analytics"
          message="Aggregating clinical analytics & demand telemetry…"
          subtext="Compiling regional blood fulfillment and inventory metrics"
          variant="metrics"
        />
      </Screen>
    )
  }

  if (!analytics) return null

  const lowCount = analytics.lowStock.length
  const lowList = analytics.lowStock
    .map(item => `${bloodLabel(item.bloodGroup)} at ${item.units}`)
    .join(', ')

  return (
    <Screen ember grid tail={40}>
      <View style={[styles.gutter, { paddingTop: 6 }]}>
        <Link href="/hospital/dashboard" asChild>
          <Pressable style={styles.backLink} hitSlop={8}>
            {/* Was a ← text arrow. */}
            <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
            <Text style={styles.backLinkText}>Dashboard</Text>
          </Pressable>
        </Link>
      </View>

      <PageHead
        eyebrow="Hospital · Analytics"
        title="How your requests"
        accent="actually land."
        sub="Counted from your own requests and your own shelf. Nothing here is projected or estimated."
      />

      {/* ── Fulfilment ─────────────────────────────────────────────────────
          The rate leads, because it is the one figure that says whether the
          rest of the screen is working. The meter is brand red at every value:
          tinting it by threshold would invent a pass mark the backend has no
          opinion about. */}
      <View style={styles.band}>
        <View style={styles.bandTick} />
        <View style={styles.gutter}>
          <Label>Fulfilment rate · all time</Label>
          <View style={styles.rateRow}>
            <Text style={styles.rateFigure}>{analytics.fulfillmentRate}</Text>
            <Text style={styles.ratePct}>%</Text>
          </View>
          <SegmentMeter
            value={analytics.fulfillmentRate}
            max={100}
            segments={20}
            tint={color.blood}
            style={{ marginTop: 16 }}
          />
          <Text style={styles.rateNote}>
            {analytics.fulfilled} of {analytics.totalRequests} request
            {analytics.totalRequests !== 1 ? 's' : ''} closed as fulfilled.
            {analytics.totalRequests === 0 ? ' Nothing posted yet.' : ''}
          </Text>
        </View>
      </View>

      {/* ── Volume ─────────────────────────────────────────────────────────
          A ledger, not four cards. Figures in one right-hand column share a
          decimal position, which is what makes them comparable at a glance. */}
      <View style={styles.gutter}>
        <SectionLabel index="01">Request volume</SectionLabel>

        <LedgerRow label="Posted since the 1st" value={analytics.totalRequestsThisMonth} />
        <LedgerRow label="Posted all time" value={analytics.totalRequests} />
        <LedgerRow label="Fulfilled" value={analytics.fulfilled} tint={color.lifeLite} />
        <LedgerRow
          label="Most requested group"
          value={analytics.mostRequested ? bloodLabel(analytics.mostRequested) : '—'}
          tint={analytics.mostRequested ? color.bloodLite : color.faint}
        />

        <Text style={styles.footnote}>
          The month figure counts requests created since the first of this
          calendar month. The most-requested group is counted across every
          request you have ever posted.
        </Text>
      </View>

      {/* ── Inventory ──────────────────────────────────────────────────────*/}
      <View style={[styles.gutter, { marginTop: 34 }]}>
        <SectionLabel
          index="02"
          aside={
            <Link href="/hospital/inventory" asChild>
              <Pressable hitSlop={6} style={styles.manageLink}>
                {/* Was a → text arrow. */}
                <Text style={styles.manageText}>Manage</Text>
                <ArrowUpRight size={12} color={color.bloodLite} strokeWidth={2} />
              </Pressable>
            </Link>
          }
        >
          Inventory status
        </SectionLabel>

        {lowCount > 0 && (
          /* Was a card with a pulsing orange dot animated by the legacy
             Animated API. Same signal, one row, using the kit's LiveDot. */
          <View style={styles.alertRow}>
            <LiveDot size={7} tint={color.warn} />
            <Text style={styles.alertText}>
              <Text style={styles.alertStrong}>
                {lowCount} group{lowCount !== 1 ? 's' : ''} under five units
              </Text>
              {' — '}{lowList}
            </Text>
          </View>
        )}

        {analytics.inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory recorded"
            body="Once you record what is on the shelf, this section flags every group that drops below five units."
          />
        ) : (
          analytics.inventory.map((item) => {
            const level = stockLevel(item.units)
            return (
              <View key={item.id} style={styles.stockRow}>
                <Text style={styles.stockGroup}>{bloodLabel(item.bloodGroup)}</Text>
                <SegmentMeter
                  value={item.units}
                  max={SHELF_FULL}
                  segments={10}
                  tint={level.tint}
                  style={{ flex: 1 }}
                />
                <Text style={styles.stockUnits}>{item.units}</Text>
                <Text style={[styles.stockLevel, { color: level.tint }]}>{level.label}</Text>
              </View>
            )
          })
        )}
      </View>
    </Screen>
  )
}

/** One line of the volume ledger: name left, hairline, figure right. */
function LedgerRow({ label, value, tint }: {
  label: string
  value: string | number
  tint?: string
}) {
  return (
    <View style={styles.ledgerRow}>
      <Text style={styles.ledgerLabel}>{label}</Text>
      <View style={styles.ledgerFill} />
      <Text style={[styles.ledgerValue, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  backLinkText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  // Fulfilment band
  band: {
    borderTopWidth: 1, borderTopColor: color.line,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingBottom: 22, marginBottom: 34,
  },
  bandTick: { height: 2, marginBottom: 20, backgroundColor: color.blood },
  rateRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  rateFigure: {
    fontFamily: font.mono.medium, fontSize: 58, lineHeight: 60,
    color: color.bone, letterSpacing: -4, fontVariant: ['tabular-nums'],
  },
  ratePct: {
    fontFamily: font.mono.regular, fontSize: 20, color: color.mute,
    marginTop: 8, marginLeft: 3,
  },
  rateNote: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 19,
    color: color.mute, marginTop: 14,
  },

  // Volume ledger
  ledgerRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 15,
  },
  ledgerLabel: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  ledgerFill: { flex: 1, height: 1, backgroundColor: color.lineSoft, alignSelf: 'center' },
  ledgerValue: {
    fontFamily: font.mono.medium, fontSize: 17, color: color.bone,
    letterSpacing: -0.7, fontVariant: ['tabular-nums'],
  },

  footnote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17.5,
    color: color.faint, marginTop: 16,
  },

  // Low-stock alert
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 2, borderLeftColor: color.warn,
    paddingLeft: 12, paddingVertical: 10, marginBottom: 18,
  },
  alertText: {
    flex: 1, fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18,
    color: color.mute,
  },
  alertStrong: { fontFamily: font.sans.medium, color: color.warnLite },

  // Inventory rows
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  manageText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.bloodLite,
    letterSpacing: 1.3, textTransform: 'uppercase',
  },

  stockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  stockGroup: {
    fontFamily: font.mono.medium, fontSize: 14, color: color.bloodLite,
    letterSpacing: -0.4, width: 34,
  },
  stockUnits: {
    fontFamily: font.mono.medium, fontSize: 15, color: color.bone,
    fontVariant: ['tabular-nums'], width: 26, textAlign: 'right',
  },
  stockLevel: {
    fontFamily: font.mono.regular, fontSize: 9, letterSpacing: 1.1,
    textTransform: 'uppercase', width: 48, textAlign: 'right',
  },
})
