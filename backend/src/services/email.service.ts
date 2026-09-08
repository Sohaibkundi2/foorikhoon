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
