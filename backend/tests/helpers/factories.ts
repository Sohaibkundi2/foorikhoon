import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../../src/lib/prisma'
import { withDbRetry } from './db'
import { BloodGroup, MatchStatus, RequestStatus, Role, Urgency } from '../../prisma/generated'

/**
 * Fixture builders for the DB-backed suites, plus id-tracked teardown.
 *
 * Cleanup deliberately deletes only rows these factories created (or rows the app created
 * hanging off them), never `deleteMany({})` — the test branch may hold seed data, and a
 * table-wide wipe would be an unrecoverable surprise if the branch were ever mispointed.
 *
 * Emails and licence numbers are UUID-suffixed so parallel or repeated runs cannot collide
 * on the unique constraints, and so leftover rows are identifiable if a run is killed
 * before teardown.
 *
 * Every write goes through `withDbRetry`, which retries connection-level failures only. The
 * test branch drops sockets and stalls under throttling; without this, one dropped connection
 * fails not just the current test but every test after it, because neither setup nor teardown
 * can complete. See the note on `withDbRetry` for why this cannot mask a real defect.
 */

const TEST_TAG = 'forikhoon-test'

const created = {
  userIds: new Set<string>(),
  donorIds: new Set<string>(),
  hospitalIds: new Set<string>(),
  requestIds: new Set<string>()
}

/** Registers a row the *app* created (e.g. via POST /api/auth/register) for teardown. */
export function trackUser(id: string): void {
  created.userIds.add(id)
}

export function trackRequest(id: string): void {
  created.requestIds.add(id)
}

function uniqueEmail(prefix: string): string {
  return `${TEST_TAG}-${prefix}-${randomUUID()}@example.test`
}

function signToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

export interface DonorFixtureOptions {
  bloodGroup?: BloodGroup
  /** Days since the last donation. Omit (or pass null) for a donor who has never donated. */
  lastDonatedDaysAgo?: number | null
  isAvailable?: boolean
  commitmentScore?: number
  latitude?: number
  longitude?: number
  city?: string
  name?: string
  pushToken?: string | null
  shareContactInfo?: boolean
}

export interface DonorFixture {
  userId: string
  donorId: string
  email: string
  token: string
  authHeader: string
}

/**
 * The point every fixture clusters around — an empty patch of the South Atlantic.
 *
 * Deliberately somewhere no donor row will ever legitimately be. Escalation searches for
 * *any* eligible donor in radius, so fixtures placed where other rows live let the app pull a
 * donor this suite does not own into a match. Two things put rows in range: the branch is a
 * copy of dev and carries dev's donors, and a run killed mid-test leaves its own fixtures
 * behind (`npm run test:clean` removes those). Either way the candidate set stops being
 * deterministic, and if such a row is deleted while a request is still in flight the insert
 * fails on `Match_donorId_fkey` — which reads as an application bug and is not one.
 *
 * Tests that care about distance offset from these constants rather than hardcoding degrees,
 * so moving the pair moves the whole geometry with it. The offsets in use are latitudinal,
 * and a degree of latitude is ~111km at any latitude, so the radius-tier assertions in
 * donorEligibility mean the same thing here as they did at 31.8N.
 */
export const HOSPITAL_LAT = -14.5
export const HOSPITAL_LON = -24.5

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export async function createDonorFixture(options: DonorFixtureOptions = {}): Promise<DonorFixture> {
  const email = uniqueEmail('donor')

  const user = await withDbRetry(() => prisma.user.create({
    data: {
      email,
      name: options.name ?? 'Test Donor',
      phone: '03001234567',
      role: Role.DONOR,
      // A pre-hashed placeholder: these fixtures authenticate with minted JWTs rather than
      // by logging in, so the hash only has to be present and non-guessable.
      password: `$2b$10$${randomUUID().replace(/-/g, '')}`,
      city: options.city ?? 'D.I. Khan'
    }
  }))
  created.userIds.add(user.id)

  const lastDonatedDaysAgo = options.lastDonatedDaysAgo ?? null

  const donor = await withDbRetry(() => prisma.donor.create({
    data: {
      userId: user.id,
      bloodGroup: options.bloodGroup ?? BloodGroup.A_POS,
      lastDonated: lastDonatedDaysAgo === null ? null : daysAgo(lastDonatedDaysAgo),
      isAvailable: options.isAvailable ?? true,
      commitmentScore: options.commitmentScore ?? 0,
      area: 'Test Area',
      latitude: options.latitude ?? HOSPITAL_LAT,
      longitude: options.longitude ?? HOSPITAL_LON,
      pushToken: options.pushToken ?? null,
      shareContactInfo: options.shareContactInfo ?? false
    }
  }))
  created.donorIds.add(donor.id)

  const token = signToken(user.id, Role.DONOR)

  return { userId: user.id, donorId: donor.id, email, token, authHeader: `Bearer ${token}` }
}

export interface HospitalFixtureOptions {
  name?: string
  verified?: boolean
  latitude?: number
  longitude?: number
  city?: string
}

export interface HospitalFixture {
  userId: string
  hospitalId: string
  email: string
  token: string
  authHeader: string
}

export async function createHospitalFixture(options: HospitalFixtureOptions = {}): Promise<HospitalFixture> {
  const email = uniqueEmail('hospital')

  const user = await withDbRetry(() => prisma.user.create({
    data: {
      email,
      name: options.name ?? 'Test Hospital',
      phone: '0966123456',
      role: Role.HOSPITAL,
      password: `$2b$10$${randomUUID().replace(/-/g, '')}`,
      city: options.city ?? 'D.I. Khan'
    }
  }))
  created.userIds.add(user.id)

  const hospital = await withDbRetry(() => prisma.hospital.create({
    data: {
      userId: user.id,
      name: options.name ?? 'Test Hospital',
      address: 'Test Address, D.I. Khan',
      latitude: options.latitude ?? HOSPITAL_LAT,
      longitude: options.longitude ?? HOSPITAL_LON,
      licenseNo: `${TEST_TAG}-${randomUUID()}`,
      verified: options.verified ?? true
    }
  }))
  created.hospitalIds.add(hospital.id)

  const token = signToken(user.id, Role.HOSPITAL)

  return { userId: user.id, hospitalId: hospital.id, email, token, authHeader: `Bearer ${token}` }
}

export interface RequestFixtureOptions {
  hospitalId: string
  bloodGroup?: BloodGroup
  units?: number
  urgency?: Urgency
  status?: RequestStatus
  notes?: string
}

export async function createRequestFixture(options: RequestFixtureOptions) {
  const request = await withDbRetry(() => prisma.bloodRequest.create({
    data: {
      hospitalId: options.hospitalId,
      bloodGroup: options.bloodGroup ?? BloodGroup.A_POS,
      units: options.units ?? 1,
      urgency: options.urgency ?? Urgency.NORMAL,
      status: options.status ?? RequestStatus.PENDING,
      notes: options.notes ?? 'Created by the test suite'
    }
  }))
  created.requestIds.add(request.id)
  return request
}

export interface MatchFixtureOptions {
  requestId: string
  donorId: string
  status?: MatchStatus
  responseToken?: string
  photoPublicId?: string
}

export async function createMatchFixture(options: MatchFixtureOptions) {
  return withDbRetry(() => prisma.match.create({
    data: {
      requestId: options.requestId,
      donorId: options.donorId,
      status: options.status ?? MatchStatus.PENDING,
      responseToken: options.responseToken ?? randomUUID(),
      ...(options.photoPublicId ? { photoPublicId: options.photoPublicId } : {})
    }
  }))
}

/**
 * Deletes every row this run created, in foreign-key-safe order.
 *
 * Matches and requests are also matched by donor/hospital id, not just by tracked id, so
 * rows the application created during a test (escalation replacement matches, requests
 * posted through the API) are cleaned up without each test having to track them.
 *
 * The whole sequence retries as a unit on a dropped connection, which is safe because every
 * step is an idempotent `deleteMany` over a fixed id list — replaying it deletes nothing that
 * a completed pass had not already removed. The tracked id sets are cleared only once the
 * deletes have actually landed, so a mid-teardown failure leaves them intact for the retry
 * rather than orphaning rows.
 */
export async function cleanupFixtures(): Promise<void> {
  const donorIds = [...created.donorIds]
  const hospitalIds = [...created.hospitalIds]
  const requestIds = [...created.requestIds]
  const userIds = [...created.userIds]

  await withDbRetry(async () => {
    if (donorIds.length || requestIds.length) {
      await prisma.match.deleteMany({
        where: { OR: [{ donorId: { in: donorIds } }, { requestId: { in: requestIds } }] }
      })
    }

    if (hospitalIds.length || requestIds.length) {
      await prisma.bloodRequest.deleteMany({
        where: { OR: [{ hospitalId: { in: hospitalIds } }, { id: { in: requestIds } }] }
      })
      await prisma.inventory.deleteMany({ where: { hospitalId: { in: hospitalIds } } })
    }

    if (donorIds.length || userIds.length) {
      await prisma.donor.deleteMany({
        where: { OR: [{ id: { in: donorIds } }, { userId: { in: userIds } }] }
      })
    }

    if (hospitalIds.length || userIds.length) {
      await prisma.hospital.deleteMany({
        where: { OR: [{ id: { in: hospitalIds } }, { userId: { in: userIds } }] }
      })
    }

    if (userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }
  })

  created.userIds.clear()
  created.donorIds.clear()
  created.hospitalIds.clear()
  created.requestIds.clear()
}

export { prisma }
