import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, Share, FlatList, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import {
  ChevronDown, ChevronUp, Droplet, HandHeart, Share2, ShieldCheck,
} from 'lucide-react-native'
import api from '../../src/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

import {
  Screen, PageHead, Label, Chip, Button, Skeleton, EmptyState, Rule,
  TextAction, useTabBarInset,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, toneFor, bloodLabel,
} from '../../src/theme'

dayjs.extend(relativeTime)

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
  hospital: {
    name: string
    address: string
    verified: boolean
    user: { city: string } | null
  }
  matches: { id: string }[] | null
}

const urgencyOrder: Record<string, number> = { CRITICAL: 0, URGENT: 1, NORMAL: 2 }

const bloodGroups = ['ALL', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const urgencies = ['ALL', 'CRITICAL', 'URGENT', 'NORMAL']

type FacetKey = 'city' | 'blood' | 'urgency'

export default function RequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<'city' | 'blood' | 'urgency' | null>(null)

  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)

  const bottomInset = useTabBarInset()

  const cities = ['ALL', ...Array.from(new Set(
  requests.map(r => r.hospital?.user?.city).filter(Boolean)
))] as string[]

  useEffect(() => {
    const fetchRequests = async () => {
      if (!isOnline) {
        const cached = await loadCache('public_requests')

        if (cached) {
          setRequests(cached.data)
          setCacheTime(cached.time)
        }

        setLoading(false)
        return
      }

      try {
        const res = await api.get('/api/requests')

        setRequests(res.data.requests)

        await saveCache('public_requests', res.data.requests)
        setCacheTime(Date.now())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [isOnline])

  const filtered = requests
    .filter(req => {
      if (cityFilter !== 'ALL' && req.hospital?.user?.city !== cityFilter) return false
      if (bloodGroupFilter !== 'ALL' && req.bloodGroup !== bloodGroupFilter) return false
      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) return false
      return true
    })
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  const hasFilters = cityFilter !== 'ALL' || bloodGroupFilter !== 'ALL' || urgencyFilter !== 'ALL'

  const handleShare = async (req: BloodRequest) => {
    await Share.share({
      message: `ForiKhoon — ${bloodLabel(req.bloodGroup)} blood needed at ${req.hospital?.name} in ${req.hospital?.user?.city}. Download ForiKhoon to help!`
    })
  }

  /**
   * The three filter dimensions, described once. The state and the setters are
   * exactly the ones above — this table only decides how each facet is drawn and
   * how its raw enum value is spelled for a reader.
   */
  const facets: {
    key: FacetKey
    label: string
    options: string[]
    current: string
    setter: (v: string) => void
    fmt: (v: string) => string
  }[] = [
    { key: 'city', label: 'City', options: cities, current: cityFilter, setter: setCityFilter, fmt: v => v },
    {
      key: 'blood', label: 'Group', options: bloodGroups, current: bloodGroupFilter,
      setter: setBloodGroupFilter, fmt: v => bloodLabel(v),
    },
    {
      key: 'urgency', label: 'Urgency', options: urgencies, current: urgencyFilter,
      setter: setUrgencyFilter, fmt: v => toneFor(urgencyTone, v).label,
    },
  ]

  const openFacet = facets.find(f => f.key === activeFilter)

  return (
    /* The FlatList owns the scrolling, so the Screen is a plain frame. */
    <Screen scroll={false} ember>
      {!isOnline && (
        <View style={[styles.gutter, { paddingTop: 10 }]}>
          <OfflineBanner lastUpdated={cacheTime} />
        </View>
      )}

      <PageHead
        eyebrow="Live · Open requests"
        title="Who needs blood"
        accent="right now."
        sub="Posted by hospitals, most urgent first. Tap a request to see the hospital and how to reach it."
      />

      {/* ── Facets ─────────────────────────────────────────────────────────
          Three buttons on a rail, and the options for whichever one is open
          land in a full-width tray directly underneath. The previous version
          floated a 140px absolute dropdown over the first card, which on a
          phone covers the thing you are filtering. */}
      <View style={styles.facetWrap}>
        <View style={styles.facetRail}>
          {facets.map((facet) => {
            const open = activeFilter === facet.key
            const set = facet.current !== 'ALL'
            return (
              <Pressable
                key={facet.key}
                onPress={() => setActiveFilter(open ? null : facet.key)}
                style={[
                  styles.facetBtn,
                  set && styles.facetBtnSet,
                  open && styles.facetBtnOpen,
                ]}
              >
                <Text style={[styles.facetText, set && styles.facetTextSet]} numberOfLines={1}>
                  {facet.current === 'ALL' ? facet.label : facet.fmt(facet.current)}
                </Text>
                {/* Were ▲ / ▼ text glyphs. */}
                {open
                  ? <ChevronUp size={12} color={color.mute} strokeWidth={2} />
                  : <ChevronDown size={12} color={color.faint} strokeWidth={2} />}
              </Pressable>
            )
          })}

          <View style={{ flex: 1 }} />

          {hasFilters && (
            <TextAction
              tint={color.bloodLite}
              onPress={() => { setCityFilter('ALL'); setBloodGroupFilter('ALL'); setUrgencyFilter('ALL') }}
            >
              Clear
            </TextAction>
          )}
        </View>

        {openFacet && (
          <View style={styles.tray}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trayContent}
            >
              {openFacet.options.map((opt) => {
                const on = openFacet.current === opt
                return (
                  <Pressable
                    key={opt}
                    onPress={() => { openFacet.setter(opt); setActiveFilter(null) }}
                    style={[styles.trayCell, on && styles.trayCellOn]}
                  >
                    <Text style={[styles.trayText, on && styles.trayTextOn]}>
                      {opt === 'ALL' ? 'Any' : openFacet.fmt(opt)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.countRow}>
          <Label loud>
            {filtered.length} open{hasFilters ? ' · filtered' : ''}
          </Label>
          {requests.length > filtered.length && (
            <Label>{requests.length} total</Label>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.gutter}>
          <Rule />
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.loadRow}>
              <Skeleton width={46} height={26} />
              <View style={{ flex: 1, gap: 9 }}>
                <Skeleton width="70%" height={13} />
                <Skeleton width="44%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
          ListEmptyComponent={
            <EmptyState
              /* Was a 🩸 emoji at 40px. */
              icon={Droplet}
              title="No requests found"
              body={hasFilters
                ? 'Nothing matches these filters. Clear one and the list widens.'
                : 'No hospital has an open request at the moment. That is good news.'}
              style={{ marginHorizontal: 20, marginTop: 24 }}
            />
          }
          renderItem={({ item: req }) => {
            const urg = toneFor(urgencyTone, req.urgency)
            return (
              /* Rows on hairlines with an urgency-tinted edge. A page of
                 rounded cards gives every request the same visual weight; the
                 edge lets a critical one read as critical from arm's length. */
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/requests/${req.id}`)}
              >
                <View style={[styles.edge, { backgroundColor: urg.fg }]} />

                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.group}>
                      {bloodLabel(req.bloodGroup) || req.bloodGroup}
                    </Text>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.hospitalName} numberOfLines={1}>
                          {req.hospital?.name}
                        </Text>
                        {req.hospital?.verified && (
                          /* Was a ✓ text glyph in a green box. */
                          <ShieldCheck size={12} color={color.lifeLite} strokeWidth={2} />
                        )}
                      </View>

                      <Text style={styles.hospitalSub} numberOfLines={1}>
                        {req.hospital?.user?.city} · {req.hospital?.address}
                      </Text>
                    </View>

                    <Chip tone={urg} />
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaMono}>
                      {req.units} unit{req.units !== 1 ? 's' : ''}
                    </Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaMono}>{dayjs(req.createdAt).fromNow()}</Text>
                  </View>

                  {req.notes && (
                    <Text style={styles.notes} numberOfLines={2}>{req.notes}</Text>
                  )}

                  <View style={styles.actions}>
                    <Button
                      tone="primary"
                      size="sm"
                      icon={HandHeart}
                      style={{ flex: 1 }}
                      onPress={() => router.push('/register')}
                    >
                      I can help
                    </Button>
                    <Button
                      tone="quiet"
                      size="sm"
                      icon={Share2}
                      onPress={() => handleShare(req)}
                    >
                      Share
                    </Button>
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  loadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderBottomWidth: 1, borderBottomColor: color.lineSoft, paddingVertical: 18,
  },

  // Facets
  facetWrap: { borderBottomWidth: 1, borderBottomColor: color.line },
  facetRail: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  facetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 8,
    maxWidth: 118,
  },
  facetBtnSet: { borderColor: wash.bloodEdge, backgroundColor: wash.blood },
  facetBtnOpen: { borderColor: color.blood },
  facetText: {
    fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  facetTextSet: { fontFamily: font.mono.medium, color: color.bloodLite },

  tray: { borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 12 },
  trayContent: { paddingHorizontal: 20, gap: 7 },
  trayCell: {
    borderWidth: 1, borderColor: color.line, backgroundColor: color.ink,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8,
  },
  trayCellOn: { borderColor: color.blood, backgroundColor: wash.bloodDeep },
  trayText: { fontFamily: font.mono.regular, fontSize: 12, color: color.mute },
  trayTextOn: { fontFamily: font.mono.medium, color: color.bone },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },

  // Rows
  list: { paddingTop: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  edge: { width: 2 },
  rowBody: { flex: 1, minWidth: 0, paddingHorizontal: 18, paddingVertical: 16 },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  group: {
    fontFamily: font.mono.medium, fontSize: 21, color: color.bone,
    letterSpacing: -1, width: 46,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hospitalName: {
    flexShrink: 1, fontFamily: font.sans.medium, fontSize: 14,
    color: color.bone, letterSpacing: -0.2,
  },
  hospitalSub: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 4,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaMono: { fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.line },

  notes: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18,
    color: color.mute, marginTop: 10,
    borderLeftWidth: 2, borderLeftColor: color.line, paddingLeft: 11,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
})
