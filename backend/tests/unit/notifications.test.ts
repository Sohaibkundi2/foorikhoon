import axios from 'axios'
import nodemailer from 'nodemailer'
import { notifyMatchedDonor } from '../../src/services/notification.service'
import { sendBloodRequestMatchEmail } from '../../src/services/email.service'

jest.mock('axios')
jest.mock('nodemailer')

describe('Notification Service - Push & Email Fallback', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>
  let sendMailMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'msg-123' })
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock
    })
    mockedAxios.post.mockResolvedValue({ data: { status: 'ok' } })
  })

  it('sends push notification ONLY when donor has a pushToken', async () => {
    const params = {
      donor: {
        id: 'donor-1',
        pushToken: 'ExponentPushToken[abc-123]',
        user: { name: 'Ali Khan', email: 'ali@example.com' }
      },
      hospital: {
        name: 'City Care Hospital',
        user: { city: 'Lahore' },
        address: '123 Hospital Road'
      },
      bloodGroup: 'B_POS',
      urgency: 'CRITICAL',
      distanceKm: 4.5,
      requestId: 'req-101'
    }

    await notifyMatchedDonor(params)

    // Push notification sent
    expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        to: 'ExponentPushToken[abc-123]',
        title: '🩸 Blood Needed Urgently',
        body: 'City Care Hospital needs B+ blood nearby'
      })
    )

    // Email should NOT be sent
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('sends custom pushBody when provided and pushToken exists', async () => {
    const params = {
      donor: {
        id: 'donor-1',
        pushToken: 'ExponentPushToken[abc-123]',
        user: { name: 'Ali Khan', email: 'ali@example.com' }
      },
      hospital: {
        name: 'City Care Hospital',
        user: { city: 'Lahore' }
      },
      bloodGroup: 'A_NEG',
      urgency: 'URGENT',
      requestId: 'req-102',
      pushBody: 'City Care Hospital needs blood — previous donors unavailable'
    }

    await notifyMatchedDonor(params)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        body: 'City Care Hospital needs blood — previous donors unavailable'
      })
    )
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('falls back to email when donor.pushToken is null', async () => {
    const params = {
      donor: {
        id: 'donor-2',
        pushToken: null,
        user: { name: 'Sara Ahmed', email: 'sara@example.com' }
      },
      hospital: {
        name: 'Fatima Memorial Hospital',
        user: { city: 'Islamabad' }
      },
      bloodGroup: 'O_NEG',
      urgency: 'CRITICAL',
      distanceKm: 2.8,
      requestId: 'req-202'
    }

    await notifyMatchedDonor(params)

    // Push notification should NOT be called
    expect(mockedAxios.post).not.toHaveBeenCalled()

    // Email should be sent
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const mailArgs = sendMailMock.mock.calls[0][0]

    expect(mailArgs.to).toBe('sara@example.com')
    // Subject mentions blood group and urgency
    expect(mailArgs.subject).toContain('CRITICAL')
    expect(mailArgs.subject).toContain('O−')
    expect(mailArgs.subject).toContain('Fatima Memorial Hospital')

    // Body contains hospital name, city, distance, and link to forikhoon.app
    expect(mailArgs.text).toContain('Fatima Memorial Hospital')
    expect(mailArgs.text).toContain('Islamabad')
    expect(mailArgs.text).toContain('2.8 km away')
    expect(mailArgs.text).toContain('forikhoon.app')
    expect(mailArgs.text).toContain('O−')
    expect(mailArgs.text).toContain('CRITICAL')

    expect(mailArgs.html).toContain('Fatima Memorial Hospital')
    expect(mailArgs.html).toContain('Islamabad')
    expect(mailArgs.html).toContain('2.8 km away')
    expect(mailArgs.html).toContain('https://forikhoon.app/donor/dashboard')
  })

  it('falls back to email when donor.pushToken is empty string', async () => {
    const params = {
      donor: {
        id: 'donor-3',
        pushToken: '   ',
        user: { name: 'Bilal Tariq', email: 'bilal@example.com' }
      },
      hospital: {
        name: 'DHQ Hospital',
        user: { city: 'D.I. Khan' }
      },
      bloodGroup: 'AB_POS',
      urgency: 'NORMAL',
      requestId: 'req-303'
    }

    await notifyMatchedDonor(params)

    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const mailArgs = sendMailMock.mock.calls[0][0]
    expect(mailArgs.to).toBe('bilal@example.com')
    expect(mailArgs.subject).toContain('AB+')
    expect(mailArgs.subject).toContain('NORMAL')
    expect(mailArgs.text).toContain('Nearby') // fallback when distanceKm is not provided
  })

  it('does not throw or block when email sending fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP Connection timeout'))

    const params = {
      donor: {
        id: 'donor-4',
        pushToken: null,
        user: { name: 'Hassan', email: 'hassan@example.com' }
      },
      hospital: {
        name: 'General Hospital',
        user: { city: 'Karachi' }
      },
      bloodGroup: 'B_NEG',
      urgency: 'URGENT',
      distanceKm: 5.1,
      requestId: 'req-404'
    }

    // Must resolve without throwing
    await expect(notifyMatchedDonor(params)).resolves.not.toThrow()
  })

  it('handles missing donor user email gracefully without sending email', async () => {
    const params = {
      donor: {
        id: 'donor-5',
        pushToken: null,
        user: null
      },
      hospital: {
        name: 'General Hospital',
        user: { city: 'Karachi' }
      },
      bloodGroup: 'A_POS',
      urgency: 'NORMAL',
      requestId: 'req-505'
    }

    await expect(notifyMatchedDonor(params)).resolves.not.toThrow()
    expect(sendMailMock).not.toHaveBeenCalled()
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it('sendBloodRequestMatchEmail directly validates recipient email', async () => {
    await sendBloodRequestMatchEmail({
      to: '',
      bloodGroup: 'A_POS',
      urgency: 'NORMAL',
      hospitalName: 'Hospital'
    })

    expect(sendMailMock).not.toHaveBeenCalled()
  })
})
