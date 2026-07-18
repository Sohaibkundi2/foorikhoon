// app/+not-found.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Link } from 'expo-router'

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.sub}>
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <Link href="/" asChild>
        <TouchableOpacity style={styles.btn} activeOpacity={0.85}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  code: { color: '#DC2626', fontSize: 64, fontWeight: '800', marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#6B7280', fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  btn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})