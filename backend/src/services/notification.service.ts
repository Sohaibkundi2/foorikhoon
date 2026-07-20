import axios from 'axios'

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: object
) {
  try {
    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    })
    console.log(`Notification sent to ${pushToken}`)
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}