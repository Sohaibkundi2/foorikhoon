/**
 * Removes fixture rows this suite left behind on the test database.
 *
 * `cleanupFixtures` handles the normal case in `afterEach`, but a run that dies mid-test —
 * a timeout, a dropped connection during teardown, Ctrl-C — never reaches it, and the rows
 * stay. They are not inert: donor matching searches for *any* eligible donor in radius, so
 * abandoned fixtures sitting at the fixture coordinates get pulled into later runs'
 * escalation decisions, and a later cleanup deleting one mid-request surfaces as a
 * foreign-key violation on `Match.donorId` that looks like an application bug.
 *
 * Scope is deliberately narrow: only users whose email carries the suite's tag, and the rows
 * hanging off them. Never a table-wide delete — the test branch is a copy of dev and holds
 * real rows, and this must stay safe to run even if someone mispoints `.env.test`.
 */

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const TEST_TAG = 'forikhoon-test'

const backendRoot = path.resolve(__dirname, '..', '..')
const testEnvPath = path.join(backendRoot, '.env.test')
const devEnvPath = path.join(backendRoot, '.env')

if (!fs.existsSync(testEnvPath)) {
  console.error('backend/.env.test not found. Nothing to clean.')
  process.exit(1)
}

const testEnv = dotenv.parse(fs.readFileSync(testEnvPath))

if (!testEnv.DATABASE_URL || !testEnv.DATABASE_URL.trim()) {
  console.error('DATABASE_URL is missing from backend/.env.test.')
  process.exit(1)
}

function databaseIdentity(connectionString) {
  try {
    const parsed = new URL(connectionString.trim())
    return `${parsed.hostname.toLowerCase().replace('-pooler', '')}/${parsed.pathname.replace(/^\//, '').toLowerCase()}`
  } catch {
    return null
  }
}

const testIdentity = databaseIdentity(testEnv.DATABASE_URL)
if (!testIdentity) {
  console.error('DATABASE_URL in backend/.env.test is not a parseable connection string.')
  process.exit(1)
}

// The same refusal the Jest guard and the migrate script make. Deleting rows out of the dev
// branch from a command named "clean" would be the worst version of this mistake.
if (fs.existsSync(devEnvPath)) {
  const devEnv = dotenv.parse(fs.readFileSync(devEnvPath))
  const devIdentity = devEnv.DATABASE_URL ? databaseIdentity(devEnv.DATABASE_URL) : null
  if (devIdentity && devIdentity === testIdentity) {
    console.error(
      'REFUSING TO DELETE.\n\n' +
      `  .env.test resolves to the same database as .env (${testIdentity}).\n` +
      '  Point .env.test at a separate Neon branch before running this.\n'
    )
    process.exit(1)
  }
}

process.env.DATABASE_URL = testEnv.DATABASE_URL

const { PrismaClient } = require(path.join(backendRoot, 'prisma', 'generated'))
const { PrismaPg } = require('@prisma/adapter-pg')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: testEnv.DATABASE_URL })
})

async function main() {
  console.log(`Cleaning suite fixtures from: ${testIdentity}`)

  const users = await prisma.user.findMany({
    where: { email: { contains: TEST_TAG } },
    select: { id: true }
  })

  if (users.length === 0) {
    console.log('No leftover fixtures found.')
    return
  }

  const userIds = users.map(u => u.id)

  const donorIds = (await prisma.donor.findMany({
    where: { userId: { in: userIds } },
    select: { id: true }
  })).map(d => d.id)

  const hospitalIds = (await prisma.hospital.findMany({
    where: { userId: { in: userIds } },
    select: { id: true }
  })).map(h => h.id)

  const requestIds = (await prisma.bloodRequest.findMany({
    where: { hospitalId: { in: hospitalIds } },
    select: { id: true }
  })).map(r => r.id)

  // Foreign-key-safe order, matching cleanupFixtures. Matches are also collected by donor id
  // so a fixture donor's matches against a *dev* request are removed too.
  const matches = await prisma.match.deleteMany({
    where: { OR: [{ donorId: { in: donorIds } }, { requestId: { in: requestIds } }] }
  })
  const requests = await prisma.bloodRequest.deleteMany({ where: { id: { in: requestIds } } })
  const inventory = await prisma.inventory.deleteMany({ where: { hospitalId: { in: hospitalIds } } })
  const donors = await prisma.donor.deleteMany({ where: { id: { in: donorIds } } })
  const hospitals = await prisma.hospital.deleteMany({ where: { id: { in: hospitalIds } } })
  const removedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } })

  console.log(
    `Removed ${removedUsers.count} users, ${donors.count} donors, ${hospitals.count} hospitals, ` +
    `${requests.count} requests, ${matches.count} matches, ${inventory.count} inventory rows.`
  )
}

main()
  .catch(error => {
    console.error(`\nClean failed: ${error.constructor.name} — ${String(error.message).split('\n')[0]}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
