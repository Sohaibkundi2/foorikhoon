/**
 * Applies the Prisma schema to the test database defined in backend/.env.test.
 *
 * Why a script rather than an inline env assignment in package.json: npm runs scripts
 * through cmd.exe on Windows, where `DATABASE_URL=... npx prisma migrate deploy` is not
 * valid syntax. Spawning with an explicit env object works the same everywhere.
 *
 * `prisma.config.ts` reads DATABASE_URL through `dotenv/config`, and dotenv never
 * overwrites a variable that is already set — so the value injected here wins over the
 * dev value in `.env`.
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

const backendRoot = path.resolve(__dirname, '..', '..')
const testEnvPath = path.join(backendRoot, '.env.test')
const devEnvPath = path.join(backendRoot, '.env')

if (!fs.existsSync(testEnvPath)) {
  console.error('backend/.env.test not found. Copy .env.test.example to .env.test and set DATABASE_URL.')
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

// Same refusal as the Jest guard: migrating the dev branch from a "test" command would be
// the most damaging possible version of this mistake.
if (fs.existsSync(devEnvPath)) {
  const devEnv = dotenv.parse(fs.readFileSync(devEnvPath))
  const devIdentity = devEnv.DATABASE_URL ? databaseIdentity(devEnv.DATABASE_URL) : null
  if (devIdentity && devIdentity === testIdentity) {
    console.error(
      'REFUSING TO MIGRATE.\n\n' +
      `  .env.test resolves to the same database as .env (${testIdentity}).\n` +
      '  Point .env.test at a separate Neon branch before running this.\n'
    )
    process.exit(1)
  }
}

console.log(`Applying migrations to test database: ${testIdentity}`)

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'migrate', 'deploy'],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    // Windows will not execute a .cmd shim without a shell, and spawnSync reports that as
    // an `error` with a null status rather than on stderr — which looks like a silent
    // failure. Safe here because none of the arguments need quoting.
    shell: process.platform === 'win32',
    env: { ...process.env, DATABASE_URL: testEnv.DATABASE_URL }
  }
)

if (result.error) {
  console.error(`\nCould not run \`prisma migrate deploy\`: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status === null ? 1 : result.status)
