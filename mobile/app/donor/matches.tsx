import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Check, Inbox, MapPin, X } from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

import {
  Screen, PageHead, Chip, Button, Skeleton, EmptyState, Rule, useTabBarInset,
  ContextualLoading,
} from '../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, toneFor, bloodLabel,
} from '../../src/theme'

interface Match {
  id: string
  status: string
  createdAt: string
  request: {
    bloodGroup: string
    units: number
    urgency: string
    hospital: {
      name: string
      address: string
    }
  }
}

type Tab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW'
const TABS: Tab[] = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'NO_SHOW']

/** Sentence-case labels for the rail. The enum values stay the filter keys. */
const TAB_LABEL: Record<Tab, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  COMPLETED: 'Completed',
  NO_SHOW: 'No show',
}

export default function DonorMatchesScreen() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)
  const bottomInset = useTabBarInset()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.role !== 'DONOR') {
      router.replace('/')
      return
    }
    fetchMatches()
  }, [user])

  const fetchMatches = async () => {
    if (!isOnline) {
      const cachedMatches = await loadCache('donor_matches')

      if (cachedMatches) {
        setMatches(cachedMatches.data)
        setCacheTime(cachedMatches.time)
      }

      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      const res = await api.get('/api/donor/matches')

      setMatches(res.data.matches)

      // Save latest matches
      await saveCache('donor_matches', res.data.matches)
      setCacheTime(Date.now())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMatches()
  }, [])

  const respondToMatch = async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setRespondingId(matchId)
    try {
      await api.put(`/api/donor/matches/${matchId}`, { status })
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)))
    } catch (err) {
      console.error(err)
    } finally {
      setRespondingId(null)
    }
  }

  const filteredMatches =
    activeTab === 'ALL' ? matches : matches.filter((m) => m.status === activeTab)

  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Donor · Dispatches"
          message="Loading incoming emergency dispatches…"
          subtext="Searching compatible patient transfusions assigned to you"
          variant="cards"
        />
      </Screen>
    )
  }

  return (
    /* The FlatList does the scrolling here, so the Screen is a plain frame. */
    <Screen scroll={false} ember>
      {!isOnline && (
        <View style={[styles.gutter, { paddingTop: 12 }]}>
          <OfflineBanner lastUpdated={cacheTime} />
        </View>
      )}

      <PageHead
        eyebrow="Donor · Matches"
        title="Every request"
        accent="that named you."
        sub="A match is created when a hospital's search reaches your group and radius. Pending ones are waiting on your answer."
      />

      {/* Filter rail. Chips rather than underlined tabs — six statuses do not
          fit across a phone as tabs, and a chip can carry its own count. Each
          selected chip takes that status's own colour, so the rail doubles as
          the legend for the list below it. */}
      <View style={styles.railWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
        >
          {TABS.map((tab) => {
            const count =
              tab === 'ALL' ? matches.length : matches.filter((m) => m.status === tab).length
            const active = activeTab === tab
            const tone = tab === 'ALL'
              ? { fg: color.bone, bg: wash.bone, border: wash.boneEdge, label: 'All' }
              : toneFor(statusTone, tab)
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.railChip,
                  active && { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.railText, active && { color: tone.fg, fontFamily: font.mono.medium }]}>
                  {TAB_LABEL[tab]}
                </Text>
                {count > 0 && (
                  <Text style={[styles.railCount, active && { color: tone.fg }]}>{count}</Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.blood}
            colors={[color.blood]}
            progressBackgroundColor={color.surface}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Inbox}
            title={activeTab === 'ALL' ? 'No matches yet' : `Nothing ${TAB_LABEL[activeTab].toLowerCase()}`}
            body={activeTab === 'ALL'
              ? 'When a hospital search reaches your group and radius, the match appears here and you are notified.'
              : 'Switch the filter above to see your other matches.'}
            style={{ marginHorizontal: 20, marginTop: 24 }}
          />
        }
        renderItem={({ item: match }) => {
          const urgency = toneFor(urgencyTone, match.request.urgency)
          const status = toneFor(statusTone, match.status)
          const pending = match.status === 'PENDING'
          return (
            /* Rows on hairlines with a status-tinted edge, not floating cards.
               A list of twenty matches as twenty bordered boxes is all border
               and no rhythm; the coloured edge carries the status down the page. */
            <View style={styles.row}>
              <View style={[styles.edge, { backgroundColor: status.fg }]} />

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.hospitalName} numberOfLines={1}>
                    {match.request.hospital.name}
                  </Text>
                  <Chip tone={status} />
                </View>

                <View style={styles.addrRow}>
                  <MapPin size={10} color={color.faint} strokeWidth={2} />
                  <Text style={styles.address} numberOfLines={1}>
                    {match.request.hospital.address}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.bloodGroup}>
                    {bloodLabel(match.request.bloodGroup)}
                  </Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.meta}>
                    {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.meta}>{new Date(match.createdAt).toLocaleDateString()}</Text>
                  <View style={{ flex: 1 }} />
                  <Chip tone={urgency} />
                </View>

                {pending && (
                  <View style={styles.actionsRow}>
                    <Button
                      tone="ghost"
                      size="sm"
                      icon={X}
                      style={{ flex: 1 }}
                      disabled={respondingId === match.id}
                      onPress={() => respondToMatch(match.id, 'DECLINED')}
                    >
                      Decline
                    </Button>
                    <Button
                      tone="affirm"
                      size="sm"
                      icon={Check}
                      style={{ flex: 1 }}
                      busy={respondingId === match.id}
                      onPress={() => respondToMatch(match.id, 'ACCEPTED')}
                    >
                      Accept
                    </Button>
                  </View>
                )}
              </View>
            </View>
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 18,
  },

  // Filter rail
  railWrap: { borderBottomWidth: 1, borderBottomColor: color.line },
  railContent: { paddingHorizontal: 20, paddingBottom: 14, gap: 7 },
  railChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  railText: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.mute,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  railCount: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.faint,
    fontVariant: ['tabular-nums'],
  },

  // List
  listContent: { paddingTop: 4 },

  row: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: color.lineSoft,
  },
  edge: { width: 2 },
  rowBody: { flex: 1, minWidth: 0, paddingHorizontal: 18, paddingVertical: 16 },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hospitalName: {
    flex: 1, fontFamily: font.sans.medium, fontSize: 14.5,
    color: color.bone, letterSpacing: -0.3,
  },

  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  address: { flex: 1, fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  bloodGroup: {
    fontFamily: font.mono.medium, fontSize: 13, color: color.bloodLite, letterSpacing: -0.3,
  },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.faint },
  meta: { fontFamily: font.mono.regular, fontSize: 10.5, color: color.mute },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
})
