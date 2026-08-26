// src/components/Badges.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Modal, Pressable, Animated, Easing,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Crown, Droplet, Footprints, HeartPulse, Medal, Star, type LucideIcon,
} from 'lucide-react-native'

import { Button, Label } from './fk'
import { color, font, radius } from '../theme'

interface Badge {
  name: string
  /** Was an emoji string. Six emojis were the only pictures in the app. */
  icon: LucideIcon
  description: string
  /** One value from the shared palette instead of a per-badge hex and glow. */
  tint: string
}

/**
 * The six badges the backend can award, in the order a donor earns them. The
 * descriptions are unchanged — they state real thresholds, so rewording them
 * would risk describing rules the backend does not apply.
 *
 * Tints run neutral → red → amber → green → bone rather than six unrelated
 * hues; the previous set included a blue and a purple, which belong to no
 * colour family in the rest of the app.
 */
const BADGE_DATA: Record<string, Badge> = {
  'First Step': {
    name: 'First Step',
    icon: Footprints,
    description: 'You joined ForiKhoon as a donor. Welcome to the family.',
    tint: color.mute,
  },
  'First Blood': {
    name: 'First Blood',
    icon: Droplet,
    description: 'You accepted your first donation request. Someone needed you — and you showed up.',
    tint: color.bloodLite,
  },
  'Reliable': {
    name: 'Reliable',
    icon: Star,
    description: 'Your commitment score crossed 50. Hospitals trust you.',
    tint: color.warnLite,
  },
  'Dedicated': {
    name: 'Dedicated',
    icon: Medal,
    description: 'Commitment score above 80. You are one of our most dependable donors.',
    tint: color.warn,
  },
  'Lifesaver': {
    name: 'Lifesaver',
    icon: HeartPulse,
    description: 'You have accepted 5 or more donation requests. You have saved lives.',
    tint: color.lifeLite,
  },
  'Hero': {
    name: 'Hero',
    icon: Crown,
    description: 'Over 10 accepted requests. You are a hero of ForiKhoon.',
    tint: color.bone,
  },
}

/** Rank of each badge, used only for the numeral on the popup. */
const BADGE_ORDER = Object.keys(BADGE_DATA)

/**
 * Icon and tint for a badge name, for screens that list badges inline rather
 * than opening the popup (the donor dashboard shelf). Falls back to a neutral
 * medal so an unrecognised name from the API still renders.
 */
export function badgeMeta(name: string): { icon: LucideIcon; tint: string } {
  const badge = BADGE_DATA[name]
  if (badge) return { icon: badge.icon, tint: badge.tint }
  return { icon: Medal, tint: color.mute }
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

  const Icon = newBadge.icon
  const rank = BADGE_ORDER.indexOf(newBadge.name) + 1

  return (
    <Modal visible={!!newBadge} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        {/* Ranged left on a ruled card, no coloured drop shadow. The old sheet
            centred everything under an 84px glowing ring — the single most
            template-looking element in the app. */}
        <Animated.View style={[styles.popup, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.tick, { backgroundColor: newBadge.tint }]} />

          <View style={styles.head}>
            <Label loud>Badge earned</Label>
            <Text style={styles.rank}>
              {String(rank).padStart(2, '0')} / {String(BADGE_ORDER.length).padStart(2, '0')}
            </Text>
          </View>

          <View style={styles.nameRow}>
            <Icon size={22} color={newBadge.tint} strokeWidth={1.75} />
            <Text style={[styles.badgeName, { color: newBadge.tint }]}>
              {newBadge.name}
            </Text>
          </View>

          <Text style={styles.badgeDesc}>{newBadge.description}</Text>

          <Button tone="primary" full onPress={handleClose} style={{ marginTop: 22 }}>
            Got it
          </Button>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ── Badge shelf for profile screens ─────────────────────────────────────────
/**
 * One hairline row per badge instead of a grid of rounded tiles: the names run
 * to different lengths and the descriptions are the part worth reading.
 */
export function BadgeShelf({ badges }: { badges: string[] }) {
  if (!badges.length) return null

  return (
    <View>
      {badges.map((name) => {
        const badge = BADGE_DATA[name]
        if (!badge) return null
        const Icon = badge.icon
        return (
          <View key={name} style={styles.shelfRow}>
            <Icon size={16} color={badge.tint} strokeWidth={1.75} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.shelfName, { color: badge.tint }]}>{badge.name}</Text>
              <Text style={styles.shelfDesc}>{badge.description}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  popup: {
    width: '100%', maxWidth: 340,
    backgroundColor: color.raised,
    borderWidth: 1, borderColor: color.line,
    borderRadius: radius.lg,
    paddingHorizontal: 22, paddingBottom: 22,
    overflow: 'hidden',
  },
  tick: { height: 2, marginHorizontal: -22, marginBottom: 20 },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rank: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.faint, letterSpacing: 1,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  badgeName: {
    fontFamily: font.sans.semibold, fontSize: 24, letterSpacing: -1,
  },
  badgeDesc: {
    fontFamily: font.sans.regular, fontSize: 13.5, lineHeight: 20.5,
    color: color.mute, marginTop: 12,
  },

  // Shelf
  shelfRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  shelfName: {
    fontFamily: font.sans.medium, fontSize: 13.5, letterSpacing: -0.2,
  },
  shelfDesc: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 4,
  },
})
