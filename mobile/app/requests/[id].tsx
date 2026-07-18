import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import api from '../../src/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyColors: Record<string, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', text: '#F87171' },
  URGENT:   { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  text: '#FB923C' },
  NORMAL:   { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:   { bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.2)',  text: '#FACC15' },
  MATCHED:   { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  text: '#60A5FA' },
  FULFILLED: { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  text: '#4ADE80' },
  EXPIRED:   { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', text: '#6B7280' },
}

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
        message: `ForiKhoon — Blood request: ${request?.bloodGroup} needed at ${request?.hospital?.name}. Check it out on ForiKhoon app.`,
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#DC2626" size="large" />
      </View>
    )
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundIcon}>🩸</Text>
        <Text style={styles.notFoundTitle}>Request not found</Text>
        <Text style={styles.notFoundSub}>This request may have expired or been fulfilled.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>View all requests</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const urgency = urgencyColors[request.urgency] || urgencyColors.NORMAL
  const status = statusColors[request.status] || statusColors.PENDING

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.eyebrow}>BLOOD REQUEST</Text>
          <Text style={styles.hospitalName}>{request.hospital?.name}</Text>
          <Text style={styles.hospitalSub}>
            {request.hospital?.user?.city} · {request.hospital?.address}
          </Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Main card */}
      <View style={styles.card}>

        {/* Blood group + badges */}
        <View style={styles.cardTop}>
          <View style={styles.bloodGroupBox}>
            <Text style={styles.bloodGroupText}>
              {bloodGroupLabels[request.bloodGroup] || request.bloodGroup}
            </Text>
          </View>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
              <Text style={[styles.badgeText, { color: urgency.text }]}>{request.urgency}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
              <Text style={[styles.badgeText, { color: status.text }]}>{request.status}</Text>
            </View>
            {request.hospital?.verified && (
              <View style={[styles.badge, { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)' }]}>
                <Text style={[styles.badgeText, { color: '#4ADE80' }]}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>UNITS NEEDED</Text>
            <Text style={styles.statValue}>{request.units}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DONORS NOTIFIED</Text>
            <Text style={styles.statValue}>{request.matches?.length || 0}</Text>
          </View>
        </View>

        {/* Notes */}
        {request.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        )}
      </View>

      {/* Time info */}
      <View style={styles.timeCard}>
        <View>
          <Text style={styles.timeLabel}>Posted</Text>
          <Text style={styles.timeValue}>{dayjs(request.createdAt).fromNow()}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.timeLabel}>Expires</Text>
          <Text style={styles.timeValue}>
            {request.expiresAt ? dayjs(request.expiresAt).fromNow() : 'No expiry set'}
          </Text>
        </View>
      </View>

      {/* CTA */}
      {request.status === 'PENDING' ? (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>I can help — Register as donor</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fulfilledBox}>
          <Text style={styles.fulfilledText}>
            This request has been {request.status.toLowerCase()}.
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.fulfilledLink}>View other requests →</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 48 },

  center: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundIcon: { fontSize: 48, marginBottom: 16 },
  notFoundTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  notFoundSub: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  backBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerInfo: { flex: 1, marginRight: 12 },
  eyebrow: { color: '#DC2626', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  hospitalName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  hospitalSub: { color: '#9CA3AF', fontSize: 12 },
  shareBtn: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  shareBtnText: { color: '#9CA3AF', fontSize: 12 },

  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 16, padding: 18, marginBottom: 12 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  bloodGroupBox: {
    width: 64, height: 64, borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bloodGroupText: { color: '#DC2626', fontSize: 22, fontWeight: '800' },
  badgesRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  statsRow: { flexDirection: 'row', backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 12 },
  statBox: { flex: 1, padding: 16, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#1A1A1A', marginVertical: 12 },
  statLabel: { color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  statValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },

  notesBox: { marginTop: 14, backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 10, padding: 14 },
  notesLabel: { color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  notesText: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },

  timeCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timeDivider: { width: 1, height: 40, backgroundColor: '#222' },
  timeLabel: { color: '#6B7280', fontSize: 10, marginBottom: 4 },
  timeValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  ctaBtn: { backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  fulfilledBox: { alignItems: 'center', paddingVertical: 16 },
  fulfilledText: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  fulfilledLink: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
})