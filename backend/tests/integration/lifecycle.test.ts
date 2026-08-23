import request from 'supertest'

jest.mock('axios')
jest.mock('../../src/services/cloudinary.service', () => require('../helpers/externalMocks').cloudinaryServiceMock())

import axios from 'axios'
import app from '../../src/app'
import { requireTestDatabase } from '../helpers/db'
import { installExternalMocks, CLOUDINARY_MOCK_PUBLIC_ID } from '../helpers/externalMocks'
import {
  createDonorFixture,
  createHospitalFixture,
  cleanupFixtures,
  trackRequest,
  prisma,
  type DonorFixture
} from '../helpers/factories'
import { BloodGroup, MatchStatus, RequestStatus } from '../../prisma/generated'

/**
 * The full request lifecycle, end to end, against a real database.
 *
 * Everything runs at coordinates in the Gulf of Guinea rather than D.I. Khan. Escalation
 * searches for *any* eligible donor in radius, so seeded or leftover rows on the test
 * branch would otherwise be able to win a replacement slot and make the assertions about
 * which donor was picked non-deterministic. Nothing real is anywhere near 0.5N 0.5E, so the
 * only candidates are the five this file creates.
 *
 * O− is the requested group because its compatible-donor list is exactly [O_NEG] — no
 * cross-type substitution to reason about while following the escalation chain.
 *
 * Commitment scores are spaced 10 apart so the ranking stub (highest score first) has a
 * single unambiguous answer at every step.
 */

const LAT = 0.5
const LON = 0.5

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

function nearby(index: number) {
  // A few hundred metres apart, all comfortably inside the innermost 10km tier.
  return { latitude: LAT + index * 0.002, longitude: LON }
}

async function createDonorPool(): Promise<DonorFixture[]> {
  const scores = [90, 80, 70, 60, 50]
  // Created concurrently: each fixture is two round trips to a remote Neon branch, and doing
  // ten of them in series was a large fraction of this test's runtime. The rows are
  // independent, and Promise.all preserves order — but nothing here depends on creation
  // order anyway, since ranking is decided by the (unique) commitment scores.
  return Promise.all(
    scores.map((commitmentScore, i) =>
      createDonorFixture({
        bloodGroup: BloodGroup.O_NEG,
        commitmentScore,
        name: `Donor ${i + 1}`,
        ...nearby(i)
      })
    )
  )
}

async function matchesFor(requestId: string) {
  return prisma.match.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } })
}

async function scoreOf(donorId: string) {
  return (await prisma.donor.findUniqueOrThrow({ where: { id: donorId } })).commitmentScore
}

describe('blood request lifecycle', () => {
  it('carries a request from posting, through a decline and a no-show, to a confirmed donation', async () => {
    const hospital = await createHospitalFixture({ latitude: LAT, longitude: LON })
    const [d1, d2, d3, d4, d5] = await createDonorPool()

    // ---- 1. The hospital posts a request -------------------------------------------
    const created = await request(app)
      .post('/api/requests')
      .set('Authorization', hospital.authHeader)
      .send({ bloodGroup: 'O_NEG', units: 1, urgency: 'URGENT', notes: 'Lifecycle test' })

    expect(created.status).toBe(201)
    const requestId: string = created.body.request.id
    trackRequest(requestId)

    // The three highest-scoring donors are notified; the remaining two are held in reserve.
    expect(created.body.matchedDonors).toBe(3)

    let matches = await matchesFor(requestId)
    expect(matches.map(m => m.donorId).sort()).toEqual([d1.donorId, d2.donorId, d3.donorId].sort())
    expect(matches.every(m => m.status === MatchStatus.PENDING)).toBe(true)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.PENDING)

    // ---- 2. The top donor declines -------------------------------------------------
    const firstMatch = matches.find(m => m.donorId === d1.donorId)!

    const decline = await request(app)
      .put(`/api/donor/matches/${firstMatch.id}`)
      .set('Authorization', d1.authHeader)
      .send({ status: 'DECLINED' })

    expect(decline.status).toBe(200)
    expect(await scoreOf(d1.donorId)).toBe(85) // 90 - 5

    // ---- 3. A replacement is found, and it is not the donor who just declined ------
    matches = await matchesFor(requestId)
    expect(matches).toHaveLength(4)

    const replacement = matches[3]
    expect(replacement.donorId).toBe(d4.donorId)
    expect(replacement.status).toBe(MatchStatus.PENDING)

    // The whole point of the exclusion list: nobody gets asked twice.
    expect(matches.filter(m => m.donorId === d1.donorId)).toHaveLength(1)

    // ---- 4. The replacement donor accepts ------------------------------------------
    const accept = await request(app)
      .put(`/api/donor/matches/${replacement.id}`)
      .set('Authorization', d4.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(accept.status).toBe(200)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.MATCHED)

    // ---- 5. That donor never turns up ----------------------------------------------
    const noShow = await request(app)
      .patch(`/api/hospital/matches/${replacement.id}/no-show`)
      .set('Authorization', hospital.authHeader)

    expect(noShow.status).toBe(200)
    expect((await prisma.match.findUniqueOrThrow({ where: { id: replacement.id } })).status)
      .toBe(MatchStatus.NO_SHOW)
    expect(await scoreOf(d4.donorId)).toBe(50) // 60 - 10

    // The request goes back into the pool rather than stalling on a donor who vanished.
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.PENDING)

    // ---- 6. A second replacement is found, excluding all four donors tried so far ---
    matches = await matchesFor(requestId)
    expect(matches).toHaveLength(5)

    const secondReplacement = matches[4]
    expect(secondReplacement.donorId).toBe(d5.donorId)
    expect(secondReplacement.status).toBe(MatchStatus.PENDING)

    // ---- 7. The second replacement accepts -----------------------------------------
    const secondAccept = await request(app)
      .put(`/api/donor/matches/${secondReplacement.id}`)
      .set('Authorization', d5.authHeader)
      .send({ status: 'ACCEPTED' })

    expect(secondAccept.status).toBe(200)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.MATCHED)

    // ---- 8. The hospital confirms the donation with a photo -------------------------
    const fulfil = await request(app)
      .put(`/api/hospital/requests/${requestId}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'blood-bag.jpg', contentType: 'image/jpeg' })

    expect(fulfil.status).toBe(200)

    // ---- Final state ----------------------------------------------------------------
    const finalRequest = await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })
    expect(finalRequest.status).toBe(RequestStatus.FULFILLED)

    const completedMatch = await prisma.match.findUniqueOrThrow({ where: { id: secondReplacement.id } })
    expect(completedMatch.status).toBe(MatchStatus.COMPLETED)
    expect(completedMatch.photoPublicId).toBe(CLOUDINARY_MOCK_PUBLIC_ID)
    expect(completedMatch.photoUploadedAt).not.toBeNull()

    const donatingDonor = await prisma.donor.findUniqueOrThrow({ where: { id: d5.donorId } })
    expect(donatingDonor.commitmentScore).toBe(60) // 50 + 10
    expect(donatingDonor.lastDonated).not.toBeNull()

    // Each participant ended where their own behaviour put them.
    expect(await scoreOf(d1.donorId)).toBe(85) // declined
    expect(await scoreOf(d2.donorId)).toBe(80) // never responded
    expect(await scoreOf(d3.donorId)).toBe(70) // never responded
    expect(await scoreOf(d4.donorId)).toBe(50) // no-show

    // No donor was ever approached twice for this request.
    const finalMatches = await matchesFor(requestId)
    const donorIds = finalMatches.map(m => m.donorId)
    expect(new Set(donorIds).size).toBe(donorIds.length)
    expect(finalMatches).toHaveLength(5)

    expect(finalMatches.find(m => m.donorId === d1.donorId)!.status).toBe(MatchStatus.DECLINED)
    expect(finalMatches.find(m => m.donorId === d4.donorId)!.status).toBe(MatchStatus.NO_SHOW)
    // Longer than the suite default: this single test makes roughly twenty sequential round
    // trips to a remote database, and each escalation step has to complete before the next
    // request can be made. The other suites are comfortable inside 60s.
  }, 180_000)

  it('does not let a donor who replies late reopen a request that is already fulfilled', async () => {
    // The unanswered matches from the run above are still PENDING after fulfilment, so a
    // donor tapping Accept on a stale notification is a real sequence. Their acceptance
    // must not drag the request back to MATCHED.
    const hospital = await createHospitalFixture({ latitude: LAT, longitude: LON })
    const [d1, d2] = await createDonorPool()

    const created = await request(app)
      .post('/api/requests')
      .set('Authorization', hospital.authHeader)
      .send({ bloodGroup: 'O_NEG', units: 1, urgency: 'NORMAL' })
    const requestId: string = created.body.request.id
    trackRequest(requestId)

    const matches = await matchesFor(requestId)
    const first = matches.find(m => m.donorId === d1.donorId)!
    const second = matches.find(m => m.donorId === d2.donorId)!

    await request(app)
      .put(`/api/donor/matches/${first.id}`)
      .set('Authorization', d1.authHeader)
      .send({ status: 'ACCEPTED' })

    await request(app)
      .put(`/api/hospital/requests/${requestId}/fulfill`)
      .set('Authorization', hospital.authHeader)
      .attach('photo', PHOTO, { filename: 'blood-bag.jpg', contentType: 'image/jpeg' })

    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.FULFILLED)

    const lateAccept = await request(app)
      .put(`/api/donor/matches/${second.id}`)
      .set('Authorization', d2.authHeader)
      .send({ status: 'ACCEPTED' })

    // The late acceptance is legitimate in itself, so it is not an error — but the request
    // stays fulfilled, and the late donor is credited nothing.
    expect(lateAccept.status).toBe(200)
    expect((await prisma.bloodRequest.findUniqueOrThrow({ where: { id: requestId } })).status)
      .toBe(RequestStatus.FULFILLED)
    expect(await scoreOf(d2.donorId)).toBe(80)
    expect((await prisma.donor.findUniqueOrThrow({ where: { id: d2.donorId } })).lastDonated)
      .toBeNull()
  })
})
