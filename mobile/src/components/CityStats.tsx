// src/components/CityStats.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../lib/api'

interface CityStat {
  city: string
  activeDonors: number
  activeRequests: number
}

function getColor(requests: number) {
  if (requests >= 5) return '#F87171' // high demand
  if (requests >= 2) return '#FB923C' // moderate
  return '#4ADE80' // low
}

function getLabel(requests: number) {
  if (requests >= 5) return 'High demand'
  if (requests >= 2) return 'Moderate'
  return 'Low demand'
}

export default function CityStats() {
  const [cities, setCities] = useState<CityStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/map/stats')
      .then(res => setCities(res.data.cities))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  if (cities.length === 0) return null

  // Sort busiest city first — most useful info up top
  const sorted = [...cities].sort((a, b) => b.activeRequests - a.activeRequests)

  return (
    <View>
      <View style={styles.list}>
        {sorted.map((city) => {
          const color = getColor(city.activeRequests)
          return (
            <View key={city.city} style={styles.card}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <View style={styles.cardTextWrap}>
                <Text style={styles.cityName}>{city.city}</Text>
                <Text style={[styles.demandLabel, { color }]}>{getLabel(city.activeRequests)}</Text>
              </View>
              <View style={styles.cardStats}>
                <View style={styles.cardStatItem}>
                  <Text style={[styles.cardStatValue, { color }]}>{city.activeRequests}</Text>
                  <Text style={styles.cardStatLabel}>requests</Text>
                </View>
                <View style={styles.cardStatItem}>
                  <Text style={[styles.cardStatValue, { color: '#4ADE80' }]}>{city.activeDonors}</Text>
                  <Text style={styles.cardStatLabel}>donors</Text>
                </View>
              </View>
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
          <Text style={styles.legendText}>High (5+)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
          <Text style={styles.legendText}>Moderate (2-4)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
          <Text style={styles.legendText}>Low (0-1)</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingBox: {
    height: 180,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  cardTextWrap: { flex: 1 },
  cityName: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600' },
  demandLabel: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  cardStats: { flexDirection: 'row', gap: 16 },
  cardStatItem: { alignItems: 'center' },
  cardStatValue: { fontSize: 17, fontWeight: '700' },
  cardStatLabel: { color: '#6B7280', fontSize: 10, marginTop: 1 },

  legendRow: { flexDirection: 'row', gap: 16, marginTop: 14, paddingLeft: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#6B7280', fontSize: 11.5 },
})