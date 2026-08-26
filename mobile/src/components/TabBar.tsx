/**
 * ForiKhoon bottom tab bar
 * ---------------------------------------------------------------------------
 * Replaces the hamburger drawer that used to sit in the Stack header. A drawer
 * costs two taps and hides where you are; a bar costs one and shows it.
 *
 * Three decisions worth recording:
 *
 * 1. It is an OVERLAY, not an expo-router `(tabs)` group. The app has three
 *    roles with three different destination sets, and a `<Tabs>` layout wants
 *    one fixed screen list — you end up with `href: null` on the screens the
 *    current role can't see, and every route file moves into a group directory.
 *    Rendering the bar above the existing Stack keeps all seventeen route paths
 *    exactly where they are, which also means every `router.push('/donor/...')`
 *    call and every deep link in the notification payloads still resolves.
 *    The cost is real and accepted: switching tabs re-mounts the screen, so
 *    each one refetches. Every one of these screens is a data screen that
 *    fetches on mount anyway, and `src/lib/cache.ts` covers the offline case.
 *
 * 2. The active marker is a hairline on the top rule, not a pill behind the
 *    icon. A filled rounded pill is what every stock tab bar does; a 2px red
 *    rule sliding along the top edge is the same vocabulary as the section
 *    rules and page-head ticks used across both clients.
 *
 * 3. The centre slot is a raised square-ish button, not a circle — the ask was
 *    for the WhatsApp/YouTube shape of bar, and the emphasised centre is where
 *    the role's one flagship action goes: post a request if you're a hospital,
 *    answer a match if you're a donor, register if you're a guest. It is never
 *    a decorative "+" that opens a menu.
 *
 * No blur. The web design rules this app follows exclude glassmorphism, and a
 * frosted bar over a near-black ground reads as muddy grey anyway.
 */

import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  House, Siren, Droplet, Trophy, UserRound, Plus, Package, LayoutDashboard,
  LogIn, UserPlus, type LucideIcon,
} from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { color, wash, font, TAB_BAR_HEIGHT } from '../theme'

interface TabItem {
  href: string
  label: string
  icon: LucideIcon
  /** Raised centre slot. Exactly one per role, or none. */
  center?: boolean
  /** Extra paths that should light this tab up — detail routes under it. */
  also?: string[]
}

/* ---------------------------------------------------------------------------
   Destinations per role. Every href below is a route that already exists in
   `app/`; nothing here links to a screen that hasn't been built.
--------------------------------------------------------------------------- */

const DONOR_TABS: TabItem[] = [
  { href: '/donor/dashboard', label: 'Home', icon: House },
  { href: '/requests', label: 'Requests', icon: Siren, also: ['/requests/'] },
  // A donor's flagship action is answering a match, not browsing.
  { href: '/donor/matches', label: 'Matches', icon: Droplet, center: true },
  { href: '/leaderboard', label: 'Heroes', icon: Trophy },
  { href: '/donor/profile', label: 'Profile', icon: UserRound },
]

const HOSPITAL_TABS: TabItem[] = [
  { href: '/hospital/dashboard', label: 'Home', icon: House },
  { href: '/hospital/requests', label: 'Requests', icon: Siren },
  // The YouTube-upload position, holding the thing a hospital opens the app to do.
  { href: '/hospital/request/new', label: 'New', icon: Plus, center: true },
  { href: '/hospital/inventory', label: 'Stock', icon: Package },
  { href: '/hospital/profile', label: 'Profile', icon: UserRound },
]

/* Admin has one screen of its own, so the bar carries it plus the two public
   boards rather than padding itself out with links that don't exist. */
const ADMIN_TABS: TabItem[] = [
  { href: '/requests', label: 'Requests', icon: Siren, also: ['/requests/'] },
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, center: true },
  { href: '/leaderboard', label: 'Heroes', icon: Trophy },
]

const PUBLIC_TABS: TabItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/requests', label: 'Requests', icon: Siren, also: ['/requests/'] },
  { href: '/register', label: 'Join', icon: UserPlus, center: true },
  { href: '/leaderboard', label: 'Heroes', icon: Trophy },
  { href: '/login', label: 'Sign in', icon: LogIn },
]

/**
 * Screens the bar stays out of. Both are entry flows that own the whole screen
 * and have their own way back; a bar offering four other destinations mid-form
 * is an invitation to lose what you typed.
 *
 * Guests are the exception: for them Sign in and Join *are* tabs, so the bar
 * stays up and simply shows which one is active.
 */
const AUTH_ROUTES = ['/login', '/register']

export default function TabBar() {
  const { user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const tabs =
    user?.role === 'DONOR' ? DONOR_TABS
    : user?.role === 'HOSPITAL' ? HOSPITAL_TABS
    : user?.role === 'ADMIN' ? ADMIN_TABS
    : PUBLIC_TABS

  const activeIndex = tabs.findIndex((t) => (
    pathname === t.href || (t.also ?? []).some((p) => pathname.startsWith(p))
  ))

  /* Slot width is measured, not assumed: the admin bar has three slots and the
     others five, and the marker has to land on the right one either way. */
  const slot = useSharedValue(0)
  const marker = useSharedValue(0)

  useEffect(() => {
    if (activeIndex >= 0) {
      marker.value = withSpring(activeIndex, { damping: 20, stiffness: 190, mass: 0.7 })
    }
  }, [activeIndex])

  const markerStyle = useAnimatedStyle(() => ({
    width: slot.value * 0.42,
    transform: [{ translateX: slot.value * (marker.value + 0.29) }],
    opacity: withTiming(activeIndex >= 0 ? 1 : 0, { duration: 160 }),
  }))

  /* A guest on /login or /register is on one of their own tabs, so the bar
     stays and shows it as active. A signed-in user has no business there. */
  if (user && AUTH_ROUTES.includes(pathname)) return null

  const go = (href: string, isActive: boolean) => {
    if (isActive) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // `replace`, not `push`: a tab bar implies a flat stack, so Android back
    // from a tab should leave the app rather than walk the tab history.
    // The cast is expo-router's typed-routes union, which a string built from
    // the table above can't be narrowed to.
    router.replace(href as Parameters<typeof router.replace>[0])
  }

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom }]}
      onLayout={(e) => { slot.value = e.nativeEvent.layout.width / tabs.length }}
    >
      <View style={styles.rule} />
      <Animated.View style={[styles.marker, markerStyle]} pointerEvents="none" />

      <View style={styles.row}>
        {tabs.map((tab, i) => {
          const active = i === activeIndex
          return tab.center
            ? <CenterTab key={tab.href} tab={tab} active={active} onPress={() => go(tab.href, active)} />
            : <SideTab key={tab.href} tab={tab} active={active} onPress={() => go(tab.href, active)} />
        })}
      </View>
    </View>
  )
}

function SideTab({ tab, active, onPress }: { tab: TabItem; active: boolean; onPress: () => void }) {
  const Icon = tab.icon
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(0.9, { duration: 90 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 340 }) }}
      onPress={onPress}
      style={styles.slot}
      hitSlop={4}
    >
      <Animated.View style={[styles.slotInner, anim]}>
        <Icon
          size={19}
          color={active ? color.blood : color.faint}
          strokeWidth={active ? 2.1 : 1.7}
        />
        <Text style={[styles.slotLabel, active && styles.slotLabelOn]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

/**
 * The raised slot. Lifted 14px above the bar's own top edge, with a hairline
 * ring so it reads as a machined part sitting on the rule rather than as a
 * floating blob. When it is the active tab it goes to the deep red and gains a
 * bone-tinted ring — the fill changes, the geometry doesn't.
 */
function CenterTab({ tab, active, onPress }: { tab: TabItem; active: boolean; onPress: () => void }) {
  const Icon = tab.icon
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(0.93, { duration: 90 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 13, stiffness: 300 }) }}
      onPress={onPress}
      style={styles.slot}
      hitSlop={6}
    >
      <Animated.View style={[styles.centerWrap, anim]}>
        <View style={[styles.centerBtn, active && styles.centerBtnOn]}>
          <Icon size={21} color={active ? color.bloodLite : '#FFFFFF'} strokeWidth={2.2} />
        </View>
        <Text style={[styles.slotLabel, styles.centerLabel, active && styles.slotLabelOn]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: color.surface,
    /* Shadow points up, away from the screen edge — the bar has to feel like it
       sits over the content, and a downward shadow at the bottom of a display
       is invisible. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
      },
      android: { elevation: 24 },
    }),
  },
  rule: { height: 1, backgroundColor: color.line },
  marker: {
    position: 'absolute', top: 0, left: 0,
    height: 2, backgroundColor: color.blood, borderRadius: 1,
  },

  row: { flexDirection: 'row', height: TAB_BAR_HEIGHT, alignItems: 'center' },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  slotInner: { alignItems: 'center', gap: 6 },
  slotLabel: {
    fontFamily: font.mono.regular,
    fontSize: 8.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: color.faint,
  },
  slotLabelOn: { fontFamily: font.mono.medium, color: color.bone },

  centerWrap: { alignItems: 'center', marginTop: -26 },
  centerBtn: {
    width: 50, height: 50,
    borderRadius: 16,
    backgroundColor: color.blood,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: color.blood,
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  centerBtnOn: {
    backgroundColor: color.bloodDeep,
    borderColor: wash.boneEdge,
  },
  centerLabel: { marginTop: 6 },
})
