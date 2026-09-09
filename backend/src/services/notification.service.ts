import axios from 'axios'
import { sendBloodRequestMatchEmail, BloodRequestMatchEmailParams } from './email.service'

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

export interface NotifyMatchedDonorParams {
  donor: {
    id: string
    pushToken?: string | null
    user?: {
      name?: string | null
      email?: string | null
    } | null
  }
  hospital: {
    name: string
    user?: { city?: string | null } | null
    address?: string | null
  }
  bloodGroup: string
  urgency: string
  distanceKm?: number | null
  requestId: string
  pushBody?: string
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−'
}

/**
 * Sends a notification to a matched donor:
 * - If donor.pushToken exists → send push notification only (current behavior)
 * - If donor.pushToken is null/missing → send an email fallback instead
 * Non-blocking: logs failures, never throws or breaks match creation.
 */
export async function notifyMatchedDonor(params: NotifyMatchedDonorParams): Promise<void> {
  const { donor, hospital, bloodGroup, urgency, distanceKm, requestId, pushBody } = params
  const bloodLabel = bloodGroupLabels[bloodGroup] ?? bloodGroup

  // 1. If donor.pushToken exists → send push notification only
  if (donor.pushToken && donor.pushToken.trim()) {
    await sendPushNotification(
      donor.pushToken,
      '🩸 Blood Needed Urgently',
      pushBody || `${hospital.name} needs ${bloodLabel} blood nearby`,
      { requestId }
    )
    return
  }

  // 2. If donor.pushToken is null/missing → send an email fallback instead
  if (donor.user?.email) {
    try {
      await sendBloodRequestMatchEmail({
        to: donor.user.email,
        donorName: donor.user.name,
        bloodGroup,
        urgency,
        hospitalName: hospital.name,
        hospitalCity: hospital.user?.city || hospital.address,
        distanceKm,
        requestId
      })
    } catch (err) {
      console.error(`Failed to send fallback match email to donor ${donor.id}:`, err)
    }
  }
}

export { sendBloodRequestMatchEmail, BloodRequestMatchEmailParams }