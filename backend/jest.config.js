/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }]
  },
  // setupFiles (not setupFilesAfterEnv) because this has to run before the test file
  // and its imports are evaluated: src/lib/prisma.ts builds its connection adapter from
  // process.env.DATABASE_URL at module scope, so the env must already be populated.
  setupFiles: ['<rootDir>/tests/setup/loadTestEnv.ts'],
  // The whole suite shares one remote Postgres branch. Parallel workers would interleave
  // writes and delete each other's fixtures mid-assertion, so run serially.
  maxWorkers: 1,
  // Measured against the Neon test branch: ~350ms per warm round trip, an ~11s cold start
  // when the branch has suspended, and random multi-second stalls under free-tier throttling.
  // A test making a dozen queries can therefore legitimately take most of a minute, so 60s
  // was producing timeouts that had nothing to do with the code under test.
  testTimeout: 120000,
  clearMocks: true,
  restoreMocks: true
}
