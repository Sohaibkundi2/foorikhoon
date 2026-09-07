import request from 'supertest'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Mock nodemailer before imports
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}))

// In-memory mock database models
interface MockUser {
  id: string
  email: string
  password: string
  name: string
  role: string
  city: string
}

interface MockToken {
  id: string
  userId: string
  hashedToken: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

let users: MockUser[] = []
let resetTokens: MockToken[] = []

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          return users.find(u => u.email.toLowerCase() === where.email?.toLowerCase()) || null
        }
        if (where.id) {
          return users.find(u => u.id === where.id) || null
        }
        return null
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
        const user = users.find(u => u.id === where.id)
        if (!user) throw new Error(`User ${where.id} not found`)
        Object.assign(user, data)
        return user
      }),
    },
    passwordResetToken: {
      findUnique: jest.fn(async ({ where }: { where: { hashedToken: string } }) => {
        return resetTokens.find(t => t.hashedToken === where.hashedToken) || null
      }),
      create: jest.fn(async ({ data }: { data: Omit<MockToken, 'id' | 'createdAt'> }) => {
        const newToken: MockToken = {
          id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: data.userId,
          hashedToken: data.hashedToken,
          expiresAt: data.expiresAt,
          used: data.used ?? false,
          createdAt: new Date(),
        }
        resetTokens.push(newToken)
        return newToken
      }),
      updateMany: jest.fn(async ({ where, data }: { where: { userId: string; used?: boolean }; data: Partial<MockToken> }) => {
        let count = 0
        for (const token of resetTokens) {
          if (token.userId === where.userId && (where.used === undefined || token.used === where.used)) {
            Object.assign(token, data)
            count++
          }
        }
        return { count }
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockToken> }) => {
        const token = resetTokens.find(t => t.id === where.id)
        if (!token) throw new Error(`Token ${where.id} not found`)
        Object.assign(token, data)
        return token
      }),
    },
    $transaction: jest.fn(async (operations: Promise<any>[]) => {
      return Promise.all(operations)
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

import app from '../../src/app'

describe('Password Reset Integration Suite', () => {
  const testUser: MockUser = {
    id: 'user-uuid-1',
    email: 'donor@forikhoon.app',
    password: bcrypt.hashSync('OldSecretPassword123', 10),
    name: 'Jane Donor',
    role: 'DONOR',
    city: 'Karachi',
  }

  beforeEach(() => {
    users = [{ ...testUser }]
    resetTokens = []
    mockSendMail.mockClear()
  })

  describe('POST /api/auth/forgot-password', () => {
    it('sends an email with a raw token link and creates a hashed token for a valid user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })

      // Token created in DB
      expect(resetTokens).toHaveLength(1)
      const tokenRecord = resetTokens[0]
      expect(tokenRecord.userId).toBe(testUser.id)
      expect(tokenRecord.used).toBe(false)
      expect(tokenRecord.expiresAt.getTime()).toBeGreaterThan(Date.now())

      // Email sent via Nodemailer
      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const sentEmail = mockSendMail.mock.calls[0][0]
      expect(sentEmail.to).toBe(testUser.email)
      expect(sentEmail.subject).toContain('Reset your ForiKhoon password')

      // Extract raw token from reset link in email
      const resetLinkMatch = sentEmail.text.match(/https:\/\/forikhoon\.app\/reset-password\?token=([a-f0-9]+)/)
      expect(resetLinkMatch).not.toBeNull()
      const rawTokenFromEmail = resetLinkMatch![1]

      // Stored token must be the SHA-256 hash of the raw token, not the raw token itself
      const expectedHash = crypto.createHash('sha256').update(rawTokenFromEmail).digest('hex')
      expect(tokenRecord.hashedToken).toBe(expectedHash)
    })

    it('returns the same generic success message when the email does not exist without creating tokens or sending email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })

      expect(resetTokens).toHaveLength(0)
      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('invalidates old unused tokens when a new forgot-password request comes in for the same user', async () => {
      // First request
      const res1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
      expect(res1.status).toBe(200)
      expect(resetTokens).toHaveLength(1)
      const firstToken = resetTokens[0]
      expect(firstToken.used).toBe(false)

      // Second request
      const res2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
      expect(res2.status).toBe(200)
      expect(resetTokens).toHaveLength(2)

      // First token should now be invalidated (used: true)
      expect(firstToken.used).toBe(true)
      // Second token should be active
      const secondToken = resetTokens[1]
      expect(secondToken.used).toBe(false)
    })

    it('rejects missing or empty email with 400', async () => {
      const resEmpty = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: '' })
      expect(resEmpty.status).toBe(400)
      expect(resEmpty.body.message).toMatch(/email is required/i)

      const resMissing = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
      expect(resMissing.status).toBe(400)
      expect(resMissing.body.message).toMatch(/email is required/i)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('successfully resets the password with a valid token and hashes the new password with bcrypt', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

      resetTokens.push({
        id: 'token-active-1',
        userId: testUser.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      })

      const newPassword = 'BrandNewSecurePassword456!'
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword,
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Password has been successfully reset',
      })

      // Token marked as used
      const tokenRecord = resetTokens.find(t => t.id === 'token-active-1')
      expect(tokenRecord?.used).toBe(true)

      // User password updated with bcrypt hash
      const user = users.find(u => u.id === testUser.id)
      expect(user).toBeDefined()
      expect(bcrypt.compareSync(newPassword, user!.password)).toBe(true)
      expect(bcrypt.compareSync('OldSecretPassword123', user!.password)).toBe(false)
    })

    it('rejects an expired token with a clear error', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

      resetTokens.push({
        id: 'token-expired-1',
        userId: testUser.id,
        hashedToken,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        used: false,
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      })

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'BrandNewSecurePassword456!',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Password reset token has expired')

      // User password remains unchanged
      const user = users.find(u => u.id === testUser.id)
      expect(bcrypt.compareSync('OldSecretPassword123', user!.password)).toBe(true)
    })

    it('rejects an already-used token with a clear error', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

      resetTokens.push({
        id: 'token-used-1',
        userId: testUser.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: true, // Already used
        createdAt: new Date(),
      })

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'BrandNewSecurePassword456!',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Password reset token has already been used')

      // User password remains unchanged
      const user = users.find(u => u.id === testUser.id)
      expect(bcrypt.compareSync('OldSecretPassword123', user!.password)).toBe(true)
    })

    it('rejects a wrong or malformed token with a clear error', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'completely-bogus-token-12345',
          newPassword: 'BrandNewSecurePassword456!',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Invalid or expired password reset token')
    })

    it('rejects a new password shorter than 8 characters', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

      resetTokens.push({
        id: 'token-active-2',
        userId: testUser.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      })

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'short',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Password must be at least 8 characters long')

      // Token not marked as used
      const tokenRecord = resetTokens.find(t => t.id === 'token-active-2')
      expect(tokenRecord?.used).toBe(false)
    })

    it('rejects missing token or missing password', async () => {
      const resNoToken = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'BrandNewSecurePassword456!' })
      expect(resNoToken.status).toBe(400)
      expect(resNoToken.body.message).toMatch(/token is required/i)

      const resNoPw = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' })
      expect(resNoPw.status).toBe(400)
      expect(resNoPw.body.message).toMatch(/password must be at least 8 characters/i)
    })
  })
})
