import { View, Text, StyleSheet } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { color, wash, font, radius } from '../theme'

interface Props {
  lastUpdated: number | null
}

/**
 * No outer margin: callers place this inside their own gutter, because the
 * screens it appears on don't all use the same one. It used to carry
 * `marginHorizontal: 16` and sat visibly inset from every 20px-gutter screen.
 */
export default function OfflineBanner({ lastUpdated }: Props) {
  return (
    <View style={styles.banner}>
      <WifiOff size={13} color={color.warnLite} strokeWidth={2} />
      <Text style={styles.text}>
        Offline
        {lastUpdated ? <Text style={styles.dim}>{` · cached ${timeAgo(lastUpdated)}`}</Text> : ''}
      </Text>
    </View>
  )
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: wash.warn,
    borderWidth: 1,
    borderColor: wash.warnEdge,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
    gap: 8,
  },
  text: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.warnLite,
  },
  dim: { fontFamily: font.mono.regular, color: color.mute },
})
