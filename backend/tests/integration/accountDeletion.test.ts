import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// In-memory mock tables
interface MockUser {
  id: string
  email: string
  password: string
  name: string
  role: 'DONOR' | 'HOSPITAL' | 'ADMIN'
  city: string
  phone?: string | null
}

interface MockDonor {
  id: string
  userId: string
  bloodGroup: string
  isAvailable: boolean
  commitmentScore: number
  area: string
  latitude: number
  longitude: number
}

interface MockHospital {
  id: string
  userId: string
  name: string
  address: string
  latitude: number
  longitude: number
  licenseNo: string
  verified: boolean
}

interface MockBloodRequest {
  id: string
  hospitalId: string
  bloodGroup: string
  units: number
  urgency: string
  status: string
}

interface MockMatch {
  id: string
  requestId: string
  donorId: string
  status: string
}

interface MockInventory {
  id: string
  hospitalId: string
  bloodGroup: string
  units: number
}

interface MockToken {
  id: string
  userId: string
  hashedToken: string
  expiresAt: Date
  used: boolean
}

let users: MockUser[] = []
let donors: MockDonor[] = []
let hospitals: MockHospital[] = []
let bloodRequests: MockBloodRequest[] = []
let matches: MockMatch[] = []
let inventories: MockInventory[] = []
let tokens: MockToken[] = []

const mockPrisma: any = {
  user: {
    findUnique: jest.fn(async ({ where, include }: { where: { id?: string; email?: string }; include?: any }) => {
      const u = users.find((x) => (where.id ? x.id === where.id : x.email.toLowerCase() === where.email?.toLowerCase()))
      if (!u) return null
      const res: any = { ...u }
      if (include?.donor) {
        res.donor = donors.find((d) => d.userId === u.id) || null
      }
      if (include?.hospital) {
        res.hospital = hospitals.find((h) => h.userId === u.id) || null
      }
      return res
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
      const u = users.find((x) => x.id === where.id)
      if (!u) throw new Error('User not found')
      Object.assign(u, data)
      return u
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const idx = users.findIndex((x) => x.id === where.id)
      if (idx === -1) throw new Error('User not found')
      const [deleted] = users.splice(idx, 1)
      return deleted
    }),
  },
  donor: {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; userId?: string } }) => {
      return donors.find((d) => (where.id ? d.id === where.id : d.userId === where.userId)) || null
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const idx = donors.findIndex((d) => d.id === where.id)
      if (idx !== -1) donors.splice(idx, 1)
      return { id: where.id }
    }),
    deleteMany: jest.fn(async ({ where }: { where: { id?: any; userId?: any } }) => {
      donors = donors.filter((d) => d.id !== where.id && d.userId !== where.userId)
      return { count: 1 }
    }),
  },
  hospital: {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; userId?: string } }) => {
      return hospitals.find((h) => (where.id ? h.id === where.id : h.userId === where.userId)) || null
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const idx = hospitals.findIndex((h) => h.id === where.id)
      if (idx !== -1) hospitals.splice(idx, 1)
      return { id: where.id }
    }),
    deleteMany: jest.fn(async ({ where }: { where: { id?: any; userId?: any } }) => {
      hospitals = hospitals.filter((h) => h.id !== where.id && h.userId !== where.userId)
      return { count: 1 }
    }),
  },
  bloodRequest: {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return bloodRequests.find((r) => r.id === where.id) || null
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const r = { id: `request-${Date.now()}`, ...data }
      bloodRequests.push(r)
      return r
    }),
    deleteMany: jest.fn(async ({ where }: { where: { hospitalId?: string } }) => {
      let count = 0
      bloodRequests = bloodRequests.filter((r) => {
        if (where.hospitalId && r.hospitalId === where.hospitalId) {
          count++
          return false
        }
        return true
      })
      return { count }
    }),
  },
  match: {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return matches.find((m) => m.id === where.id) || null
    }),
    deleteMany: jest.fn(async ({ where }: { where: { donorId?: string; request?: { hospitalId?: string } } }) => {
      let count = 0
      matches = matches.filter((m) => {
        if (where.donorId && m.donorId === where.donorId) {
          count++
          return false
        }
        if (where.request?.hospitalId) {
          const req = bloodRequests.find((r) => r.id === m.requestId)
          if (req && req.hospitalId === where.request.hospitalId) {
            count++
            return false
          }
        }
        return true
      })
      return { count }
    }),
  },
  inventory: {
    create: jest.fn(async ({ data }: { data: Omit<MockInventory, 'id'> }) => {
      const inv: MockInventory = { id: `inv-${Date.now()}`, ...data }
      inventories.push(inv)
      return inv
    }),
    count: jest.fn(async ({ where }: { where: { hospitalId?: string } }) => {
      return inventories.filter((i) => !where.hospitalId || i.hospitalId === where.hospitalId).length
    }),
    deleteMany: jest.fn(async ({ where }: { where: { hospitalId?: string } }) => {
      let count = 0
      inventories = inventories.filter((i) => {
        if (where.hospitalId && i.hospitalId === where.hospitalId) {
          count++
          return false
        }
        return true
      })
      return { count }
    }),
  },
  passwordResetToken: {
    deleteMany: jest.fn(async ({ where }: { where: { userId?: string } }) => {
      let count = 0
      tokens = tokens.filter((t) => {
        if (where.userId && t.userId === where.userId) {
          count++
          return false
        }
        return true
      })
      return { count }
    }),
  },
  $transaction: jest.fn(async (cbOrOps: any): Promise<any> => {
    if (typeof cbOrOps === 'function') {
      return await cbOrOps(mockPrisma)
    }
    return Promise.all(cbOrOps)
  }),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}))

import app from '../../src/app'

const TEST_SECRET = 'foorikhoon-test-jwt-secret'
process.env.JWT_SECRET = TEST_SECRET

function makeToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, TEST_SECRET, { expiresIn: '1h' })
}

describe('Account Management & Cascading Deletions Integration Suite', () => {
  const donorUser: MockUser = {
    id: 'donor-user-1',
    email: 'donor@example.com',
    password: bcrypt.hashSync('OldDonorPassword123!', 10),
    name: 'Jane Donor',
    role: 'DONOR',
    city: 'Peshawar',
  }

  const donorProfile: MockDonor = {
    id: 'donor-record-1',
    userId: donorUser.id,
    bloodGroup: 'A_POS',
    isAvailable: true,
    commitmentScore: 80,
    area: 'Hayatabad',
    latitude: 34.0,
    longitude: 71.5,
  }

  const hospitalUser: MockUser = {
    id: 'hospital-user-1',
    email: 'hospital@example.com',
    password: bcrypt.hashSync('OldHospitalPassword123!', 10),
    name: 'General Hospital',
    role: 'HOSPITAL',
    city: 'Peshawar',
  }

  const hospitalProfile: MockHospital = {
    id: 'hospital-record-1',
    userId: hospitalUser.id,
    name: 'General Hospital',
    address: 'Main Blvd, Peshawar',
    latitude: 34.01,
    longitude: 71.51,
    licenseNo: 'HOSP-12345',
    verified: true,
  }

  const adminUser: MockUser = {
    id: 'admin-user-1',
    email: 'admin@example.com',
    password: bcrypt.hashSync('AdminPassword123!', 10),
    name: 'Super Admin',
    role: 'ADMIN',
    city: 'Islamabad',
  }

  beforeEach(() => {
    users = [{ ...donorUser }, { ...hospitalUser }, { ...adminUser }]
    donors = [{ ...donorProfile }]
    hospitals = [{ ...hospitalProfile }]
    bloodRequests = [
      {
        id: 'request-1',
        hospitalId: hospitalProfile.id,
        bloodGroup: 'A_POS',
        units: 2,
        urgency: 'URGENT',
        status: 'MATCHED',
      },
    ]
    matches = [
      {
        id: 'match-1',
        requestId: 'request-1',
        donorId: donorProfile.id,
        status: 'ACCEPTED',
      },
    ]
    inventories = [
      {
        id: 'inv-1',
        hospitalId: hospitalProfile.id,
        bloodGroup: 'A_POS',
        units: 10,
      },
    ]
    tokens = [
      {
        id: 'token-1',
        userId: donorUser.id,
        hashedToken: 'hash123',
        expiresAt: new Date(Date.now() + 60000),
        used: false,
      },
    ]
  })

  describe('PUT /api/auth/change-password', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .send({ currentPassword: 'any', newPassword: 'NewValidPassword123' })

      expect(response.status).toBe(401)
    })

    it('rejects when current password or new password is missing', async () => {
      const token = makeToken(donorUser.id, 'DONOR')

      const res1 = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old' })
      expect(res1.status).toBe(400)

      const res2 = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewValidPassword123' })
      expect(res2.status).toBe(400)
    })

    it('rejects when new password is shorter than 8 characters', async () => {
      const token = makeToken(donorUser.id, 'DONOR')

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'OldDonorPassword123!', newPassword: 'short' })

      expect(response.status).toBe(400)
      expect(response.body.message).toMatch(/at least 8 characters/i)
    })

    it('rejects when current password does not match', async () => {
      const token = makeToken(donorUser.id, 'DONOR')

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'IncorrectOldPassword!',
          newPassword: 'BrandNewSecurePassword123!',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toMatch(/current password is incorrect/i)
    })

    it('successfully changes the password when credentials are valid', async () => {
      const token = makeToken(donorUser.id, 'DONOR')
      const newPassword = 'BrandNewSecurePassword123!'

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldDonorPassword123!',
          newPassword,
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toMatch(/password updated successfully/i)

      const updatedUser = users.find((u) => u.id === donorUser.id)
      expect(updatedUser).toBeDefined()
      expect(bcrypt.compareSync(newPassword, updatedUser!.password)).toBe(true)
      expect(bcrypt.compareSync('OldDonorPassword123!', updatedUser!.password)).toBe(false)
    })
  })

  describe('DELETE /api/auth/account (Self-Service Danger Zone)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .send({ confirmation: 'delete' })

      expect(response.status).toBe(401)
    })

    it('rejects without the confirmation keyword "delete"', async () => {
      const token = makeToken(donorUser.id, 'DONOR')

      const resNoBody = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({})
      expect(resNoBody.status).toBe(400)
      expect(resNoBody.body.message).toMatch(/type 'delete'/i)

      const resWrongKeyword = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmation: 'remove' })
      expect(resWrongKeyword.status).toBe(400)
    })

    it('successfully deletes a donor account and cascades all donor matches and tokens', async () => {
      const token = makeToken(donorUser.id, 'DONOR')

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmation: 'delete' })

      expect(response.status).toBe(200)
      expect(response.body.message).toMatch(/account deleted successfully/i)

      // Verify donor, user, match, and reset tokens are deleted
      expect(users.find((u) => u.id === donorUser.id)).toBeUndefined()
      expect(donors.find((d) => d.id === donorProfile.id)).toBeUndefined()
      expect(matches.find((m) => m.id === 'match-1')).toBeUndefined()
      expect(tokens.find((t) => t.userId === donorUser.id)).toBeUndefined()

      // Hospital and request must remain
      expect(hospitals.find((h) => h.id === hospitalProfile.id)).toBeDefined()
      expect(bloodRequests.find((r) => r.id === 'request-1')).toBeDefined()
    })

    it('successfully deletes a hospital account and cascades all requests, inventory, and matches', async () => {
      const token = makeToken(hospitalUser.id, 'HOSPITAL')

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmation: 'DELETE' }) // Case-insensitive check

      expect(response.status).toBe(200)
      expect(response.body.message).toMatch(/account deleted successfully/i)

      // Hospital and user records deleted
      expect(users.find((u) => u.id === hospitalUser.id)).toBeUndefined()
      expect(hospitals.find((h) => h.id === hospitalProfile.id)).toBeUndefined()

      // Associated blood requests, matches, and inventory deleted
      expect(bloodRequests.find((r) => r.id === 'request-1')).toBeUndefined()
      expect(matches.find((m) => m.id === 'match-1')).toBeUndefined()
      expect(inventories.filter((i) => i.hospitalId === hospitalProfile.id)).toHaveLength(0)

      // Donor must remain intact
      expect(users.find((u) => u.id === donorUser.id)).toBeDefined()
      expect(donors.find((d) => d.id === donorProfile.id)).toBeDefined()
    })
  })

  describe('DELETE /api/admin/users/:id (Admin User Management)', () => {
    it('rejects unauthorized or non-admin callers with 401/403', async () => {
      const donorToken = makeToken(donorUser.id, 'DONOR')

      const resAnon = await request(app).delete(`/api/admin/users/${donorUser.id}`)
      expect(resAnon.status).toBe(401)

      const resDonor = await request(app)
        .delete(`/api/admin/users/${donorUser.id}`)
        .set('Authorization', `Bearer ${donorToken}`)
      expect(resDonor.status).toBe(403)
    })

    it('prevents an admin from deleting their own user account from the admin console', async () => {
      const adminToken = makeToken(adminUser.id, 'ADMIN')

      const response = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(400)
      expect(response.body.message).toMatch(/cannot delete their own account/i)

      // Admin user must still exist
      expect(users.find((u) => u.id === adminUser.id)).toBeDefined()
    })

    it('returns 404 when target user does not exist', async () => {
      const adminToken = makeToken(adminUser.id, 'ADMIN')

      const response = await request(app)
        .delete('/api/admin/users/non-existent-user-id')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.message).toMatch(/user not found/i)
    })

    it('allows an admin to delete a misbehaving or security-flagged user and cascades records', async () => {
      const adminToken = makeToken(adminUser.id, 'ADMIN')

      const response = await request(app)
        .delete(`/api/admin/users/${hospitalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toMatch(/user and all associated records deleted successfully/i)

      // Full cascading verification
      expect(users.find((u) => u.id === hospitalUser.id)).toBeUndefined()
      expect(hospitals.find((h) => h.id === hospitalProfile.id)).toBeUndefined()
      expect(bloodRequests.find((r) => r.id === 'request-1')).toBeUndefined()
      expect(matches.find((m) => m.id === 'match-1')).toBeUndefined()
      expect(inventories.filter((i) => i.hospitalId === hospitalProfile.id)).toHaveLength(0)
    })
  })

  describe('POST /api/requests (Hospital License Verification Gate)', () => {
    it('rejects blood request creation from an unverified hospital with 403', async () => {
      // Mark hospital as unverified
      const hospital = hospitals.find((h) => h.id === hospitalProfile.id)
      if (hospital) hospital.verified = false

      const token = makeToken(hospitalUser.id, 'HOSPITAL')

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodGroup: 'A_POS',
          units: 2,
          urgency: 'URGENT'
        })

      expect(response.status).toBe(403)
      expect(response.body.message).toMatch(/license verification/i)
    })
  })
})
