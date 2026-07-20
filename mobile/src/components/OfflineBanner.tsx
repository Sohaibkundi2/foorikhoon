import { View, Text, StyleSheet } from 'react-native'

interface Props {
  lastUpdated: number | null
}

export default function OfflineBanner({ lastUpdated }: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        You're offline
        {lastUpdated ? ` · Last updated ${timeAgo(lastUpdated)}` : ''}
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
    backgroundColor: 'rgba(251,146,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FB923C',
  },
  text: {
    color: '#FB923C',
    fontSize: 12,
    fontWeight: '500',
  },
})