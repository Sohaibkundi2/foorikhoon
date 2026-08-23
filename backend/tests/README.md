# Backend test suite

```bash
npm run test:unit          # no database needed
npm test                   # everything (needs .env.test)
```

## Unit tests — `tests/unit/`

Run anywhere, no configuration. Prisma is mocked where it appears at all.

| File | Covers |
| --- | --- |
| `compatibility.test.ts` | the compatible-donor matrix, including the rare-type reservation policy |
| `statusTransitions.test.ts` | every pair in both transition maps, plus the untrusted-input guards |
| `donorMatching.test.ts` | the eligibility WHERE clause and radius-tier escalation |

## Integration tests — `tests/integration/`

These run against **real Postgres**, because the behaviour they check is enforced by the
database rather than by application code — the 90-day recovery window is a `lte` comparison
in SQL, the ownership checks read rows back to prove nothing was written, and the lifecycle
test depends on transactional writes across four tables.

### One-time setup

1. In the Neon console, create a **branch** of the project (or an empty second project) to
   use as the test database.
2. `cp .env.test.example .env.test` and paste that branch's connection string into
   `DATABASE_URL`.
3. `npm run test:migrate` — runs `prisma migrate deploy` against `.env.test` only.

`.env.test` is gitignored.

### Why it cannot reach the dev database

`tests/setup/loadTestEnv.ts` is the only env loader Jest uses, and it:

- never loads `.env`, so a missing `.env.test` cannot fall through to the dev URL;
- points `DATABASE_URL` at an unroutable `.invalid` host when `.env.test` is absent, so
  unit tests still run but no query can reach a real server;
- **aborts the entire run** if `.env.test` and `.env` resolve to the same `host/database`.
  Neon's `-pooler` infix is stripped before comparing, so the pooled and direct URLs for one
  branch are correctly recognised as the same database.

`tests/setup/migrate-test-db.js` repeats the same comparison before running any migration.

### If a DB-backed suite fails on setup

`requireTestDatabase()` runs in each suite's `beforeAll` and distinguishes three causes
before any fixture executes, so the message you read is the actual problem:

| Message | Cause |
| --- | --- |
| `…still the placeholder from .env.test.example` | `.env.test` was copied but not edited |
| `Cannot reach the test database` | host, credentials or database name wrong, or the branch is suspended |
| `reachable but the schema is not applied` | the branch exists but `npm run test:migrate` was never run |

A fourth failure mode is not a setup problem and so is not caught here: a suite that passes
alone but fails in a combined run, with a `Match_donorId_fkey` violation or an unexpected
donor in an escalation assertion. That is leftover fixtures from an earlier killed run — see
[Cleanup](#cleanup).

This preflight exists because a Prisma failure inside a fixture is close to unreadable: the
stack frame resolves into `prisma/generated`, which is a minified bundle that Jest treats as
first-party and renders a code frame for. You get dozens of lines of runtime internals per
test — including the string `"omit"`, from Prisma's list of valid constructor options — with
the one line that matters buried in the middle. One cheap `SELECT 1` up front avoids all of
it. If you ever do see such a dump, read past the code frame: the real cause is the
`Can't reach database server at …` / `Invalid \`prisma.x.y()\` invocation` pair above it.

### Cleanup

`cleanupFixtures()` in `afterEach` deletes only the rows a test created, in FK-safe order —
never `deleteMany({})`. Rows the application created during a test (escalation replacement
matches, requests posted through the API) are swept up via their donor/hospital ids. Any
row left behind by a killed run is identifiable by its `forikhoon-test-` email or licence
number prefix.

A run that dies mid-test — timeout, dropped connection during teardown, Ctrl-C — never
reaches `afterEach`, so its fixtures stay on the branch. Clear them with:

```bash
npm run test:clean
```

That deletes only tagged rows and refuses to run if `.env.test` resolves to the same database
as `.env`, same as `test:migrate`.

Leftovers are not harmless. Donor matching searches for *any* eligible donor in radius, so
abandoned fixtures within range of the fixture coordinates get pulled into later runs'
escalation decisions — and if one is deleted while a request is still in flight, the insert
fails with `Foreign key constraint violated on … Match_donorId_fkey`. That reads as an
application bug and is not one. This is also why `HOSPITAL_LAT`/`HOSPITAL_LON` sit in an empty
patch of the South Atlantic rather than in D.I. Khan: no real or leftover row is ever in
radius, so escalation can only ever see donors the running test created.

### External services

`axios` is mocked module-wide, which covers both the Python scoring engine and Expo push.
The `/ai/match` stub reproduces the engine's *ordering* contract (highest commitment score
first, nearer donor breaking ties) so escalation picks a predictable donor; the point
weights themselves belong to `ai-engine/`. Cloudinary is mocked at the service boundary.

## Known gaps

- **Commitment score has no shared helper.** The clamp is written inline at three call sites
  (`respondToMatch`, `fulfillRequest`, `reportNoShow`), so `commitmentScore.test.ts` has to
  drive all three through HTTP. Extracting `applyCommitmentDelta(current, delta)` into
  `src/lib/` would make the arithmetic unit-testable and remove the chance of the three
  sites drifting apart.
- **Unanswered matches stay PENDING after a request is fulfilled.** Not a security issue —
  `lifecycle.test.ts` proves a late acceptance cannot un-fulfil the request — but donors can
  still tap Accept on a notification for a closed request.
- **A failed escalation is never retried.** Escalation is best-effort by design (see
  `escalateAfterDeclineBestEffort` — the alternative was returning 500 for an action that had
  already committed, which the client could not then retry past the transition guard). But
  nothing picks the request back up: the escalation cron selects on
  `matches: { every: { status: PENDING } }`, and a request that has just seen a decline or a
  no-show holds a DECLINED/NO_SHOW match, so it never matches that filter. If the scoring
  engine is down, those requests sit PENDING with no new donor approached until the hospital
  acts. Widening the cron's filter to "has no PENDING match newer than the cutoff" would close
  this; `escalation failure is invisible to the client` in `commitmentScore.test.ts` pins the
  current behaviour, including the fact that no replacement is created.
