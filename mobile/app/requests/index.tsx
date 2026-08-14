import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share, FlatList
} from 'react-native'
import { router } from 'expo-router'
import api from '../../src/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

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

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyStyle: Record<string, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', text: '#F87171' },
  URGENT: { bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)', text: '#FB923C' },
  NORMAL: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)', text: '#4ADE80' },
}

const urgencyOrder: Record<string, number> = { CRITICAL: 0, URGENT: 1, NORMAL: 2 }

const bloodGroups = ['ALL', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const urgencies = ['ALL', 'CRITICAL', 'URGENT', 'NORMAL']

export default function RequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('ALL')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<'city' | 'blood' | 'urgency' | null>(null)

  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)

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
      message: `ForiKhoon — ${bloodGroupLabels[req.bloodGroup]} blood needed at ${req.hospital?.name} in ${req.hospital?.user?.city}. Download ForiKhoon to help!`
    })
  }

  const renderFilterRow = (
    label: string,
    key: 'city' | 'blood' | 'urgency',
    options: string[],
    current: string,
    setter: (v: string) => void,
    labelFn?: (v: string) => string
  ) => (
    <View style={styles.filterGroup}>
      <TouchableOpacity
        style={[styles.filterBtn, activeFilter === key && styles.filterBtnActive]}
        onPress={() => setActiveFilter(activeFilter === key ? null : key)}
      >
        <Text style={styles.filterBtnText}>
          {current === 'ALL' ? label : (labelFn ? labelFn(current) : current)}
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
            >
              <Text style={[styles.dropdownText, current === opt && styles.dropdownTextActive]}>
                {opt === 'ALL' ? `All ${label}` : (labelFn ? labelFn(opt) : opt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <View style={styles.screen}>

      {!isOnline && <OfflineBanner lastUpdated={cacheTime} />}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LIVE</Text>
        <Text style={styles.title}>Blood Requests</Text>
        <Text style={styles.subtitle}>Active requests from hospitals across Pakistan.</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {renderFilterRow('Cities', 'city', cities, cityFilter, setCityFilter)}
        {renderFilterRow('Blood Group', 'blood', bloodGroups, bloodGroupFilter, setBloodGroupFilter,
          v => v === 'ALL' ? 'All Blood Groups' : bloodGroupLabels[v])}
        {renderFilterRow('Urgency', 'urgency', urgencies, urgencyFilter, setUrgencyFilter)}
        {hasFilters && (
          <TouchableOpacity onPress={() => { setCityFilter('ALL'); setBloodGroupFilter('ALL'); setUrgencyFilter('ALL') }}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#DC2626" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🩸</Text>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptySub}>{hasFilters ? 'Try changing your filters.' : 'No active requests right now.'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: req }) => {
            const u = urgencyStyle[req.urgency] || urgencyStyle.NORMAL
            const isCritical = req.urgency === 'CRITICAL'
            return (
              <TouchableOpacity
                style={[styles.card, isCritical && styles.cardCritical]}
                onPress={() => router.push(`/requests/${req.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>

                  {/* Blood group box */}
                  <View style={styles.bloodBox}>
                    <Text style={styles.bloodBoxText}>
                      {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.hospitalName} numberOfLines={1}>{req.hospital?.name}</Text>
                      {req.hospital?.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>✓</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.hospitalSub} numberOfLines={1}>
                      {req.hospital?.user?.city} · {req.hospital?.address}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={[styles.urgencyBadge, { backgroundColor: u.bg, borderColor: u.border }]}>
                        <Text style={[styles.urgencyText, { color: u.text }]}>{req.urgency}</Text>
                      </View>
                      <Text style={styles.metaText}>{req.units} unit{req.units !== 1 ? 's' : ''}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>{dayjs(req.createdAt).fromNow()}</Text>
                    </View>

                    {req.notes && (
                      <Text style={styles.notes} numberOfLines={1}>"{req.notes}"</Text>
                    )}
                  </View>

                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => router.push('/register')}
                  >
                    <Text style={styles.helpBtnText}>I can help</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleShare(req)}
                  >
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  eyebrow: { color: '#DC2626', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#9CA3AF', fontSize: 13 },

  filtersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexWrap: 'wrap' },
  filterGroup: { position: 'relative' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  filterBtnActive: { borderColor: '#DC2626' },
  filterBtnText: { color: '#9CA3AF', fontSize: 12 },
  filterArrow: { color: '#555', fontSize: 8 },
  dropdown: { position: 'absolute', top: 36, left: 0, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, zIndex: 100, minWidth: 140, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: '#DC262615' },
  dropdownText: { color: '#9CA3AF', fontSize: 13 },
  dropdownTextActive: { color: '#DC2626', fontWeight: '600' },
  clearText: { color: '#DC2626', fontSize: 12, paddingVertical: 7 },

  count: { color: '#6B7280', fontSize: 11, paddingHorizontal: 20, marginBottom: 8 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: '#6B7280', fontSize: 13, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 14, padding: 14 },
  cardCritical: { borderColor: 'rgba(248,113,113,0.25)' },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },

  bloodBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bloodBoxText: { color: '#DC2626', fontSize: 16, fontWeight: '800' },

  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  hospitalName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 },
  verifiedBadge: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedText: { color: '#4ADE80', fontSize: 9, fontWeight: '700' },
  hospitalSub: { color: '#9CA3AF', fontSize: 11, marginBottom: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  urgencyBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  urgencyText: { fontSize: 10, fontWeight: '600' },
  metaText: { color: '#6B7280', fontSize: 11 },
  metaDot: { color: '#333', fontSize: 11 },
  notes: { color: '#9CA3AF', fontSize: 11, marginTop: 4, fontStyle: 'italic' },

  cardActions: { flexDirection: 'row', gap: 8 },
  helpBtn: { flex: 1, backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  helpBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  shareBtn: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center' },
  shareBtnText: { color: '#9CA3AF', fontSize: 12 },
})