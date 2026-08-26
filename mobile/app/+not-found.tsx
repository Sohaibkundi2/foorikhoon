// app/+not-found.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Link } from 'expo-router'
import { ArrowUpRight } from 'lucide-react-native'

import { Screen, Label, Button, Rule } from '../src/components/fk'
import { color, font } from '../src/theme'

/** The three screens anyone can open without an account. Keeping the list to
 *  real, public routes means nothing here dead-ends a second time. */
const WAYS_BACK = [
  { href: '/' as const, label: 'Home', desc: 'What ForiKhoon is and who it is for' },
  { href: '/requests' as const, label: 'Open requests', desc: 'Every hospital request live right now' },
  { href: '/leaderboard' as const, label: 'Leaderboard', desc: 'Donors ranked by commitment score' },
]

export default function NotFoundScreen() {
  return (
    /* Ranged left against a rule instead of a centred stack: a big centred
       numeral over empty space is the most generic 404 there is, and it gives
       the reader nothing to do next. */
    <Screen ember grid>
      <View style={styles.gutter}>
        <Rule tick />

        <Label loud style={{ color: color.bloodLite, marginTop: 24 }}>
          Error · 404
        </Label>

        <Text style={styles.code}>404</Text>

        <Text style={styles.title}>
          That screen{' '}
          <Text style={styles.titleAccent}>isn't here.</Text>
        </Text>

        <Text style={styles.sub}>
          The link may be out of date, or the request it pointed at has since
          been fulfilled or expired.
        </Text>

        <Link href="/" asChild>
          <Button tone="primary" size="lg" full style={{ marginTop: 28 }}>
            Back to home
          </Button>
        </Link>

        <View style={{ marginTop: 34 }}>
          <Label>Or try one of these</Label>
          {WAYS_BACK.map(item => (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                {/* Was nothing — the old screen offered a single button. */}
                <ArrowUpRight size={14} color={color.faint} strokeWidth={2} />
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  code: {
    fontFamily: font.mono.medium, fontSize: 76, lineHeight: 80,
    color: color.line, letterSpacing: -5, marginTop: 6,
  },
  title: {
    fontFamily: font.sans.semibold, fontSize: 32, lineHeight: 36,
    color: color.bone, letterSpacing: -1.5, marginTop: 10,
  },
  titleAccent: {
    fontFamily: font.serif.italic, fontSize: 34, color: color.bloodLite, letterSpacing: -0.5,
  },
  sub: {
    fontFamily: font.sans.regular, fontSize: 14, lineHeight: 21,
    color: color.mute, marginTop: 14,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 16,
  },
  rowLabel: {
    fontFamily: font.sans.medium, fontSize: 14, color: color.bone, letterSpacing: -0.2,
  },
  rowDesc: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 4,
  },
})
