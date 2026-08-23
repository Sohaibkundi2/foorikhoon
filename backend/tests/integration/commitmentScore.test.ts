import request from 'supertest'

jest.mock('axios')
jest.mock('../../src/services/cloudinary.service', () => require('../helpers/externalMocks').cloudinaryServiceMock())

import axios from 'axios'
import app from '../../src/app'
import { requireTestDatabase } from '../helpers/db'
import { installExternalMocks, failAiMatch, CLOUDINARY_MOCK_PUBLIC_ID } from '../helpers/externalMocks'
import {
  createDonorFixture,
  createHospitalFixture,
  createRequestFixture,
  createMatchFixture,
  cleanupFixtures,
  prisma
} from '../helpers/factories'
import { MatchStatus, RequestStatus } from '../../prisma/generated'

/**
 * Commitment score arithmetic, exercised through the real endpoints.
 *
 * There is no shared scoring helper to unit test — the clamping is written inline at three
 * separate call sites (donor.controller respondToMatch, hospital.controller fulfillRequest
 * and reportNoShow). Driving each site through its endpoint is therefore the only way to
 * cover all three, and has the side benefit of proving the clamp survives the surrounding
 * transaction. Extracting a helper would make these unit-testable; see the note in the
 * suite README.
 *
 * Every request asserts its own status code before the score is inspected. Without that, an
 * endpoint returning 500 leaves the score untouched and the failure reads as a clamping bug
 * ("expected 0, received 3") rather than naming the request that actually broke.
 */

const PHOTO = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwc' +
  'JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDc0NP/bAEMBCQkJDAsMGA0NGDIhHCEyMjIyMjIyMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgAAQABAwEiAAIRAQMRAf/EABUA' +
  'AQEAAAAAAAAAAAAAAAAAAAAG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKAA//9k=',
  'base64'
)

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

async function scoreOf(donorId: string): Promise<number> {
  return (await prisma.donor.findUniqueOrThrow({ where: { id: donorId } })).commitmentScore
}

describe('declining a match', () => {
  it('deducts 5 points from the declining donor', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(45)
  })

  it('floors the score at zero rather than going negative', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 3 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(0)
  })

  it('leaves a zero score at zero', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 0 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(0)
  })

  it('does not deduct a second time when the same match is declined again', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const first = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })
    const second = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(first.status).toBe(200)
    expect(second.status).toBe(400)
    expect(await scoreOf(donor.donorId)).toBe(45)
  })

  it('does not touch the donor\'s last donation date', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })).lastDonated)
      .toBeNull()
  })
})

describe('accepting a match', () => {
  it('leaves the commitment score unchanged', async () => {
    // Points are awarded for donating, not for volunteering — otherwise a donor could farm
    // score by accepting and never turning up.
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(50)
  })

  it('moves the request to MATCHED without recording a donation', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(response.status).toBe(200)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.MATCHED)

    const updatedDonor = await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })
    expect(updatedDonor.commitmentScore).toBe(50)
    expect(updatedDonor.lastDonated).toBeNull()
  })
})

describe('reporting a no-show', () => {
  it('deducts 10 points from the donor who did not turn up', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 60 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const response = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(50)
  })

  it('floors the score at zero rather than going negative', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 5 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const response = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(0)
  })

  it('does not deduct a second time when the same no-show is reported again', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 60 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const first = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)
    const second = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(first.status).toBe(200)
    expect(second.status).toBe(400)
    expect(await scoreOf(donor.donorId)).toBe(50)
  })

  it('rejects a no-show on a match the donor never accepted', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 60 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.PENDING
    })

    const response = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(response.status).toBe(400)
    expect(await scoreOf(donor.donorId)).toBe(60)
  })
})

describe('confirming a donation', () => {
  it('awards 10 points and records the donation date', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 40 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const before = Date.now()
    const response = await request(app)
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(200)

    const updatedDonor = await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })
    expect(updatedDonor.commitmentScore).toBe(50)
    expect(updatedDonor.lastDonated).not.toBeNull()
    expect(updatedDonor.lastDonated!.getTime()).toBeGreaterThanOrEqual(before - 1000)

    const updatedMatch = await prisma.match.findUniqueOrThrow({ where: { id: match.id } })
    expect(updatedMatch.status).toBe(MatchStatus.COMPLETED)
    expect(updatedMatch.photoPublicId).toBe(CLOUDINARY_MOCK_PUBLIC_ID)
    expect(updatedMatch.photoUploadedAt).not.toBeNull()
  })

  it('caps the score at 100 rather than exceeding it', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 95 })
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
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(100)
  })

  it('leaves a maxed-out score at 100', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 100 })
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
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(200)
    expect(await scoreOf(donor.donorId)).toBe(100)
  })

  it('rejects a fulfilment with no photo attached, and awards nothing', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 40 })
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
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('photo')
    expect(await scoreOf(donor.donorId)).toBe(40)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.MATCHED)
  })

  it('rejects a fulfilment when no donor has accepted, and awards nothing', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 40 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.PENDING
    })

    const response = await request(app)
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(400)
    expect(await scoreOf(donor.donorId)).toBe(40)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })).lastDonated)
      .toBeNull()
  })

  it('does not award a second time when the same request is fulfilled again', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 40 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    const first = await request(app)
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })
    const second = await request(app)
      .put(`/api/hospital/requests/${bloodRequest.id}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'bag.jpg', contentType: 'image/jpeg' })

    expect(first.status).toBe(200)
    expect(second.status).toBe(400)
    expect(await scoreOf(donor.donorId)).toBe(50)
  })
})

/**
 * Escalation runs after the write the client asked for has already committed, and it depends
 * on the Python scoring engine answering over the network. It used to be awaited inside the
 * same `try` as the primary write, so when it threw the client got a 500 for an action that
 * had succeeded — and because the status transition was already spent, the retry was rejected
 * by the transition guard (NO_SHOW → NO_SHOW is not legal). The action was permanently
 * reported as failed while actually being complete, with the score already deducted.
 *
 * Each test here needs a *second* eligible donor in radius, otherwise `findEligibleDonors`
 * returns nothing, escalation short-circuits before the HTTP call, and the failure being
 * tested never gets a chance to happen.
 */
describe('escalation failure is invisible to the client', () => {
  it('still records a no-show and its deduction when the scoring engine is unreachable', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 60 })
    // The replacement candidate escalation will try to rank, and fail to.
    await createDonorFixture({ commitmentScore: 70 })
    const bloodRequest = await createRequestFixture({
      hospitalId: hospital.hospitalId,
      status: RequestStatus.MATCHED
    })
    const match = await createMatchFixture({
      requestId: bloodRequest.id,
      donorId: donor.donorId,
      status: MatchStatus.ACCEPTED
    })

    failAiMatch(axios as unknown as jest.Mocked<typeof axios>)

    const response = await request(app)
      .patch(`/api/hospital/matches/${match.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(response.status).toBe(200)
    expect((await prisma.match.findUniqueOrThrow({ where: { id: match.id } })).status)
      .toBe(MatchStatus.NO_SHOW)
    expect(await scoreOf(donor.donorId)).toBe(50)

    // The request is back in the pool, but nobody new was approached — that is the visible
    // cost of the failed escalation, and it is the only cost.
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: bloodRequest.id } })).status)
      .toBe(RequestStatus.PENDING)
    expect(await prisma.match.count({ where: { requestId: bloodRequest.id } })).toBe(1)
  })

  it('still records a decline and its deduction when the scoring engine is unreachable', async () => {
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    await createDonorFixture({ commitmentScore: 70 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    failAiMatch(axios as unknown as jest.Mocked<typeof axios>)

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)
    expect((await prisma.match.findUniqueOrThrow({ where: { id: match.id } })).status)
      .toBe(MatchStatus.DECLINED)
    expect(await scoreOf(donor.donorId)).toBe(45)
    expect(await prisma.match.count({ where: { requestId: bloodRequest.id } })).toBe(1)
  })

  it('reaches the scoring engine at all, so the two tests above are not vacuous', async () => {
    // Without this, a bug that stopped escalation from ever running would make the failure
    // tests pass for the wrong reason: no HTTP call, no throw, nothing to swallow.
    const hospital = await createHospitalFixture()
    const donor = await createDonorFixture({ commitmentScore: 50 })
    const replacement = await createDonorFixture({ commitmentScore: 70 })
    const bloodRequest = await createRequestFixture({ hospitalId: hospital.hospitalId })
    const match = await createMatchFixture({ requestId: bloodRequest.id, donorId: donor.donorId })

    const response = await request(app)
      .put(`/api/donor/matches/${match.id}`)
      .set('Authorization', donor.authHeader)
      .send({ status: 'DECLINED' })

    expect(response.status).toBe(200)

    const matches = await prisma.match.findMany({ where: { requestId: bloodRequest.id } })
    expect(matches).toHaveLength(2)
    expect(matches.map(m => m.donorId)).toContain(replacement.donorId)
  })
})
