import prisma from '../../src/lib/prisma'

/**
 * Gate for the DB-backed suites: fail fast, once, with something actionable.
 *
 * Two ways this can go wrong, and both used to surface identically and badly. A raw Prisma
 * failure inside a fixture prints a stack frame that resolves into `prisma/generated` —
 * which is a minified bundle, and which Jest treats as first-party code and so renders a
 * code frame for. The result is dozens of lines of unreadable runtime internals per test,
 * repeated once per test, with the actual cause a single line somewhere in the middle. So:
 *
 *  1. No test database configured — `tests/setup/loadTestEnv.ts` has already detected this
 *     (missing `.env.test`, no DATABASE_URL, unparseable URL, or an unedited template) and
 *     recorded why. Report it with setup steps.
 *  2. Configured but unreachable — wrong host, revoked password, suspended Neon branch, or
 *     the schema was never applied. Caught here by a few cheap round trips before any fixture
 *     runs, so the diagnosis is stated in plain terms instead of inferred from a stack.
 *
 * The reachability check retries with backoff rather than probing once: the test branch is
 * serverless and suspends when idle, so a single `SELECT 1` against a cold compute fails for
 * a reason that has nothing to do with whether the database is usable.
 *
 * The result is memoised per module registry, which Jest gives each test file its own copy of
 * — so the warm-up runs once per suite rather than once per run. That is what we want: a
 * later suite may start after the branch has gone idle again and need waking a second time.
 */

const SETUP_STEPS =
  '  1. In the Neon console, create a branch (or an empty second project) for testing.\n' +
  '  2. cp backend/.env.test.example backend/.env.test\n' +
  "  3. Put that branch's connection string in DATABASE_URL\n" +
  '  4. npm run test:migrate\n\n' +
  '  Unit tests (npm run test:unit) do not need this.\n'

let preflight: Promise<void> | null = null

/** Neon suspends an idle branch; the first query after that has to wake the compute. */
const WAKE_ATTEMPTS = 5
const WAKE_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000]

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  // A pg-adapter connection failure can arrive with an empty `message` and the real detail on
  // `cause`, so taking just the first line of `message` can leave nothing to read at all.
  const parts = [error.constructor.name, error.message.trim(), (error as { cause?: unknown }).cause]
    .map(part => (part == null ? '' : String(part).trim()))
    .filter(part => part.length > 0)
  return [...new Set(parts)].join(' — ')
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const identity = () => process.env.FORIKHOON_TEST_DB_IDENTITY ?? 'configured target'

async function wakeDatabase(): Promise<void> {
  let last: unknown

  for (let attempt = 0; attempt < WAKE_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return
    } catch (error) {
      last = error
      if (attempt < WAKE_BACKOFF_MS.length) await sleep(WAKE_BACKOFF_MS[attempt])
    }
  }

  throw new Error(
    `\nCannot reach the test database (${identity()}) after ${WAKE_ATTEMPTS} attempts.\n\n` +
    `  ${describeError(last)}\n\n` +
    '  DATABASE_URL in backend/.env.test parses, but the server did not answer. Check that\n' +
    '  the host, credentials and database name are right and the Neon branch is not\n' +
    '  suspended or over its compute quota, then re-run. If the branch is new, apply the\n' +
    '  schema first:\n\n' +
    '    npm run test:migrate\n'
  )
}

async function checkReachable(): Promise<void> {
  await wakeDatabase()

  // Reachable, but a branch created without migrations has no tables — which would otherwise
  // fail per-test as a bare "relation does not exist" from inside a fixture.
  try {
    await withDbRetry(() => prisma.user.count())
  } catch (error) {
    // Only a genuinely missing table means "not migrated". A connection that dropped during
    // this probe must not be reported as a schema problem: the preflight result is cached, so
    // one misdiagnosis here fails every test in the suite with the wrong explanation.
    if (isConnectionError(error)) {
      throw new Error(
        `\nLost the connection to the test database (${identity()}) while checking its schema.\n\n` +
        `  ${describeError(error)}\n\n` +
        '  The branch answered and then dropped the connection, which is throttling rather\n' +
        '  than misconfiguration. Re-run; if it persists, run one suite at a time\n' +
        '  (npm run test:score, test:security, test:eligibility, test:lifecycle).\n'
      )
    }

    throw new Error(
      `\nThe test database (${identity()}) is reachable but the schema is not applied.\n\n` +
      `  ${describeError(error)}\n\n` +
      '  Run this once against the test branch:\n\n' +
      '    npm run test:migrate\n'
    )
  }
}

export function requireTestDatabase(): Promise<void> {
  if (process.env.FORIKHOON_TEST_DB !== 'configured') {
    const reason = process.env.FORIKHOON_TEST_DB_REASON ?? 'backend/.env.test was not found'
    return Promise.reject(
      new Error(`\nThis suite needs a test database, but ${reason}.\n\n${SETUP_STEPS}`)
    )
  }

  preflight ??= checkReachable()
  return preflight
}

/**
 * Connection-level failures, which say nothing about whether the code under test is correct.
 *
 * Measured against the Neon test branch: warm queries average ~350ms, but the branch stalls
 * for seconds at random under free-tier throttling and sometimes has its socket closed
 * outright. When that happens mid-suite it fails the current test *and* every test after it,
 * because fixture setup and `cleanupFixtures` both stop working — turning one dropped packet
 * into a dozen red tests that look like a real regression.
 *
 * Deliberately narrow: matched on connection-class Prisma codes and socket errors only. A
 * constraint violation, a validation error, or a failed assertion is never retried, so this
 * cannot hide a genuine bug.
 */
const RETRYABLE_PRISMA_CODES = new Set([
  'P1001', // can't reach database server
  'P1002', // server reached but timed out
  'P1008', // operation timed out
  'P1017' // server has closed the connection
])

const RETRYABLE_PATTERNS = [
  /connection terminated/i,
  /connection closed/i,
  /can't reach database server/i,
  /timed out fetching a new connection/i,
  /econnreset/i,
  /epipe/i,
  /socket hang up/i
]

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && RETRYABLE_PRISMA_CODES.has(code)) return true

  const text = `${error.message} ${String((error as { cause?: unknown }).cause ?? '')}`
  return RETRYABLE_PATTERNS.some(pattern => pattern.test(text))
}

/** Runs `operation`, retrying only if it failed because the connection broke. */
export async function withDbRetry<T>(operation: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (!isConnectionError(error)) throw error
      last = error
      // The stalls observed on this branch last single-digit seconds, so back off past them
      // rather than retrying straight into the same stall.
      if (attempt < attempts - 1) await sleep(500 * 2 ** attempt)
    }
  }

  throw last
}

export { prisma }
