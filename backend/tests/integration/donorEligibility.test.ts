import { requireTestDatabase } from '../helpers/db'
import {
  createDonorFixture,
  cleanupFixtures,
  daysAgo,
  prisma,
  HOSPITAL_LAT,
  HOSPITAL_LON
} from '../helpers/factories'
import { findEligibleDonors } from '../../src/lib/donorMatching'
import { BloodGroup } from '../../prisma/generated'

/**
 * The 90-day donor recovery window, verified against real Postgres.
 *
 * This behaviour cannot be tested with a mocked Prisma client: the cutoff is a `lte`
 * comparison evaluated by the database, so a mock can only confirm which Date was passed
 * in, never that a donor one day short of eligible is actually filtered out. The
 * WHERE-clause construction is covered in tests/unit/donorMatching.test.ts; this file
 * covers the outcome.
 *
 * Assertions are scoped to the donor ids each test creates rather than comparing whole
 * result arrays, so any pre-existing rows on the test branch cannot turn a passing
 * assertion into a failing one.
 */

// A group the fixtures below own outright, to keep unrelated donors out of the candidate set.
const GROUP = BloodGroup.B_NEG

beforeAll(async () => {
  await requireTestDatabase()
})

afterEach(async () => {
  await cleanupFixtures()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function eligibleDonorIds(excludeDonorIds: string[] = []): Promise<string[]> {
  const { matches } = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [GROUP], excludeDonorIds)
  return matches.map(m => m.donor.id)
}

describe('donor eligibility: the 90-day recovery window', () => {
  it('excludes a donor who last donated 89 days ago', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: 89 })

    expect(await eligibleDonorIds()).not.toContain(donor.donorId)
  })

  it('includes a donor who last donated exactly 90 days ago', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: 90 })

    expect(await eligibleDonorIds()).toContain(donor.donorId)
  })

  it('includes a donor who has never donated', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: null })

    const record = await prisma.donor.findUniqueOrThrow({ where: { id: donor.donorId } })
    expect(record.lastDonated).toBeNull()

    expect(await eligibleDonorIds()).toContain(donor.donorId)
  })

  it('includes a donor who last donated long ago', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: 400 })

    expect(await eligibleDonorIds()).toContain(donor.donorId)
  })

  it('draws the line between 89 and 90 days in the same query', async () => {
    // Both donors are identical apart from their last donation date, so a passing
    // assertion here isolates the cutoff itself rather than any other filter.
    const tooSoon = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: 89 })
    const recovered = await createDonorFixture({ bloodGroup: GROUP, lastDonatedDaysAgo: 90 })

    const eligible = await eligibleDonorIds()

    expect(eligible).toContain(recovered.donorId)
    expect(eligible).not.toContain(tooSoon.donorId)
  })
})

describe('donor eligibility: availability', () => {
  it('excludes an unavailable donor even though they are past the 90-day window', async () => {
    const donor = await createDonorFixture({
      bloodGroup: GROUP,
      lastDonatedDaysAgo: 200,
      isAvailable: false
    })

    expect(await eligibleDonorIds()).not.toContain(donor.donorId)
  })

  it('excludes an unavailable donor who has never donated', async () => {
    // isAvailable is an independent veto, not a tie-breaker on the donation date: a donor
    // who has paused notifications must not be matched however long it has been.
    const donor = await createDonorFixture({
      bloodGroup: GROUP,
      lastDonatedDaysAgo: null,
      isAvailable: false
    })

    expect(await eligibleDonorIds()).not.toContain(donor.donorId)
  })

  it('includes an available donor alongside an unavailable one', async () => {
    const available = await createDonorFixture({ bloodGroup: GROUP, isAvailable: true })
    const unavailable = await createDonorFixture({ bloodGroup: GROUP, isAvailable: false })

    const eligible = await eligibleDonorIds()

    expect(eligible).toContain(available.donorId)
    expect(eligible).not.toContain(unavailable.donorId)
  })
})

describe('donor eligibility: exclusions and blood group', () => {
  it('excludes donors already approached for this request', async () => {
    const alreadyTried = await createDonorFixture({ bloodGroup: GROUP })
    const untried = await createDonorFixture({ bloodGroup: GROUP })

    const eligible = await eligibleDonorIds([alreadyTried.donorId])

    expect(eligible).toContain(untried.donorId)
    expect(eligible).not.toContain(alreadyTried.donorId)
  })

  it('excludes donors whose blood group was not requested', async () => {
    const wanted = await createDonorFixture({ bloodGroup: GROUP })
    const otherGroup = await createDonorFixture({ bloodGroup: BloodGroup.A_POS })

    const eligible = await eligibleDonorIds()

    expect(eligible).toContain(wanted.donorId)
    expect(eligible).not.toContain(otherGroup.donorId)
  })

  it('excludes donors beyond the widest radius tier', async () => {
    // ~5.5 degrees of latitude is roughly 600km — past the 100km outer tier.
    const faraway = await createDonorFixture({
      bloodGroup: GROUP,
      latitude: HOSPITAL_LAT + 5.5,
      longitude: HOSPITAL_LON
    })

    expect(await eligibleDonorIds()).not.toContain(faraway.donorId)
  })

  it('reports the tier it settled on and each donor\'s true distance', async () => {
    const near = await createDonorFixture({
      bloodGroup: GROUP,
      latitude: HOSPITAL_LAT + 0.01,
      longitude: HOSPITAL_LON
    })

    const { matches, radiusUsed } = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [GROUP])
    const found = matches.find(m => m.donor.id === near.donorId)

    expect(found).toBeDefined()
    expect(radiusUsed).toBe(10)
    expect(found!.distanceKm).toBeLessThan(10)
    expect(found!.distanceKm).toBeGreaterThan(0)
  })

  it('loads the user relation so matching can read the donor\'s name and city', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP, name: 'Eligible Donor' })

    const { matches } = await findEligibleDonors(HOSPITAL_LAT, HOSPITAL_LON, [GROUP])
    const found = matches.find(m => m.donor.id === donor.donorId)

    expect(found!.donor.user.name).toBe('Eligible Donor')
  })
})

describe('donor eligibility: the boundary is measured from query time', () => {
  it('treats a donation timestamped one minute past 90 days as eligible', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP })
    await prisma.donor.update({
      where: { id: donor.donorId },
      data: { lastDonated: new Date(daysAgo(90).getTime() - 60 * 1000) }
    })

    expect(await eligibleDonorIds()).toContain(donor.donorId)
  })

  it('treats a donation timestamped one minute short of 90 days as ineligible', async () => {
    const donor = await createDonorFixture({ bloodGroup: GROUP })
    await prisma.donor.update({
      where: { id: donor.donorId },
      data: { lastDonated: new Date(daysAgo(90).getTime() + 60 * 1000) }
    })

    expect(await eligibleDonorIds()).not.toContain(donor.donorId)
  })
})
