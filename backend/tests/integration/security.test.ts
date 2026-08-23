import request from 'supertest'

jest.mock('axios')
jest.mock('../../src/services/cloudinary.service', () => require('../helpers/externalMocks').cloudinaryServiceMock())

import axios from 'axios'
import app from '../../src/app'
import { requireTestDatabase } from '../helpers/db'
import { installExternalMocks } from '../helpers/externalMocks'
import { findForbiddenFields } from '../helpers/payload'
import {
  createDonorFixture,
  createHospitalFixture,
  createRequestFixture,
  createMatchFixture,
  cleanupFixtures,
  trackUser,
  prisma
} from '../helpers/factories'
import { BloodGroup, MatchStatus, RequestStatus } from '../../prisma/generated'

/**
 * Regression tests for the authorization and data-exposure fixes.
 *
 * Each one asserts two things: that the request is rejected, and that nothing changed in
 * the database as a result. A 403 that still wrote the row would pass a status-code-only
 * test while leaving the vulnerability fully exploitable.
 */

beforeAll(async () => {
  await requireTestDatabase()
})

beforeEach(() => {
  installExternalMocks(axios as unknown as jest.Mocked<typeof axios>)
})

afterEach(async () => {
  await cleanupFixtures()
})

afterAll(async () => {
  await prisma.$disconnect()
})

const A_ONE_PIXEL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwc' +
  'JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDc0NP/bAEMBCQkJDAsMGA0NGDIhHCEyMjIyMjIyMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgAAQABAwEiAAIRAQMRAf/EABUA' +
  'AQEAAAAAAAAAAAAAAAAAAAAG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKAA//9k=',
  'base64'
)

describe('admin registration lockdown', () => {
  it('creates a plain donor when the request body asks for the ADMIN role', async () => {
    const email = `forikhoon-test-admin-probe-${Date.now()}@example.test`

    const response = await request(app).post('/api/auth/register').send({
      email,
      password: 'not-a-real-password',
      name: 'Privilege Escalation Probe',
      phone: '03001234567',
      city: 'D.I. Khan',
      role: 'ADMIN'
    })

    expect(response.status).toBe(201)
    trackUser(response.body.user.id)

    // The response body doesn't echo the role, so the assertion has to read the row: the
    // whole point of the fix is what got persisted, not what got rendered.
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } })
    expect(stored.role).toBe('DONOR')
  })

  it('creates a plain donor when the request body asks for an unrecognised role', async () => {
    const email = `forikhoon-test-role-probe-${Date.now()}@example.test`

    const response = await request(app).post('/api/auth/register').send({
      email,
      password: 'not-a-real-password',
      name: 'Unknown Role Probe',
      city: 'D.I. Khan',
      role: 'SUPERUSER'
    })

    expect(response.status).toBe(201)
    trackUser(response.body.user.id)

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } })
    expect(stored.role).toBe('DONOR')
  })

  it('still honours the two roles a user is allowed to sign up as', async () => {
    const donorEmail = `forikhoon-test-signup-donor-${Date.now()}@example.test`
    const hospitalEmail = `forikhoon-test-signup-hospital-${Date.now()}@example.test`

    const donorResponse = await request(app).post('/api/auth/register').send({
      email: donorEmail, password: 'pw', name: 'Donor', city: 'D.I. Khan', role: 'DONOR'
    })
    const hospitalResponse = await request(app).post('/api/auth/register').send({
      email: hospitalEmail, password: 'pw', name: 'Hospital', city: 'D.I. Khan', role: 'HOSPITAL'
    })

    trackUser(donorResponse.body.user.id)
    trackUser(hospitalResponse.body.user.id)

    expect((await prisma.user.findUniqueOrThrow({ where: { email: donorEmail } })).role).toBe('DONOR')
    expect((await prisma.user.findUniqueOrThrow({ where: { email: hospitalEmail } })).role).toBe('HOSPITAL')
  })

  it('never returns the password hash from the registration response', async () => {
    const email = `forikhoon-test-register-leak-${Date.now()}@example.test`

    const response = await request(app).post('/api/auth/register').send({
      email, password: 'not-a-real-password', name: 'Leak Probe', city: 'D.I. Khan'
    })

    trackUser(response.body.user.id)
    expect(findForbiddenFields(response.body, ['password'])).toEqual([])
  })
})

describe('donor match ownership', () => {
  it('rejects a donor responding to another donor\'s match', async () => {
    const hospital = await createHospitalFixture()
    const donorA = await createDonorFixture({ commitmentScore: 50 })
    const donorB = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const matchForB = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donorB.donorId
    })

    const response = await request(app)
      .put(`/api/donor/matches/${matchForB.id}`)
      .set('Authorization', donorA.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('This match does not belong to you')

    const unchanged = await prisma.match.findUniqueOrThrow({ where: { id: matchForB.id } })
    expect(unchanged.status).toBe(MatchStatus.PENDING)
    expect(unchanged.respondedAt).toBeNull()
  })

  it('rejects a donor declining another donor\'s match, and leaves both scores intact', async () => {
    // A decline is the more damaging direction: it deducts 5 points from a donor and
    // triggers an escalation that burns through the replacement pool.
    const hospital = await createHospitalFixture()
    const donorA = await createDonorFixture({ commitmentScore: 50 })
    const donorB = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const matchForB = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donorB.donorId
    })

    const response = await request(app)
      .put(`/api/donor/matches/${matchForB.id}`)
      .set('Authorization', donorA.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(403)

    expect((await prisma.match.findUniqueOrThrow({ where: { id: matchForB.id } })).status)
      .toBe(MatchStatus.PENDING)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donorA.donorId } })).commitmentScore)
      .toBe(50)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donorB.donorId } })).commitmentScore)
      .toBe(50)
    // No escalation should have run, so no replacement match exists.
    expect(await prisma.match.count({ where: { requestId: bloodRequest.id } })).toBe(1)
  })

  it('lets a donor respond to their own match', async () => {
    // The counterpart to the two rejections above: the ownership check must not be so
    // broad that it also blocks the legitimate path.
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const ownMatch = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId
    })

    const response = await request(app)
      .put(`/api/donor/matches/${ownMatch.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(response.status).toBe(200)
    expect((await prisma.match.findUniqueOrThrow({ where: { id: ownMatch.id } })).status)
      .toBe(MatchStatus.ACCEPTED)
  })

  it('rejects a donor awarding themselves a COMPLETED match', async () => {
    // COMPLETED mints a hero certificate and +10 points, and is hospital-confirmed only.
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const ownMatch = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const response = await request(app)
      .put(`/api/donor/matches/${ownMatch.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'COMPLETED' })

    expect(response.status).toBe(403)
    expect((await prisma.match.findUniqueOrThrow({ where: { id: ownMatch.id } })).status)
      .toBe(MatchStatus.ACCEPTED)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })).commitmentScore)
      .toBe(50)
  })
})

describe('hospital ownership of a blood request', () => {
  it('rejects a hospital changing another hospital\'s request status', async () => {
    const owner = await createHospitalFixture({ name: 'Owning Hospital' })
    const attacker = await createHospitalFixture({ name: 'Other Hospital' })
    const bloodRequest = await createRequestFixture({ hospitalId: owner.hospitalId })

    const response = await request(app)
      .put(`/api/requests/${bloodRequest.id}`)
      .set('Authorization', attacker.authHeader)
      .send({ newStatus: 'EXPIRED' })

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('This request belongs to another hospital')

    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.PENDING)
  })

  it('rejects a hospital fulfilling another hospital\'s request', async () => {
    const owner = await createHospitalFixture({ name: 'Owning Hospital' })
    const attacker = await createHospitalFixture({ name: 'Other Hospital' })
    const donor = await createDonorFixture({ commitmentScore: 40 })
    const bloodRequest = await createRequestFixture({
      hospitalId: owner.hospitalId,
      status: RequestStatus.MATCHED
    })
    const acceptedMatch = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    // A complete, otherwise-valid payload — so the rejection can only be the ownership check.
    const response = await request(app)
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', attacker.authHeader)
      .attach('photo', A_ONE_PIXEL_JPEG, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('You can only fulfil your own requests')

    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.MATCHED)

    const match = await prisma.match.findUniqueOrThrow({ where: { id: acceptedMatch.id } })
    expect(match.status).toBe(MatchStatus.ACCEPTED)
    expect(match.photoPublicId).toBeNull()

    const unchangedDonor = await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })
    expect(unchangedDonor.commitmentScore).toBe(40)
    expect(unchangedDonor.lastDonated).toBeNull()
  })

  it('rejects a hospital reporting a no-show on another hospital\'s match', async () => {
    const owner = await createHospitalFixture({ name: 'Owning Hospital' })
    const attacker = await createHospitalFixture({ name: 'Other Hospital' })
    const donor = await createDonorFixture({ commitmentScore: 60 })
    const bloodRequest = await createRequestFixture({
      hospitalId: owner.hospitalId,
      status: RequestStatus.MATCHED
    })
    const acceptedMatch = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const response = await request(app)
      .patch(`/api/hospital/matches/${acceptedMatch.id}/no-show`)
      .set('Authorization', attacker.authHeader)

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('You can only report no-shows on your own requests')

    expect((await prisma.match.findUniqueOrThrow({ where: { id: acceptedMatch.id } })).status)
      .toBe(MatchStatus.ACCEPTED)
    // The no-show penalty is the heaviest in the system; it must not have been applied.
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })).commitmentScore)
      .toBe(60)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.MATCHED)
  })

  it('lets the owning hospital report a no-show and then expire its own request', async () => {
    const owner = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 40 })
    const bloodRequest = await createRequestFixture({
      hospitalId: owner.hospitalId,
      status: RequestStatus.MATCHED
    })
    const acceptedMatch = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const noShow = await request(app)
      .patch(`/api/hospital/matches/${acceptedMatch.id}/no-show`)
      .set('Authorization', owner.authHeader)
    expect(noShow.status).toBe(200)

    // The no-show escalated the request back to PENDING; expiring it is the owner's call.
    const expire = await request(app)
      .put(`/api/requests/${bloodRequest.id}`)
      .set('Authorization', owner.authHeader)
      .send({ newStatus: 'EXPIRED' })
    expect(expire.status).toBe(200)
    expect(expire.body.request.status).toBe(RequestStatus.EXPIRED)
  })
})

describe('cancelling a request that already has a donor', () => {
  it('lets a hospital expire its own MATCHED request', async () => {
    // MATCHED -> EXPIRED is intentionally legal, not an oversight: both clients show a
    // Cancel button on matched requests, because a patient can be transferred or sourced
    // blood elsewhere after a donor accepted. See the note in lib/statusTransitions.ts.
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture()
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const response = await request(app)
      .put(`/api/requests/${bloodRequest.id}`)
      .set('Authorization', hospital.authHeader)
      .send({ newStatus: 'EXPIRED' })

    expect(response.status).toBe(200)
    expect(response.body.request.status).toBe(RequestStatus.EXPIRED)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.EXPIRED)
  })

  it('rejects fulfilling a request through the generic status endpoint', async () => {
    const hospital = await createHospitalFixture()
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })

    const response = await request(app)
      .put(`/api/requests/${bloodRequest.id}`)
      .set('Authorization', hospital.authHeader)
      .send({ newStatus: 'FULFILLED' })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('/fulfill')
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.MATCHED)
  })

  it('rejects reopening a request it has already expired', async () => {
    const hospital = await createHospitalFixture()
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.EXPIRED
    })

    const response = await request(app)
      .put(`/api/requests/${bloodRequest.id}`)
      .set('Authorization', hospital.authHeader)
      .send({ newStatus: 'PENDING' })

    expect(response.status).toBe(400)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.EXPIRED)
  })
})

describe('the public request feed does not leak private fields', () => {
  /**
   * These endpoints are mounted without `authenticate`, so everything they return is world
   * readable. The scan walks the entire response body rather than checking the one nesting
   * the test author had in mind — a leak reintroduced through a different relation would
   * still be caught.
   */
  const NEVER_PUBLIC = ['password', 'pushToken', 'responseToken', 'photoPublicId']

  it('exposes no password hash, push token, response token or photo id to an anonymous caller', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ pushToken: 'ExponentPushToken[donor-secret]' })
    await prisma.hospital.update({
      where: { id: hospital.hospitalId },
      data: { pushToken: 'ExponentPushToken[hospital-secret]' }
    })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      responseToken: 'secret-response-token',
      photoPublicId: 'foorikhoon/donations/secret'
    })

    const response = await request(app).get('/api/requests')

    expect(response.status).toBe(200)
    expect(findForbiddenFields(response.body, NEVER_PUBLIC)).toEqual([])

    // Confirm the fixture is actually in the payload — an empty feed would pass vacuously.
    const ids = response.body.requests.map((r: { id: string }) => r.id)
    expect(ids).toContain(bloodRequest.id)
  })

  it('exposes only the match id, not which donors were approached', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture()
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app).get('/api/requests')
    const feedEntry = response.body.requests.find((r: { id: string }) => r.id === bloodRequest.id)

    expect(feedEntry.matches).toHaveLength(1)
    // donorId would let anyone enumerate which donors were asked for which blood group.
    expect(Object.keys(feedEntry.matches[0])).toEqual(['id'])
  })

  it('exposes no hospital licence number or email on the detail endpoint', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture()
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      responseToken: 'another-secret-token'
    })

    const response = await request(app).get(`/api/requests/${bloodRequest.id}`)

    expect(response.status).toBe(200)
    expect(findForbiddenFields(response.body, [...NEVER_PUBLIC, 'licenseNo', 'email', 'phone']))
      .toEqual([])
    // Not a vacuous pass — the hospital relation really was serialised.
    expect(response.body.request.hospital.id).toBe(hospital.hospitalId)
  })

  it('still returns the fields the request feed renders', async () => {
    // The narrowing must not have removed anything the clients depend on.
    const hospital = await createHospitalFixture({ name: 'Rendered Hospital', verified: true })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      bloodGroup: BloodGroup.O_NEG,
      units: 2
    })

    const response = await request(app).get(`/api/requests/${bloodRequest.id}`)
    const body = response.body.request

    expect(body.bloodGroup).toBe(BloodGroup.O_NEG)
    expect(body.units).toBe(2)
    expect(body.hospital.name).toBe('Rendered Hospital')
    expect(body.hospital.address).toBeDefined()
    expect(body.hospital.verified).toBe(true)
    expect(body.hospital.latitude).toBeDefined()
    expect(body.hospital.user.city).toBe('D.I. Khan')
  })
})
