import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

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

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const urgencyColors: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  URGENT: { text: '#FB923C', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
  NORMAL: { text: '#4ADE80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' },
}

const matchStatusColors: Record<string, { text: string; bg: string; border: string }> = {
  PENDING: { text: '#FACC15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)' },
  ACCEPTED: { text: '#4ADE80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' },
  DECLINED: { text: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  COMPLETED: { text: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
}

type Tab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
const TABS: Tab[] = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED']

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
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      
      {!isOnline && <OfflineBanner lastUpdated={cacheTime} />}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DONOR</Text>
        <Text style={styles.title}>My Matches</Text>
        <Text style={styles.subtitle}>Blood requests you've been matched with.</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => {
          const count =
            tab === 'ALL' ? matches.length : matches.filter((m) => m.status === tab).length
          const active = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No matches in this category.</Text>
          </View>
        }
        renderItem={({ item: match }) => {
          const urgency = urgencyColors[match.request.urgency]
          const status = matchStatusColors[match.status]
          return (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.hospitalName} numberOfLines={1}>
                  {match.request.hospital.name}
                </Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
                  <Text style={[styles.badgeText, { color: urgency.text }]}>
                    {match.request.urgency}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
                  <Text style={[styles.badgeText, { color: status.text }]}>{match.status}</Text>
                </View>
              </View>

              <Text style={styles.address} numberOfLines={1}>
                {match.request.hospital.address}
              </Text>

              <Text style={styles.meta}>
                Needs {match.request.units} unit{match.request.units > 1 ? 's' : ''} of{' '}
                <Text style={styles.bloodGroup}>
                  {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                </Text>
              </Text>

              <Text style={styles.date}>{new Date(match.createdAt).toLocaleDateString()}</Text>

              {match.status === 'PENDING' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() => respondToMatch(match.id, 'ACCEPTED')}
                    disabled={respondingId === match.id}
                    style={[styles.actionButton, styles.acceptButton]}
                  >
                    {respondingId === match.id ? (
                      <ActivityIndicator size="small" color="#4ADE80" />
                    ) : (
                      <Text style={styles.acceptText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => respondToMatch(match.id, 'DECLINED')}
                    disabled={respondingId === match.id}
                    style={[styles.actionButton, styles.declineButton]}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F0F0F' },
  centerScreen: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 1.5, marginBottom: 6, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  tabsRow: { borderBottomWidth: 1, borderBottomColor: '#222', flexGrow: 0 },
  tabsContent: { paddingHorizontal: 16, gap: 4 },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#DC2626' },
  tabText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },

  listContent: { padding: 16, paddingBottom: 40, gap: 12 },

  emptyCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { color: '#6B7280', fontSize: 13 },

  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: { marginBottom: 6 },
  hospitalName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  address: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  meta: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  bloodGroup: { color: '#DC2626', fontWeight: '700' },
  date: { color: '#6B7280', fontSize: 11, marginBottom: 10 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  acceptButton: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)' },
  acceptText: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
  declineButton: { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' },
  declineText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
})