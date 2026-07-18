// src/components/WeeklyHeroes.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Dimensions, TouchableOpacity
} from 'react-native'
import api from '../lib/api'

interface Hero {
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const avatarPalettes = [
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#F87171' },
  { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  text: '#FB923C' },
  { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  text: '#4ADE80' },
  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  text: '#60A5FA' },
  { bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)', text: '#C084FC' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getPalette(name: string) {
  const index = name.charCodeAt(0) % avatarPalettes.length
  return avatarPalettes[index]
}

const CARD_WIDTH = Dimensions.get('window').width - 40 // matches 20px screen padding each side

export default function WeeklyHeroes() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<FlatList>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get('/api/map/weekly-heroes')
      .then(res => setHeroes(res.data.heroes))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (heroes.length <= 1) return

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % heroes.length
        listRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [heroes])

  const goToIndex = (i: number) => {
    setActiveIndex(i)
    listRef.current?.scrollToIndex({ index: i, animated: true })
  }

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  if (heroes.length === 0) return null

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>This week's heroes</Text>
        <Text style={styles.count}>{heroes.length} donor{heroes.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={heroes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH)
          setActiveIndex(i)
        }}
        getItemLayout={(_, index) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * index, index })}
        renderItem={({ item: hero }) => {
          const palette = getPalette(hero.name)
          return (
            <View style={{ width: CARD_WIDTH }}>
              <View style={styles.card}>
                <View style={[styles.avatar, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <Text style={[styles.avatarText, { color: palette.text }]}>{getInitials(hero.name)}</Text>
                </View>

                <View style={styles.infoWrap}>
                  <Text style={styles.heroName} numberOfLines={1}>{hero.name}</Text>
                  <Text style={styles.heroCity}>{hero.city}</Text>
                  <View style={styles.metaRow}>
                    {hero.bloodGroup && (
                      <View style={styles.bloodPill}>
                        <Text style={styles.bloodPillText}>
                          {bloodGroupLabels[hero.bloodGroup] || hero.bloodGroup}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.scoreText}>
                      Score: <Text style={styles.scoreValue}>{hero.commitmentScore}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeEmoji}>🩸</Text>
                  <Text style={styles.badgeLabel}>Donated</Text>
                </View>
              </View>
            </View>
          )
        }}
      />

      {heroes.length > 1 && (
        <View style={styles.dotsRow}>
          {heroes.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToIndex(i)}>
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  loadingBox: {
    height: 128,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  count: { color: '#6B7280', fontSize: 11.5 },

  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700' },

  infoWrap: { flex: 1, minWidth: 0 },
  heroName: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '700' },
  heroCity: { color: '#9CA3AF', fontSize: 12.5, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bloodPill: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  bloodPillText: { color: '#F87171', fontSize: 11.5, fontWeight: '700' },
  scoreText: { color: '#6B7280', fontSize: 11.5 },
  scoreValue: { color: '#FFFFFF', fontWeight: '700' },

  badgeWrap: { alignItems: 'center' },
  badgeEmoji: { fontSize: 22 },
  badgeLabel: { color: '#F87171', fontSize: 10.5, fontWeight: '700', marginTop: 3 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { width: 16, backgroundColor: '#DC2626' },
})