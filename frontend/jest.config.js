const nextJest = require('next/jest')

// next/jest reuses the SWC transform Next already builds the app with, so tests compile
// under the same JSX/TS settings as production code. Configuring a transform by hand would
// mean a second config that can drift from next.config.ts — and tsconfig.json here sets
// `jsx: preserve` and `module: esnext`, neither of which Jest can execute, so ts-jest would
// need its own overriding tsconfig before a single test ran.
// It also stubs CSS/image imports.
// `__dirname`, not './': next/jest passes `dir` straight through as `rootDir`, and a
// relative one leaves `<rootDir>` expanding to a literal `./` inside moduleNameMapper —
// which Jest then cannot resolve.
const createJestConfig = nextJest({ dir: __dirname })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  // The single owner of the `@/*` alias. See the note on `module.exports` below for why SWC
  // must be stopped from claiming it too.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Deliberately no `roots`. Scoping it to tests/ would keep Jest from discovering the
  // manual mock at src/lib/__mocks__/api.ts, and `jest.mock('@/lib/api')` would then
  // silently fall through to the real axios instance.
  testMatch: ['<rootDir>/tests/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  // resetMocks, not just clearMocks: these tests stub per-case responses with
  // mockResolvedValue, and clearMocks only wipes recorded calls — the implementation would
  // survive into the next test and quietly satisfy an endpoint it was never given.
  resetMocks: true,
  restoreMocks: true,
  // Serial, because parallel workers cannot load this machine's SWC binary.
  //
  // node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node has a valid PE header
  // but Windows rejects it as "not a valid Win32 application", and it is the only SWC backend
  // installed — there is no @next/swc-wasm-nodejs to fall back to. The main process survives
  // via Next's retry path; a Jest worker does not, and dies with "child process exceptions,
  // exceeding retry limit".
  //
  // This only bites when something actually needs transforming, so a warm transform cache
  // hides it completely: parallel runs pass repeatedly, then fail every single suite the first
  // time the cache is cold (after --clearCache, or after any config edit). Measured here:
  // 0/2 cold parallel runs succeeded, 4/4 cold serial runs did.
  //
  // Serial costs a few seconds on a suite this size. Reinstalling that package is the real
  // repair; if a later `npm ci` produces a binary that loads, this line can go.
  maxWorkers: 1
}

module.exports = async () => {
  const resolved = await createJestConfig(config)()

  // Take tsconfig's `paths` away from SWC, leaving the `@/*` alias to the moduleNameMapper.
  //
  // next/jest forwards `paths` into the transform, and SWC then rewrites every `@/x`
  // specifier into one relative to baseUrl — `./src/x`. That is correct for a bundler
  // resolving from the project root, but Jest resolves relative specifiers against the
  // *importing file's* directory, so `./src/store/authStore` requested from
  // src/app/register/page.tsx resolves to src/app/register/src/store/authStore and fails.
  // Every aliased import outside the project root breaks, including the app's own.
  //
  // Note this rewrite never applied to `jest.mock('@/lib/api')` — a string argument, not an
  // import specifier — so a moduleNameMapper was needed regardless. Stripping `paths` just
  // makes that one mapper authoritative for both, which also guarantees a module and its
  // mock resolve to the same file and share one entry in the mock registry.
  for (const entry of Object.values(resolved.transform ?? {})) {
    const options = Array.isArray(entry) ? entry[1] : null
    if (options?.jsConfig?.compilerOptions?.paths) {
      delete options.jsConfig.compilerOptions.paths
    }
  }

  return resolved
}
