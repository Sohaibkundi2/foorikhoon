// src/components/WeeklyHeroes.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native'
import { Droplet } from 'lucide-react-native'
import api from '../lib/api'
import { Skeleton } from './fk'
import { color, font, radius, bloodLabel, tintFor, initialsFor } from '../theme'

interface Hero {
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
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
    /* A skeleton at the card's real height rather than a spinner in a box: the
       section keeps its place in the scroll, so nothing below it jumps when the
       response lands. */
    return (
      <View style={styles.card}>
        <Skeleton width={38} height={38} />
        <View style={{ flex: 1, gap: 9 }}>
          <Skeleton width="62%" height={13} />
          <Skeleton width="40%" height={10} />
        </View>
      </View>
    )
  }

  if (heroes.length === 0) return null

  return (
    <View>
      {/* The caller supplies the section heading; this row carries the two
          things it can't — what the ordering means, and where you are in it. */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Ranked by commitment score</Text>
        <Text style={styles.counter}>
          {String(activeIndex + 1).padStart(2, '0')}
          <Text style={styles.counterDim}>{` / ${String(heroes.length).padStart(2, '0')}`}</Text>
        </Text>
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
        renderItem={({ item: hero, index }) => {
          const tint = tintFor(hero.name)
          return (
            <View style={{ width: CARD_WIDTH }}>
              <View style={styles.card}>
                {/* Square, not a circle. A round avatar beside a mono rank
                    numeral is the stock leaderboard row; the square keeps this
                    in the same family as the blood-group lattice. */}
                <View style={[styles.avatar, { backgroundColor: tint.bg }]}>
                  <Text style={[styles.avatarText, { color: tint.fg }]}>{initialsFor(hero.name)}</Text>
                </View>

                <View style={styles.infoWrap}>
                  <View style={styles.nameRow}>
                    <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.heroName} numberOfLines={1}>{hero.name}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.heroCity} numberOfLines={1}>{hero.city}</Text>
                    {hero.bloodGroup && (
                      <>
                        <View style={styles.metaDot} />
                        <Text style={styles.heroGroup}>{bloodLabel(hero.bloodGroup)}</Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreValue}>{hero.commitmentScore}</Text>
                  <View style={styles.scoreLabelRow}>
                    {/* Was a 🩸 glyph. Same meaning, and it inherits the
                        stroke weight every other icon in the app uses. */}
                    <Droplet size={9} color={color.faint} strokeWidth={2} />
                    <Text style={styles.scoreLabel}>Score</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        }}
      />

      {heroes.length > 1 && (
        /* A segmented rail rather than dots: it shows how many there are at a
           glance, and each segment is a wider tap target than a 6px dot. */
        <View style={styles.rail}>
          {heroes.map((_, i) => (
            <Pressable key={i} onPress={() => goToIndex(i)} style={styles.railHit} hitSlop={6}>
              <View style={[styles.railSeg, i === activeIndex && styles.railSegOn]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  headerText: { fontFamily: font.sans.regular, fontSize: 12, color: color.faint },
  counter: {
    fontFamily: font.mono.medium, fontSize: 10.5, color: color.bone,
    letterSpacing: 0.6, fontVariant: ['tabular-nums'],
  },
  counterDim: { fontFamily: font.mono.regular, color: color.faint },

  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: font.mono.medium, fontSize: 14, letterSpacing: 0.4 },

  infoWrap: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  rank: { fontFamily: font.mono.regular, fontSize: 10, color: color.blood, letterSpacing: 0.4 },
  heroName: { flex: 1, fontFamily: font.sans.medium, fontSize: 15, color: color.bone, letterSpacing: -0.3 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 19 },
  heroCity: { fontFamily: font.sans.regular, fontSize: 12.5, color: color.mute, flexShrink: 1 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.faint },
  heroGroup: { fontFamily: font.mono.medium, fontSize: 12, color: color.bloodLite, letterSpacing: -0.2 },

  scoreWrap: { alignItems: 'flex-end' },
  scoreValue: {
    fontFamily: font.mono.medium, fontSize: 20, color: color.bone,
    letterSpacing: -0.8, fontVariant: ['tabular-nums'],
  },
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  scoreLabel: {
    fontFamily: font.mono.regular, fontSize: 8.5, color: color.faint,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },

  rail: { flexDirection: 'row', gap: 4, marginTop: 14 },
  railHit: { flex: 1, paddingVertical: 6 },
  railSeg: { height: 2, borderRadius: 1, backgroundColor: color.line },
  railSegOn: { backgroundColor: color.blood },
})
