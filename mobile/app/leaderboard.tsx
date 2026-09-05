// app/leaderboard.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Link } from 'expo-router'
import {
  Check, ChevronDown, ChevronUp, Crown, Droplet, ListFilter,
} from 'lucide-react-native'
import api from '../src/lib/api'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Skeleton, EmptyState, Button,
  ContextualLoading,
} from '../src/components/fk'
import {
  color, wash, font, radius, bloodLabel, tintFor, initialsFor,
} from '../src/theme'

interface LeaderboardEntry {
  rank: number
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
  totalDonations: number
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
  const leader = ranked[0]
  const rest = ranked.slice(1)

  const renderFilterRow = (
    label: string,
    key: 'city',
    options: string[],
    current: string,
    setter: (v: string) => void
  ) => (
    <View style={styles.filterGroup}>
      <Pressable
        style={[styles.filterBtn, activeFilter === key && styles.filterBtnActive]}
        onPress={() => setActiveFilter(activeFilter === key ? null : key)}
      >
        <ListFilter size={13} color={color.faint} strokeWidth={2} />
        <Text style={styles.filterBtnText}>
          {current === 'ALL' ? label : current}
        </Text>
        <View style={{ flex: 1 }} />
        {/* Were ▲ / ▼ text glyphs. */}
        {activeFilter === key
          ? <ChevronUp size={14} color={color.mute} strokeWidth={2} />
          : <ChevronDown size={14} color={color.mute} strokeWidth={2} />}
      </Pressable>
      {activeFilter === key && (
        <View style={styles.dropdown}>
          {options.map(opt => (
            <Pressable
              key={opt}
              style={[styles.dropdownItem, current === opt && styles.dropdownItemActive]}
              onPress={() => { setter(opt); setActiveFilter(null) }}
            >
              <Text style={[styles.dropdownText, current === opt && styles.dropdownTextActive]}>
                {opt === 'ALL' ? `All ${label}` : opt}
              </Text>
              {current === opt && <Check size={12} color={color.bloodLite} strokeWidth={2.5} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <Screen grid>
      <PageHead
        eyebrow="Community · Leaderboard"
        title="Ranked by"
        accent="commitment."
        sub="Every donor whose commitment score has moved above zero, ordered highest first. The list holds the top twenty across Pakistan."
      />

      <View style={styles.gutter}>
        {/* City filter — dropdown, not a wrapping chip row */}
        {renderFilterRow('Cities', 'city', cities, cityFilter, setCityFilter)}

        {loading && (
          <ContextualLoading
            message="Loading top donor honor roll & rankings…"
            subtext="Aggregating verified donor commitment scores across Pakistan"
            variant="table"
          />
        )}

        {!loading && ranked.length === 0 && (
          <EmptyState
            icon={Droplet}
            title="No donors yet"
            body={cityFilter === 'ALL'
              ? 'Nobody has earned a commitment score yet. The first accepted match puts a name here.'
              : `No donor from ${cityFilter} has a commitment score yet.`}
            action={
              <Link href="/register" asChild>
                <Button tone="primary">Register as donor</Button>
              </Link>
            }
          />
        )}

        {!loading && ranked.length > 0 && (
          <>
            {/* ── Leader ────────────────────────────────────────────────────
                Ranged left on a ruled band, not a centred podium with medal
                glyphs. The score is the largest thing in the block because the
                whole page is an ordering by that one number. */}
            {leader && (
              <View style={styles.leaderBand}>
                <View style={styles.leaderTopRow}>
                  <Crown size={13} color={color.warnLite} strokeWidth={2} />
                  <Label loud>First place</Label>
                </View>

                <View style={styles.leaderRow}>
                  <View style={[styles.leaderTile, { backgroundColor: tintFor(leader.name).bg }]}>
                    <Text style={[styles.leaderTileText, { color: tintFor(leader.name).fg }]}>
                      {initialsFor(leader.name)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.leaderName} numberOfLines={1}>{leader.name}</Text>
                    <View style={styles.leaderMeta}>
                      <Text style={styles.leaderCity} numberOfLines={1}>{leader.city}</Text>
                      {leader.bloodGroup && (
                        <>
                          <View style={styles.metaDot} />
                          <Text style={styles.groupText}>{bloodLabel(leader.bloodGroup)}</Text>
                        </>
                      )}
                    </View>
                    {leader.totalDonations > 0 && (
                      <Text style={styles.donationsText}>
                        {leader.totalDonations} donation{leader.totalDonations !== 1 ? 's' : ''} recorded
                      </Text>
                    )}
                  </View>

                  <View style={styles.leaderScoreCol}>
                    <Text style={styles.leaderScore}>{leader.commitmentScore}</Text>
                    <Label>Score</Label>
                  </View>
                </View>
              </View>
            )}

            {/* ── Everyone else ─────────────────────────────────────────── */}
            {rest.length > 0 && (
              <>
                <SectionLabel index="02" style={{ marginTop: 30 }}>Following</SectionLabel>

                {rest.map((donor) => {
                  const tint = tintFor(donor.name)
                  return (
                    <View key={donor.rank} style={styles.row}>
                      <Text style={styles.rowRank}>{String(donor.rank).padStart(2, '0')}</Text>

                      <View style={[styles.rowTile, { backgroundColor: tint.bg }]}>
                        <Text style={[styles.rowTileText, { color: tint.fg }]}>
                          {initialsFor(donor.name)}
                        </Text>
                      </View>

                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName} numberOfLines={1}>{donor.name}</Text>
                        <View style={styles.rowMeta}>
                          <Text style={styles.rowCity} numberOfLines={1}>{donor.city}</Text>
                          {donor.bloodGroup && (
                            <>
                              <View style={styles.metaDot} />
                              <Text style={styles.groupTextSmall}>{bloodLabel(donor.bloodGroup)}</Text>
                            </>
                          )}
                        </View>
                      </View>

                      <View style={styles.rowScoreWrap}>
                        <Text style={styles.rowScore}>{donor.commitmentScore}</Text>
                        {donor.totalDonations > 0 && (
                          <Text style={styles.rowDonations}>{donor.totalDonations} donated</Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </>
            )}

            <Rule style={{ marginTop: 26 }} />
            <Text style={styles.footnote}>
              Commitment score rises when a donor accepts a match and the hospital confirms the
              collection. Declining or not showing up moves it the other way.
            </Text>
          </>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  // Dropdown filter
  filterGroup: { marginBottom: 26, position: 'relative', zIndex: 10 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  filterBtnActive: { borderColor: wash.bloodEdge, backgroundColor: color.raised },
  filterBtnText: {
    fontFamily: font.mono.medium, fontSize: 11, color: color.bone,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },
  dropdown: {
    marginTop: 5, backgroundColor: color.raised,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: color.lineSoft,
  },
  dropdownItemActive: { backgroundColor: wash.blood },
  dropdownText: { fontFamily: font.sans.regular, fontSize: 13.5, color: color.mute },
  dropdownTextActive: { fontFamily: font.sans.medium, color: color.bloodLite },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 15,
  },

  // Leader band
  leaderBand: {
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line,
    paddingVertical: 18,
  },
  leaderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  leaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  leaderTile: {
    width: 52, height: 52, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  leaderTileText: { fontFamily: font.mono.medium, fontSize: 17, letterSpacing: 0.4 },
  leaderName: {
    fontFamily: font.sans.semibold, fontSize: 19, color: color.bone, letterSpacing: -0.6,
  },
  leaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  leaderCity: { fontFamily: font.sans.regular, fontSize: 12.5, color: color.mute, flexShrink: 1 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.faint },
  groupText: { fontFamily: font.mono.medium, fontSize: 12.5, color: color.bloodLite, letterSpacing: -0.2 },
  donationsText: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.lifeLite, marginTop: 7,
  },
  leaderScoreCol: { alignItems: 'flex-end' },
  leaderScore: {
    fontFamily: font.mono.medium, fontSize: 32, lineHeight: 34, color: color.bone,
    letterSpacing: -1.5, fontVariant: ['tabular-nums'], marginBottom: 5,
  },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  rowRank: {
    fontFamily: font.mono.regular, fontSize: 11, color: color.faint,
    width: 20, fontVariant: ['tabular-nums'],
  },
  rowTile: {
    width: 34, height: 34, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTileText: { fontFamily: font.mono.medium, fontSize: 11.5, letterSpacing: 0.3 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: font.sans.medium, fontSize: 14, color: color.bone, letterSpacing: -0.3 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  rowCity: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, flexShrink: 1 },
  groupTextSmall: { fontFamily: font.mono.medium, fontSize: 11, color: color.bloodLite },
  rowScoreWrap: { alignItems: 'flex-end' },
  rowScore: {
    fontFamily: font.mono.medium, fontSize: 16, color: color.bone,
    letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  rowDonations: { fontFamily: font.mono.regular, fontSize: 9, color: color.lifeLite, marginTop: 3 },

  footnote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 14,
  },
})
