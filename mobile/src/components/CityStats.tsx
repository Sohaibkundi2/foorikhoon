// src/components/CityStats.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import api from '../lib/api'
import { Skeleton, SegmentMeter } from './fk'
import { color, wash, font, type Tone } from '../theme'

interface CityStat {
  city: string
  activeDonors: number
  activeRequests: number
}

/**
 * The thresholds are unchanged from the previous version — 5+ high, 2–4
 * moderate, 0–1 low — and they are stated in the footnote rather than left for
 * the reader to infer from a colour. A legend that only shows swatches makes
 * the reader guess what the boundary is.
 */
function demandTone(requests: number): Tone {
  if (requests >= 5) {
    return { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'High demand' }
  }
  if (requests >= 2) {
    return { fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Moderate' }
  }
  return { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Low demand' }
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
      <View style={{ gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.row}>
            <Skeleton width="34%" height={13} />
            <View style={{ flex: 1 }} />
            <Skeleton width={54} height={13} />
          </View>
        ))}
      </View>
    )
  }

  if (cities.length === 0) return null

  // Sort busiest city first — most useful info up top
  const sorted = [...cities].sort((a, b) => b.activeRequests - a.activeRequests)

  /* The meter is scaled to the busiest city in this response, so the bars
     compare cities to each other. Labelled as such in the footnote — a bar with
     no stated ceiling implies an absolute scale that doesn't exist. */
  const peak = Math.max(1, sorted[0].activeRequests)

  return (
    <View>
      {/* Column heads. The table has three columns and they need naming once —
          otherwise two adjacent figures per row are ambiguous. */}
      <View style={[styles.row, styles.head]}>
        <Text style={[styles.colLabel, { flex: 1 }]}>City</Text>
        <Text style={[styles.colLabel, styles.numCol]}>Req</Text>
        <Text style={[styles.colLabel, styles.numCol]}>Donors</Text>
      </View>

      {sorted.map((city) => {
        const tone = demandTone(city.activeRequests)
        return (
          <View key={city.city} style={styles.row}>
            <View style={styles.cityCol}>
              <View style={styles.cityNameRow}>
                <View style={[styles.dot, { backgroundColor: tone.fg }]} />
                <Text style={styles.cityName} numberOfLines={1}>{city.city}</Text>
              </View>
              <Text style={[styles.demandLabel, { color: tone.fg }]}>{tone.label}</Text>
              <SegmentMeter
                value={city.activeRequests}
                max={peak}
                segments={8}
                tint={tone.fg}
                style={styles.meter}
              />
            </View>

            <Text style={[styles.num, styles.numCol, { color: tone.fg }]}>{city.activeRequests}</Text>
            <Text style={[styles.num, styles.numCol]}>{city.activeDonors}</Text>
          </View>
        )
      })}

      <Text style={styles.footnote}>
        Demand tier is set by active requests: 5 or more is high, 2–4 moderate, 0–1 low.
        Bars are relative to {sorted[0].city}, the busiest city in this response.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  /* Rows divided by hairlines instead of being separate cards. Eight cities as
     eight floating panels is a lot of border for very little data. */
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    paddingVertical: 14,
  },
  head: { borderTopWidth: 0, paddingTop: 0, paddingBottom: 10, alignItems: 'center' },
  colLabel: {
    fontFamily: font.mono.regular, fontSize: 8.5, color: color.faint,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  cityCol: { flex: 1, minWidth: 0 },
  cityNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cityName: { flex: 1, fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.3 },
  demandLabel: {
    fontFamily: font.mono.regular, fontSize: 9, letterSpacing: 1.1,
    textTransform: 'uppercase', marginTop: 5, marginLeft: 14,
  },
  meter: { marginTop: 9, marginLeft: 14, maxWidth: 132 },

  numCol: { width: 46, textAlign: 'right' },
  num: {
    fontFamily: font.mono.medium, fontSize: 16, color: color.bone,
    letterSpacing: -0.4, fontVariant: ['tabular-nums'],
  },

  footnote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 16,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingTop: 14,
  },
})
