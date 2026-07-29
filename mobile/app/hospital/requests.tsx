// app/hospital/requests.tsx
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, ScrollView
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

interface Match {
  id: string
  donorId: string
  status: string
  donorContact?: { name: string; phone: string | null } | null
}

interface BloodRequest {
  id: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
  matches: Match[]
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const urgencyStyle: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  URGENT: { text: '#FB923C', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
  NORMAL: { text: '#4ADE80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' },
}

const statusStyle: Record<string, { text: string; bg: string; border: string }> = {
  PENDING: { text: '#FACC15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)' },
  MATCHED: { text: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  FULFILLED: { text: '#4ADE80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)' },
  EXPIRED: { text: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
}

type Tab = 'ALL' | 'PENDING' | 'MATCHED' | 'FULFILLED' | 'EXPIRED'
const TABS: Tab[] = ['ALL', 'PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

export default function HospitalRequestsScreen() {
  const { user } = useAuthStore()

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('ALL')
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
    fetchRequests()
  }, [user])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/hospital/requests')
      setRequests(res.data.requests)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRequests()
  }, [])

const handleFulfill = async (requestId: string) => {
  setUpdatingKey(`${requestId}-fulfill`)
  try {
    await api.put(`/api/hospital/requests/${requestId}/fulfill`)
    await fetchRequests()
  } catch (err) {
    console.error(err)
  } finally {
    setUpdatingKey(null)
  }
}

const handleCancel = async (requestId: string) => {
  setUpdatingKey(`${requestId}-cancel`)
  try {
    await api.put(`/api/requests/${requestId}`, { newStatus: 'EXPIRED' })
    await fetchRequests()
  } catch (err) {
    console.error(err)
  } finally {
    setUpdatingKey(null)
  }
}

const handleNoShow = async (matchId: string) => {
  setUpdatingKey(`${matchId}-noshow`)
  try {
    await api.patch(`/api/hospital/matches/${matchId}/no-show`)
    await fetchRequests()
  } catch (err) {
    console.error(err)
  } finally {
    setUpdatingKey(null)
  }
}

const getAcceptedMatch = (req: BloodRequest) =>
  req.matches?.find(m => m.status === 'ACCEPTED')

const getAcceptedContact = (req: BloodRequest) =>
req.matches?.find(m => m.status === 'ACCEPTED')?.donorContact

  const filteredRequests = activeTab === 'ALL'
    ? requests
    : requests.filter(r => r.status === activeTab)

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>HOSPITAL</Text>
        <Text style={styles.title}>Blood Requests</Text>
        <Text style={styles.subtitle}>View and manage all blood requests you've posted.</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => {
          const count = tab === 'ALL' ? requests.length : requests.filter(r => r.status === tab).length
          const active = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No requests in this category.</Text>
          </View>
        }
        renderItem={({ item: req }) => {
          const urg = urgencyStyle[req.urgency] ?? urgencyStyle.NORMAL
          const st = statusStyle[req.status] ?? statusStyle.PENDING
          const canAct = req.status === 'PENDING' || req.status === 'MATCHED'
          const acceptedMatch = getAcceptedMatch(req)
          const acceptedContact = getAcceptedContact(req)
          return (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.blood}>
                  {bloodGroupLabels[req.bloodGroup] || req.bloodGroup}
                </Text>
                <View style={styles.pillRow}>
                  <View style={[styles.pill, { backgroundColor: urg.bg, borderColor: urg.border }]}>
                    <Text style={[styles.pillText, { color: urg.text }]}>{req.urgency}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.pillText, { color: st.text }]}>{req.status}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.detail}>
                {req.units} unit{req.units > 1 ? 's' : ''} needed
                {req.notes ? ` · ${req.notes}` : ''}
              </Text>
              <Text style={styles.meta}>
                {req.matches?.length ?? 0} donor{req.matches?.length !== 1 ? 's' : ''} matched ·{' '}
                {new Date(req.createdAt).toLocaleDateString()}
              </Text>

                    {req.status === 'MATCHED' && acceptedMatch && (
                      acceptedContact ? (
                        <Text style={styles.acceptedContact}>
                          ✓ Accepted by {acceptedContact.name}
                          {acceptedContact.phone ? ` · ${acceptedContact.phone}` : ''}
                        </Text>
                      ) : (
                        <Text style={styles.acceptedNoContact}>
                          ✓ Accepted — contact info not shared
                        </Text>
                      )
                    )}

              {canAct && (
                <View style={styles.actionsRow}>
                  {req.status === 'MATCHED' && (
                    <TouchableOpacity
                      onPress={() => handleFulfill(req.id)}
                      disabled={updatingKey === `${req.id}-fulfill`}
                      style={[styles.actionBtn, styles.fulfillBtn]}
                    >
                      {updatingKey === `${req.id}-fulfill` ? (
                        <ActivityIndicator size="small" color="#4ADE80" />
                      ) : (
                        <Text style={styles.fulfillText}>Mark Fulfilled</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {req.status === 'MATCHED' && getAcceptedMatch(req) && (
                    <TouchableOpacity
                      onPress={() => handleNoShow(getAcceptedMatch(req)!.id)}
                      disabled={updatingKey === `${getAcceptedMatch(req)!.id}-noshow`}
                      style={[styles.actionBtn, styles.noShowBtn]}
                    >
                      {updatingKey === `${getAcceptedMatch(req)!.id}-noshow` ? (
                        <ActivityIndicator size="small" color="#F87171" />
                      ) : (
                        <Text style={styles.noShowText}>Report No-Show</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleCancel(req.id)}
                    disabled={updatingKey === `${req.id}-cancel`}
                    style={[styles.actionBtn, styles.cancelBtn]}
                  >
                    {updatingKey === `${req.id}-cancel` ? (
                      <ActivityIndicator size="small" color="#9CA3AF" />
                    ) : (
                      <Text style={styles.cancelText}>Cancel</Text>
                    )}
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
  tabButton: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  noShowBtn: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.2)' },
  noShowText: { color: '#F87171', fontSize: 12, fontWeight: '600' },
  tabButtonActive: { borderBottomColor: '#DC2626' },
  tabText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },

  listContent: { padding: 16, paddingBottom: 40 },

  emptyCard: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 32, alignItems: 'center',
  },
  emptyText: { color: '#6B7280', fontSize: 13 },

  card: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  blood: { color: '#DC2626', fontSize: 20, fontWeight: '700' },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 1 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10.5, fontWeight: '600' },

  detail: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  meta: { color: '#6B7280', fontSize: 12, marginBottom: 10 },

  acceptedContact: { color: '#4ADE80', fontSize: 12, marginBottom: 10 },
  acceptedNoContact: { color: '#6B7280', fontSize: 12, marginBottom: 10 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fulfillBtn: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)' },
  fulfillText: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
  cancelBtn: { backgroundColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.2)' },
  cancelText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
})