// app/hospital/analytics.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Easing
} from 'react-native'
import { router, Link } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

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

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

function getInventoryStyle(units: number) {
  if (units === 0) return { text: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', label: 'Out of stock' }
  if (units < 5) return { text: '#FB923C', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', label: 'Critical' }
  if (units < 10) return { text: '#FACC15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)', label: 'Low' }
  return { text: '#4ADE80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', label: 'Good' }
}

function usePulse() {
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return pulse
}

export default function HospitalAnalyticsScreen() {
  const { user } = useAuthStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const pulse = usePulse()

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
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  if (!analytics) return null

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <Link href="/hospital/dashboard" asChild>
        <TouchableOpacity style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to dashboard</Text>
        </TouchableOpacity>
      </Link>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>HOSPITAL</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Overview of your blood request activity and inventory.</Text>
      </View>

      {/* Low stock alert */}
      {analytics.lowStock.length > 0 && (
        <View style={styles.lowStockCard}>
          <View style={styles.lowStockHeader}>
            <Animated.View style={[styles.lowStockDot, { opacity: pulse }]} />
            <Text style={styles.lowStockTitle}>Low Stock Alert</Text>
          </View>
          <Text style={styles.lowStockDesc}>
            {analytics.lowStock.length} blood group{analytics.lowStock.length !== 1 ? 's' : ''} running low. Consider restocking soon.
          </Text>
          <View style={styles.lowStockPillRow}>
            {analytics.lowStock.map((item) => (
              <View key={item.id} style={styles.lowStockPill}>
                <Text style={styles.lowStockPillText}>
                  {bloodGroupLabels[item.bloodGroup]} — {item.units} units
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>THIS MONTH</Text>
          <Text style={styles.statValue}>{analytics.totalRequestsThisMonth}</Text>
          <Text style={styles.statSub}>requests posted</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL</Text>
          <Text style={styles.statValue}>{analytics.totalRequests}</Text>
          <Text style={styles.statSub}>all time requests</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>FULFILLED</Text>
          <Text style={[styles.statValue, { color: '#4ADE80' }]}>{analytics.fulfilled}</Text>
          <Text style={styles.statSub}>donations completed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SUCCESS RATE</Text>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{analytics.fulfillmentRate}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${analytics.fulfillmentRate}%` }]} />
          </View>
        </View>
      </View>

      {/* Most requested */}
      {analytics.mostRequested && (
        <View style={styles.card}>
          <Text style={styles.eyebrowSmall}>MOST REQUESTED BLOOD GROUP</Text>
          <View style={styles.mostRequestedRow}>
            <View style={styles.mostRequestedIcon}>
              <Text style={styles.mostRequestedIconText}>
                {bloodGroupLabels[analytics.mostRequested]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mostRequestedTitle}>
                {bloodGroupLabels[analytics.mostRequested]} Blood
              </Text>
              <Text style={styles.mostRequestedDesc}>Most frequently needed at your hospital</Text>
            </View>
          </View>
        </View>
      )}

      {/* Inventory overview */}
      <View style={styles.card}>
        <View style={styles.inventoryHeader}>
          <Text style={styles.eyebrowSmall}>INVENTORY STATUS</Text>
          <Link href="/hospital/inventory" asChild>
            <TouchableOpacity>
              <Text style={styles.manageLink}>Manage →</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <View style={styles.inventoryGrid}>
          {analytics.inventory.map((item) => {
            const s = getInventoryStyle(item.units)
            return (
              <View key={item.id} style={[styles.inventoryTile, { backgroundColor: s.bg, borderColor: s.border }]}>
                <Text style={[styles.inventoryGroup, { color: s.text }]}>
                  {bloodGroupLabels[item.bloodGroup]}
                </Text>
                <Text style={[styles.inventoryUnits, { color: s.text }]}>{item.units}</Text>
                <Text style={[styles.inventoryLabel, { color: s.text }]}>{s.label}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F0F0F' },
  content: { padding: 20, paddingBottom: 48 },
  centerScreen: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center' },

  backLink: { marginBottom: 16 },
  backLinkText: { color: '#6B7280', fontSize: 12 },

  header: { marginBottom: 20 },
  eyebrow: { color: '#DC2626', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  // Low stock
  lowStockCard: {
    backgroundColor: 'rgba(251,146,60,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.2)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  lowStockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  lowStockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FB923C', marginRight: 8 },
  lowStockTitle: { color: '#FB923C', fontSize: 14, fontWeight: '700' },
  lowStockDesc: { color: '#9CA3AF', fontSize: 12.5, marginBottom: 10 },
  lowStockPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lowStockPill: {
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.25)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  lowStockPillText: { color: '#FB923C', fontSize: 11.5, fontWeight: '600' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47.5%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { color: '#6B7280', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
  statValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  statSub: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  progressTrack: { height: 4, backgroundColor: '#222', borderRadius: 99, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#DC2626', borderRadius: 99 },

  // Generic card
  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  eyebrowSmall: { color: '#6B7280', fontSize: 10.5, letterSpacing: 1.5, fontWeight: '600', marginBottom: 14 },

  // Most requested
  mostRequestedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mostRequestedIcon: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  mostRequestedIconText: { color: '#DC2626', fontSize: 22, fontWeight: '700' },
  mostRequestedTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  mostRequestedDesc: { color: '#9CA3AF', fontSize: 12.5, marginTop: 3 },

  // Inventory
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  manageLink: { color: '#9CA3AF', fontSize: 12.5, marginBottom: 14 },
  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inventoryTile: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inventoryGroup: { fontSize: 16, fontWeight: '700' },
  inventoryUnits: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  inventoryLabel: { fontSize: 10.5, marginTop: 3, opacity: 0.85 },
})