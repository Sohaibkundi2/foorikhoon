import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import api from './api'

// how notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  // only works on real device
  if (!Device.isDevice) {
    console.log('Push notifications require a real device')
    return null
  }

  // request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted')
    return null
  }

  // get push token
    const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '2ca36d52-43e4-4fd5-8294-85f7b96c4a6c'
    })).data

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return token
}

export async function savePushTokenToBackend(token: string) {
  try {
    await api.put('/api/donor/push-token', { pushToken: token })
    console.log('Push token saved to backend')
  } catch (err) {
    console.error('Failed to save push token:', err)
  }
}