import AsyncStorage from '@react-native-async-storage/async-storage'

export async function saveCache(key: string, data: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data))
    await AsyncStorage.setItem(`${key}_time`, Date.now().toString())
  } catch (e) {
    console.error('Cache save error:', e)
  }
}

export async function loadCache(key: string) {
  try {
    const data = await AsyncStorage.getItem(key)
    const time = await AsyncStorage.getItem(`${key}_time`)
    if (!data) return null
    return {
      data: JSON.parse(data),
      time: time ? parseInt(time) : null
    }
  } catch (e) {
    return null
  }
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}