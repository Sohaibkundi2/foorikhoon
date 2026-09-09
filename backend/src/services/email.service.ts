import nodemailer from 'nodemailer'

export const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://forikhoon.app'
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

  const transporter = getTransporter()

  const mailOptions = {
    from: `"ForiKhoon" <${process.env.GMAIL_USER || 'no-reply@forikhoon.app'}>`,
    to,
    subject: 'Reset your ForiKhoon password',
    text: `You have requested to reset your password for your ForiKhoon account.\n\nPlease click the link below or copy and paste it into your browser to reset your password:\n${resetUrl}\n\nThis link is valid for 15 minutes. If you did not request this, please ignore this email.\n`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">ForiKhoon Password Reset</h2>
        <p>You recently requested to reset your password for your ForiKhoon account. Click the button below to proceed:</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;"><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #888; font-size: 13px; margin-top: 30px;">This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}

export interface BloodRequestMatchEmailParams {
  to: string
  donorName?: string | null
  bloodGroup: string
  urgency: string
  hospitalName: string
  hospitalCity?: string | null
  distanceKm?: number | null
  requestId?: string
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

export async function sendBloodRequestMatchEmail(params: BloodRequestMatchEmailParams): Promise<void> {
  try {
    const {
      to,
      donorName,
      bloodGroup,
      urgency,
      hospitalName,
      hospitalCity,
      distanceKm
    } = params

    if (!to || !to.trim()) {
      console.warn('Cannot send blood request email: recipient email missing')
      return
    }

    const formattedGroup = bloodGroupLabels[bloodGroup] || bloodGroup
    const formattedUrgency = urgency.toUpperCase()

    const baseUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://forikhoon.app'
    const actionUrl = `${baseUrl}/donor/dashboard`

    const distanceFormatted = distanceKm != null ? `${distanceKm.toFixed(1)} km away` : 'Nearby'
    const cityFormatted = hospitalCity || 'Nearby'
    const nameFormatted = donorName || 'Donor'

    const transporter = getTransporter()

    const subject = `🩸 [${formattedUrgency}] ${formattedGroup} Blood Needed: ${hospitalName}`

    const text = `Hello ${nameFormatted},

A blood request matching your blood group (${formattedGroup}) has been issued by ${hospitalName}.

Request Details:
- Hospital: ${hospitalName}
- City: ${cityFormatted}
- Distance: ${distanceFormatted}
- Blood Group: ${formattedGroup}
- Urgency: ${formattedUrgency}

Please open your ForiKhoon dashboard to accept or decline this request:
${actionUrl}

Thank you for being a hero!
`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0; font-size: 22px;">🩸 Blood Needed Urgently</h2>
          <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">ForiKhoon Emergency Network</span>
        </div>

        <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${nameFormatted}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5;">
          A hospital nearby urgently needs blood matching your type (<strong style="color: #dc2626;">${formattedGroup}</strong>).
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Hospital:</strong></td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${hospitalName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>City:</strong></td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${cityFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Distance:</strong></td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${distanceFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Blood Group:</strong></td>
              <td style="padding: 6px 0; font-weight: 700; color: #dc2626;">${formattedGroup}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Urgency:</strong></td>
              <td style="padding: 6px 0; font-weight: 700; color: ${formattedUrgency === 'CRITICAL' ? '#b91c1c' : '#dc2626'};">${formattedUrgency}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; line-height: 1.5;">
          Every minute counts. Please respond by accepting or declining this request on your dashboard:
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${actionUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            View Request & Respond (Accept / Decline)
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          Or copy and paste this link in your browser: <br/>
          <a href="${actionUrl}" style="color: #64748b; word-break: break-all;">${actionUrl}</a>
        </p>
      </div>
    `

    const mailOptions = {
      from: `"ForiKhoon" <${process.env.GMAIL_USER || 'no-reply@forikhoon.app'}>`,
      to,
      subject,
      text,
      html,
    }

    await transporter.sendMail(mailOptions)
    console.log(`Blood request match email sent to ${to}`)
  } catch (err) {
    console.error('Failed to send blood request match email:', err)
  }
}

