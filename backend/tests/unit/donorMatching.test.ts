import { BloodGroup } from '../../prisma/generated'

/**
 * Unit tests for the shared eligibility query, with Prisma mocked.
 *
 * Scope note: the 90-day window, the availability flag and the exclusion list are all
 * enforced *by Postgres* via the WHERE clause this function builds — so a mocked client
 * can only verify that the clause is correct, not that the database honours it. These
 * tests therefore cover the parts that genuinely live in application code: the shape of
 * the filter, the radius-tier escalation, and the precise haversine pass that trims the
 * bounding box's false positives.
 *
 * The behavioural assertions the brief asks for (89 days excluded, exactly 90 included,
 * null included) run against a real Postgres branch in
 * tests/integration/donorEligibility.test.ts, where the date comparison actually executes.
 */

const findManyMock = jest.fn()

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: { donor: { findMany: findManyMock } }
}))

// Imported after the mock is registered so the module under test picks it up.
import { findEligibleDonors } from '../../src/lib/donorMatching'
import { RADIUS_TIERS_KM, haversineDistance } from '../../src/lib/distance'

const HOSPITAL_LAT = 31.83
const HOSPITAL_LON = 70.9

interface FakeDonorOptions {
  id?: string
  bloodGroup?: BloodGroup
  latitude?: number
  longitude?: number
  commitmentScore?: number
}

function fakeDonor(options: FakeDonorOptions = {}) {
  return {
    id: options.id ?? 'donor-1',
    userId: 'user-1',
    bloodGroup: options.bloodGroup ?? BloodGroup.A_POS,
    lastDonated: null,
    isAvailable: true,
    commitmentScore: options.commitmentScore ?? 0,
    area: 'Test area',
    latitude: options.latitude ?? HOSPITAL_LAT,
    longitude: options.longitude ?? HOSPITAL_LON,
    pushToken: null,
    shareContactInfo: false,
    user: { id: 'user-1', name: 'Test Donor', city: 'D.I. Khan' }
  }
}

/** A point inside the square bounding box for `radiusKm` but outside the circle. */
function boundingBoxCorner(radiusKm: number) {
  return {
    latitude: HOSPITAL_LAT + radiusKm / 111,
    longitude: HOSPITAL_LON + radiusKm / (111 * Math.cos((HOSPITAL_LAT * Math.PI) / 180))
  }
}

beforeEach(() => {
  findManyMock.mockReset()
})

describe('findEligibleDonors — eligibility filter', () => {
  it('only ever asks the database for available donors', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    expect(findManyMock).toHaveBeenCalled()
    const where = findManyMock.mock.calls[0][0].where
    expect(where.isAvailable).toBe(true)
  })

  it('restricts candidates to the compatible blood groups it was given', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS, BloodGroup.A_NEG])

    const where = findManyMock.mock.calls[0][0].where
    expect(where.bloodGroup).toEqual({ in: [BloodGroup.A_POS, BloodGroup.A_NEG] })
  })

  it('accepts donors who have never donated, or who last donated at least 90 days ago', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    const before = Date.now()
    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])
    const after = Date.now()

    const where = findManyMock.mock.calls[0][0].where
    expect(where.OR).toHaveLength(2)
    expect(where.OR[0]).toEqual({ lastDonated: null })

    const cutoff: Date = where.OR[1].lastDonated.lte
    expect(cutoff).toBeInstanceOf(Date)

    // The cutoff must sit 90 days before "now", allowing for the clock advancing during
    // the call. Anything else would silently widen or narrow the recovery window.
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - ninetyDaysMs - 1000)
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - ninetyDaysMs + 1000)
  })

  it('excludes donors already tried for this request', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS], ['donor-a', 'donor-b'])

    const where = findManyMock.mock.calls[0][0].where
    expect(where.id).toEqual({ notIn: ['donor-a', 'donor-b'] })
  })

  it('excludes nobody when no exclusion list is passed', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    const where = findManyMock.mock.calls[0][0].where
    expect(where.id).toEqual({ notIn: [] })
  })

  it('loads each candidate with their user record, since matching needs the name and city', async () => {
    findManyMock.mockResolvedValue([fakeDonor()])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    expect(findManyMock.mock.calls[0][0].include).toEqual({ user: true })
  })
})

describe('findEligibleDonors — radius escalation', () => {
  it('returns donors from the closest tier that has any, without widening further', async () => {
    findManyMock.mockResolvedValue([fakeDonor({ latitude: HOSPITAL_LAT + 0.01 })])

    const result = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    expect(result.radiusUsed).toBe(RADIUS_TIERS_KM[0])
    expect(result.matches).toHaveLength(1)
    // Stops at the first productive tier — one query, not four.
    expect(findManyMock).toHaveBeenCalledTimes(1)
  })

  it('widens to the next tier when the closest one has no candidates at all', async () => {
    findManyMock
      .mockResolvedValueOnce([]) // 10km
      .mockResolvedValueOnce([fakeDonor({ latitude: HOSPITAL_LAT + 0.1 })]) // 25km

    const result = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    expect(result.radiusUsed).toBe(RADIUS_TIERS_KM[1])
    expect(result.matches).toHaveLength(1)
    expect(findManyMock).toHaveBeenCalledTimes(2)
  })

  it('discards bounding-box matches that fall outside the true radius', async () => {
    // The SQL pre-filter is a square, so its corners lie ~1.41x the radius away. A donor
    // parked in that corner must not count as within the tier.
    const corner = boundingBoxCorner(RADIUS_TIERS_KM[0])
    const cornerDistance = haversineDistance(HOSPITAL_LAT, HOSPITAL_LON, corner.latitude, corner.longitude)
    expect(cornerDistance).toBeGreaterThan(RADIUS_TIERS_KM[0])

    findManyMock.mockResolvedValue([fakeDonor({ ...corner })])

    const result = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    // Rejected at 10km, accepted once the tier widens past its true distance.
    expect(result.radiusUsed).toBe(RADIUS_TIERS_KM[1])
    expect(result.matches).toHaveLength(1)
  })

  it('reports the true distance for each donor it returns', async () => {
    const donorLat = HOSPITAL_LAT + 0.02
    findManyMock.mockResolvedValue([fakeDonor({ latitude: donorLat })])

    const result = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    const expected = haversineDistance(HOSPITAL_LAT, HOSPITAL_LON, donorLat, HOSPITAL_LON)
    expect(result.matches[0].distanceKm).toBeCloseTo(expected, 6)
  })

  it('gives up with no radius once every tier is exhausted', async () => {
    findManyMock.mockResolvedValue([])

    const result = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    expect(result.matches).toEqual([])
    expect(result.radiusUsed).toBeNull()
    expect(findManyMock).toHaveBeenCalledTimes(RADIUS_TIERS_KM.length)
  })

  it('queries a wider bounding box at each successive tier', async () => {
    findManyMock.mockResolvedValue([])

    await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [BloodGroup.A_POS])

    const spans = findManyMock.mock.calls.map(call => {
      const where = call[0].where
      return where.latitude.lte - where.latitude.gte
    })

    for (let i = 1; i < spans.length; i++) {
      expect(spans[i]).toBeGreaterThan(spans[i - 1])
    }
  })
})
