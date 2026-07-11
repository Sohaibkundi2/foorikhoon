// src/components/Navbar.tsx
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing, Pressable, Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname, Link } from 'expo-router'
import { useAuthStore } from '../store/authStore'

interface NavLink {
  href: string
  label: string
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    router.replace('/')
  }

  const donorLinks: NavLink[] = [
    { href: '/donor/dashboard', label: 'Dashboard' },
    { href: '/donor/matches', label: 'My Matches' },
    { href: '/donor/profile', label: 'Profile' },
  ]

  const hospitalLinks: NavLink[] = [
    { href: '/hospital/dashboard', label: 'Dashboard' },
    { href: '/hospital/requests', label: 'Requests' },
    { href: '/hospital/inventory', label: 'Inventory' },
    { href: '/hospital/request/new', label: 'New Request' },
    { href: '/hospital/analytics', label: 'Analytics' },
  ]

  const adminLinks: NavLink[] = [
    { href: '/admin/dashboard', label: 'Dashboard' },
  ]

  const publicLinks: NavLink[] = [
    { href: '/requests', label: 'Active Requests' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  const navLinks =
    user?.role === 'DONOR' ? donorLinks
    : user?.role === 'HOSPITAL' ? hospitalLinks
    : user?.role === 'ADMIN' ? adminLinks
    : publicLinks

  const drawerTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  })

  return (
    <>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.navbar}>
          {/* Logo */}
          <Link href="/" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.logo}>
                <Text style={styles.logoAccent}>Fori</Text>
                <Text style={styles.logoWhite}>Khoon</Text>
              </Text>
            </TouchableOpacity>
          </Link>

          {/* Right side */}
          <View style={styles.rightSide}>
            {user && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user.role.toLowerCase()}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setMenuOpen(!menuOpen)}
              style={[styles.hamburger, menuOpen && styles.hamburgerActive]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <View style={styles.barsWrap}>
                <View style={[styles.bar, menuOpen && styles.barTopOpen]} />
                <View style={[styles.bar, menuOpen && styles.barMidOpen]} />
                <View style={[styles.bar, menuOpen && styles.barBottomOpen]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Drawer */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
        <View style={[styles.drawerWrap, { paddingTop: insets.top }]} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.drawer,
              { opacity: slideAnim, transform: [{ translateY: drawerTranslateY }] },
            ]}
          >
            {navLinks.map((link) => {
              const active = pathname === link.href
              return (
                <Link key={link.href} href={link.href} asChild>
                  <TouchableOpacity
                    style={[styles.drawerLink, active && styles.drawerLinkActive]}
                    onPress={() => setMenuOpen(false)}
                  >
                    <Text style={[styles.drawerLinkText, active && styles.drawerLinkTextActive]}>
                      {link.label}
                    </Text>
                  </TouchableOpacity>
                </Link>
              )
            })}

            <View style={styles.divider} />

            {user ? (
              <View>
                <View style={styles.userInfo}>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userRole}>{user.role.toLowerCase()}</Text>
                </View>
                <TouchableOpacity style={styles.drawerLink} onPress={handleLogout}>
                  <Text style={styles.drawerLinkText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authButtons}>
                <Link href="/login" asChild>
                  <TouchableOpacity style={styles.signInBtn} onPress={() => setMenuOpen(false)}>
                    <Text style={styles.signInBtnText}>Sign in</Text>
                  </TouchableOpacity>
                </Link>
                <Link href="/register" asChild>
                  <TouchableOpacity style={styles.registerBtn} onPress={() => setMenuOpen(false)}>
                    <Text style={styles.registerBtnText}>Register</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0F0F0F',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 6 },
    }),
    zIndex: 10,
  },
  navbar: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontSize: 19, fontWeight: '800' },
  logoAccent: { color: '#DC2626' },
  logoWhite: { color: '#FFFFFF' },

  rightSide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleBadge: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: { color: '#F87171', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  hamburger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  hamburgerActive: { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.3)' },
  barsWrap: { width: 18, height: 14, justifyContent: 'space-between' },
  bar: { height: 2, backgroundColor: '#FFFFFF', borderRadius: 1, width: 18 },
  barTopOpen: { transform: [{ translateY: 6 }, { rotate: '45deg' }] },
  barMidOpen: { opacity: 0 },
  barBottomOpen: { transform: [{ translateY: -6 }, { rotate: '-45deg' }] },

  // Drawer / modal
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  drawerWrap: { flex: 1 },
  drawer: {
    marginHorizontal: 12,
    marginTop: 66,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  drawerLink: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, marginBottom: 2 },
  drawerLinkActive: { backgroundColor: 'rgba(220,38,38,0.1)' },
  drawerLinkText: { color: '#9CA3AF', fontSize: 14.5, fontWeight: '500' },
  drawerLinkTextActive: { color: '#F87171', fontWeight: '700' },

  divider: { borderTopWidth: 1, borderTopColor: '#242424', marginVertical: 10 },

  userInfo: { paddingHorizontal: 14, paddingVertical: 6, marginBottom: 4 },
  userEmail: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
  userRole: { color: '#F87171', fontSize: 11.5, textTransform: 'capitalize', marginTop: 2 },

  authButtons: { gap: 8, paddingTop: 4 },
  signInBtn: {
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  signInBtnText: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  registerBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})
