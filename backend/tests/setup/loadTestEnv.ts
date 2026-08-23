import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

/**
 * Loads test configuration, and refuses to let the suite touch the dev database.
 *
 * This file is the only thing standing between `npm test` and the real Neon database.
 * The integration tests write and delete rows, so pointing them at the dev branch would
 * quietly corrupt live data. The rules:
 *
 *  1. `.env` is never loaded here. If it were, a missing or misconfigured `.env.test`
 *     would silently fall back to the dev DATABASE_URL — the exact accident this guard
 *     exists to prevent.
 *  2. If `.env.test` is absent, DATABASE_URL is overwritten with an unroutable sentinel
 *     rather than left to whatever the shell happens to export. Unit tests still run;
 *     DB-backed suites fail fast via `requireTestDatabase()` with setup instructions.
 *  3. If `.env.test` is present, its URL is compared against `.env`'s and the run aborts
 *     if they resolve to the same database. Host and database name are compared after
 *     stripping Neon's `-pooler` infix, because the pooled and direct URLs for a single
 *     branch differ only by that substring while addressing identical storage.
 */

const backendRoot = path.resolve(__dirname, '..', '..')
const testEnvPath = path.join(backendRoot, '.env.test')
const devEnvPath = path.join(backendRoot, '.env')
const exampleEnvPath = path.join(backendRoot, '.env.test.example')

/** Cannot resolve, so a stray query fails loudly instead of finding a real database. */
const UNCONFIGURED_DATABASE_URL = 'postgresql://unconfigured:unconfigured@test-db-not-configured.invalid:5432/none'

/** Reduces a connection string to the identity of the database it actually addresses. */
function databaseIdentity(connectionString: string): string | null {
  try {
    const parsed = new URL(connectionString.trim())
    // Neon exposes each branch on both a direct and a `-pooler` host; same underlying data.
    const host = parsed.hostname.toLowerCase().replace('-pooler', '')
    const database = parsed.pathname.replace(/^\//, '').toLowerCase()
    return `${host}/${database}`
  } catch {
    return null
  }
}

/**
 * Is this still the value shipped in `.env.test.example`?
 *
 * Compared against the template file rather than a hardcoded string so editing the template
 * cannot silently disable the check. The literal fallbacks cover the case where someone has
 * customised or deleted the example but kept its placeholder host shape.
 */
function isUneditedTemplate(testUrl: string, testIdentity: string): boolean {
  if (fs.existsSync(exampleEnvPath)) {
    const exampleUrl = dotenv.parse(fs.readFileSync(exampleEnvPath)).DATABASE_URL?.trim()
    const exampleIdentity = exampleUrl ? databaseIdentity(exampleUrl) : null
    if (exampleIdentity && exampleIdentity === testIdentity) return true
  }

  return /your-test-branch|\.REGION\./.test(testUrl)
}

function configureTestDatabase(): void {
  if (!fs.existsSync(testEnvPath)) {
    // Unit tests do not need a database. Blank the URL so nothing can reach one.
    process.env.DATABASE_URL = UNCONFIGURED_DATABASE_URL
    process.env.FORIKHOON_TEST_DB = 'unconfigured'
    return
  }

  const testEnv = dotenv.parse(fs.readFileSync(testEnvPath))
  const testUrl = testEnv.DATABASE_URL?.trim()

  if (!testUrl) {
    process.env.DATABASE_URL = UNCONFIGURED_DATABASE_URL
    process.env.FORIKHOON_TEST_DB = 'unconfigured'
    process.env.FORIKHOON_TEST_DB_REASON = 'DATABASE_URL is missing from backend/.env.test'
    return
  }

  const testIdentity = databaseIdentity(testUrl)

  if (!testIdentity) {
    process.env.DATABASE_URL = UNCONFIGURED_DATABASE_URL
    process.env.FORIKHOON_TEST_DB = 'unconfigured'
    process.env.FORIKHOON_TEST_DB_REASON =
      'DATABASE_URL in backend/.env.test is not a parseable connection string'
    return
  }

  // A copied-but-unedited `.env.test` still parses and still looks configured, so without
  // this check every DB-backed test fails individually with a raw Prisma connection error
  // whose stack frame lands inside the minified generated client — noise that buries the
  // one fact that matters. Compared against the template itself so it stays in step.
  if (isUneditedTemplate(testUrl, testIdentity)) {
    process.env.DATABASE_URL = UNCONFIGURED_DATABASE_URL
    process.env.FORIKHOON_TEST_DB = 'unconfigured'
    process.env.FORIKHOON_TEST_DB_REASON =
      'DATABASE_URL in backend/.env.test is still the placeholder from .env.test.example'
    return
  }

  // A same-database match is never a recoverable condition — abort the entire run rather
  // than letting individual suites decide, because the damage would already be done by
  // the time a suite noticed.
  if (fs.existsSync(devEnvPath)) {
    const devEnv = dotenv.parse(fs.readFileSync(devEnvPath))
    const devIdentity = devEnv.DATABASE_URL ? databaseIdentity(devEnv.DATABASE_URL) : null

    if (devIdentity && devIdentity === testIdentity) {
      throw new Error(
        '\nREFUSING TO RUN TESTS.\n\n' +
        '  DATABASE_URL in backend/.env.test resolves to the same database as backend/.env\n' +
        `  (${testIdentity}).\n\n` +
        '  These tests create and delete rows. Point .env.test at a separate Neon branch\n' +
        '  or a separate Neon project before running them.\n'
      )
    }
  }

  for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] = value
  }

  process.env.FORIKHOON_TEST_DB = 'configured'
  process.env.FORIKHOON_TEST_DB_IDENTITY = testIdentity
  console.log(`[tests] database target: ${testIdentity}`)
}

configureTestDatabase()

process.env.NODE_ENV = 'test'

// Tests mint their own JWTs, so the secret only has to be internally consistent. A
// fallback keeps the suite runnable without copying the dev signing secret into .env.test.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'foorikhoon-test-jwt-secret'
}

// Cloudinary uploads are mocked in the tests that touch them, but `getSignedPhotoUrl`
// throws if the SDK was never configured and it is reached on read paths too. Dummy
// values keep that from surfacing as a spurious 500 — no request ever leaves the process.
process.env.CLOUDINARY_CLOUD_NAME ||= 'test-cloud'
process.env.CLOUDINARY_API_KEY ||= 'test-key'
process.env.CLOUDINARY_API_SECRET ||= 'test-secret'
