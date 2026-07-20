// src/components/Badges.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Animated, Easing, Platform
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface Badge {
  name: string
  icon: string
  description: string
  color: string
  glow: string
}

const BADGE_DATA: Record<string, Badge> = {
  'First Step': {
    name: 'First Step',
    icon: '✅',
    description: 'You joined ForiKhoon as a donor. Welcome to the family.',
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.25)',
  },
  'First Blood': {
    name: 'First Blood',
    icon: '🩸',
    description: 'You accepted your first donation request. Someone needed you — and you showed up.',
    color: '#F87171',
    glow: 'rgba(248,113,113,0.25)',
  },
  'Reliable': {
    name: 'Reliable',
    icon: '⭐',
    description: 'Your commitment score crossed 50. Hospitals trust you.',
    color: '#FACC15',
    glow: 'rgba(250,204,21,0.25)',
  },
  'Dedicated': {
    name: 'Dedicated',
    icon: '🏆',
    description: 'Commitment score above 80. You are one of our most dependable donors.',
    color: '#FB923C',
    glow: 'rgba(251,146,60,0.25)',
  },
  'Lifesaver': {
    name: 'Lifesaver',
    icon: '💉',
    description: 'You have accepted 5 or more donation requests. You have saved lives.',
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.25)',
  },
  'Hero': {
    name: 'Hero',
    icon: '🦸',
    description: 'Over 10 accepted requests. You are a hero of ForiKhoon.',
    color: '#C084FC',
    glow: 'rgba(192,132,252,0.25)',
  },
}

interface BadgePopupProps {
  badges: string[]
  donorId: string
}

export default function BadgePopup({ badges, donorId }: BadgePopupProps) {
  const [newBadge, setNewBadge] = useState<Badge | null>(null)
  const [visible, setVisible] = useState(false)
  const scale = useRef(new Animated.Value(0.85)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!badges.length || !donorId) return

    const storageKey = `forikhoon-badges-${donorId}`

    AsyncStorage.getItem(storageKey).then((raw) => {
      const seen: string[] = raw ? JSON.parse(raw) : []
      const earned = badges.find((b) => !seen.includes(b))
      if (earned && BADGE_DATA[earned]) {
        setNewBadge(BADGE_DATA[earned])
        setVisible(true)
      }
    })
  }, [badges, donorId])

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  const handleClose = async () => {
    if (!donorId || !newBadge) return

    const storageKey = `forikhoon-badges-${donorId}`
    const raw = await AsyncStorage.getItem(storageKey)
    const seen: string[] = raw ? JSON.parse(raw) : []
    await AsyncStorage.setItem(storageKey, JSON.stringify([...seen, newBadge.name]))

    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false)
      setNewBadge(null)
      scale.setValue(0.85)
      opacity.setValue(0)
    })
  }

  if (!newBadge) return null

  return (
    <Modal visible={!!newBadge} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.popup,
            { opacity, transform: [{ scale }], shadowColor: newBadge.color },
          ]}
        >
          <Text style={styles.eyebrow}>BADGE EARNED</Text>

          <View style={[styles.iconRing, { borderColor: newBadge.glow }]}>
            <Text style={styles.iconText}>{newBadge.icon}</Text>
          </View>

          <Text style={[styles.badgeName, { color: newBadge.color }]}>{newBadge.name}</Text>
          <Text style={styles.badgeDesc}>{newBadge.description}</Text>

          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ── Badge shelf for profile screens ─────────────────────────────────────────
export function BadgeShelf({ badges }: { badges: string[] }) {
  if (!badges.length) return null

  return (
    <View style={styles.shelfGrid}>
      {badges.map((name) => {
        const badge = BADGE_DATA[name]
        if (!badge) return null
        return (
          <View key={name} style={styles.shelfTile}>
            <Text style={styles.shelfIcon}>{badge.icon}</Text>
            <Text style={[styles.shelfName, { color: badge.color }]} numberOfLines={1}>
              {badge.name}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  popup: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 16 },
    }),
  },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 20 },

  iconRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconText: { fontSize: 38 },

  badgeName: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  badgeDesc: { color: '#9CA3AF', fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  closeBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13, width: '100%', alignItems: 'center' },
  closeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Shelf
  shelfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shelfTile: {
    width: '31%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shelfIcon: { fontSize: 26, marginBottom: 8 },
  shelfName: { fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
})