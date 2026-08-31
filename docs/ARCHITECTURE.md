# Architecture, Deployment & Testing

## Deployment

The full stack is containerized and runs on a single AWS EC2 instance (Amazon Linux, t3-class), with an Elastic IP for a stable underlying address and an nginx reverse proxy handling TLS termination and routing for the domain.

| Service | Internal port | Reached via |
|---|---|---|
| Web frontend (Next.js) | 3000 | `https://forikhoon.app/` |
| Backend API (Express) | 5000 | `https://forikhoon.app/api/` |
| Scoring engine (Flask) | 5001 | internal only — not intended to be public |

The scoring engine only needs to be reachable from the backend container over the Docker Compose network; it should not be published to the internet directly.

```
deploy/
├── backend.Dockerfile      multi-stage build: TypeScript compile + Prisma generate, then a slim runtime image
├── ai-engine.Dockerfile    Python slim image running the Flask app under gunicorn (not the dev server)
└── frontend.Dockerfile     multi-stage build using Next.js `output: 'standalone'`, with NEXT_PUBLIC_API_URL baked in at build time

docker-compose.yml          wires all three services together on a shared network;
                             the backend reaches the scoring engine via the service
                             name (ai-engine:5001), not localhost

nginx (host-level)          reverse proxy in front of the compose stack; terminates TLS
                             (Let's Encrypt via certbot) and routes forikhoon.app/api/*
                             to the backend container and everything else to the frontend
```

**Update flow**, run directly on the EC2 instance:
```bash
git pull
docker compose up --build -d
```

### Real bugs found and fixed during deployment

**Prisma queries intermittently timing out.** Every Prisma query intermittently failed with `ETIMEDOUT` once the app had been running under Docker for more than a few minutes — cron jobs would fail, then live API requests started failing too. The cause: Node 20 enables "Happy Eyeballs" (`autoSelectFamily`) by default, racing IPv4 and IPv6 connection attempts and abandoning each after ~250ms. The Docker container has no IPv6 route, so IPv6 attempts failed instantly — but the network round-trip to Neon's `us-east-1` endpoint sometimes took longer than the 250ms window, so the IPv4 attempt kept getting cut off before it could complete, and Node reported the whole race as a timeout. Forcing IPv4-first DNS resolution resolved it. Nothing in the application logic was wrong; this was a Node/Docker networking interaction specific to containerized IPv4-only environments.

**The escalation job could not reach the scoring engine.** `jobs/escalation.job.ts` hardcoded `http://localhost:5001/ai/match` while the three controllers all correctly used `AI_ENGINE_URL`. Inside the backend container `localhost` is the backend itself, which listens on 5000 — nothing answers on 5001 there — so timeout-escalation's ranking call failed every time the job ran. It went unnoticed locally, where both services share a host, and was masked in the first containerized run because the job was already dying on the Prisma timeout above before it ever reached the HTTP call. Fixed by using the same `AI_ENGINE_URL` env var as everywhere else, which `docker-compose.yml` sets to the `ai-engine:5001` service name.

---

## Scoring Engine (`ai-engine/`)

A standalone Python/Flask microservice that ranks donors and projects shortages, run under gunicorn in production (not Flask's debug server). The directory and route prefix are named `ai` for historical reasons, but nothing in it is machine learning: both endpoints are deterministic arithmetic over the weights documented below, so the same inputs always produce the same ranking.

```
POST /ai/match    — scores and ranks donors for a blood request
POST /ai/predict  — predicts blood group shortage based on 30-day history
```

### Matching Algorithm (Reliability-Weighted Donor Prioritization)

Blood-group compatibility is a **hard gate, checked before any scoring happens** — an incompatible donor is not a low-ranked match, they are not a match at all. No amount of proximity, availability or commitment history can promote them. Points are only ever awarded to donors who have already cleared that gate:

```
Exact blood-group match         → +50 points
Compatible (non-exact) match    → +35 points
Proximity (gradient, 0-100km)   → up to +30 points, fading to 0 at 100km
Is available                    → +20 points
Commitment score                → score × 0.5 bonus
```

Both endpoints validate their payload before doing any work and return `400` with the offending field named — a missing or unknown blood group, a missing donor `id`, a non-boolean `isAvailable`, or a negative count is a client error, not a `500`. `distanceKm` is the one optional field: an absent distance is treated as the far edge of the search radius and scores no proximity credit.

**Rare blood types (O−, AB−) are excluded from every other group's compatible-donor list.** They are only ever considered for requests of their own exact type — never surfaced as a cross-type substitute for another blood group, even under CRITICAL urgency.

**Donor eligibility** for any match — initial matching, decline-escalation, or timeout-escalation — requires: matching blood compatibility, `isAvailable = true`, and either no prior donation or at least 90 days since `lastDonated`. Enforced by a single shared query (`lib/donorMatching.ts`) used by all three matching entry points.

**Radius escalation:** the eligible donor pool is searched at increasing radii — 10km, 25km, 50km, 100km — using a bounding-box pre-filter followed by precise Haversine distance. The search stops at the first radius tier with any qualifying donor.

**Escalation on decline or no-show:** the moment a donor declines, or a hospital reports an accepted donor as a no-show, the system immediately re-runs the eligibility search — excluding every donor already tried — and notifies a single replacement. The request's status returns to PENDING.

**Escalation on silence:** a background job runs every 5 minutes and escalates any PENDING request whose matches have all gone unanswered for 15+ minutes, notifying a fresh batch of up to 3 donors.

### Shortage Prediction

```
ratio = requestCount / max(donorCount, 1)     (requestCount over the last 30 days)

ratio >= 0.8  → CRITICAL
ratio >= 0.5  → HIGH
ratio >= 0.3  → MODERATE
ratio <  0.3  → LOW
```

A blood group with no available donors is treated as having one notional donor, so its ratio becomes its count of unfillable requests. That keeps severity monotonic — 40 unmet requests outranks 7, which outranks 2 — and keeps a zero-supply group above groups that still have donors, which matters because the landing page shows only the three highest-risk groups. A group with no donors *and* no requests scores 0.0 and stays LOW rather than raising an alarm nobody asked for.

---

## Testing

**Backend** — 145 tests across 7 suites (Jest + ts-jest + supertest, run against an isolated Neon test database, never against dev/production data):
- Unit: blood compatibility matrix (including the strict rare-type-reservation policy), 90-day donor eligibility, status-transition validation
- Integration: all 5 security fixes from an external code audit (admin-registration lockdown, donor match IDOR, hospital resource-ownership checks, public-endpoint field leaks, status-transition enforcement), commitment-score math, full request lifecycle (post → match → decline → escalate → no-show → escalate → fulfill)

The suite caught a real, pre-existing bug during this pass: `AB_NEG` was still present in `AB_POS`'s compatible-donor list, violating the intended strict rare-type-reservation policy. Fixed in both `backend/lib/compatibility.ts` and the separately-maintained `ai-engine/app.py` mapping.

**Frontend** — 67 tests (Jest + React Testing Library, mocked API) covering the GPS-or-manual location picker, conditional UI logic (fulfil/no-show button visibility, donor contact-sharing display), and form validation across the registration, donor dashboard, hospital requests, and donor profile pages. Verified with mutation testing (deliberately breaking the underlying logic to confirm the tests actually catch the regression, not just pass). Re-ran in full after a complete UI redesign — all 67 still passed, confirming the redesign preserved underlying component logic.

**Scoring engine** — 104 behavioural checks (`ai-engine/tests/test_logic.py`) driven through Flask's test client against the real route handlers: no server, no database, no network, since both endpoints are pure functions of the POST body. Covers the compatible-donor matrix against the documented reservation policy, hard rejection of every incompatible donor/request combination, the exact point credit for all 16 permitted pairs, ranking order, every shortage-risk threshold and boundary, and malformed-input handling.

The suite's first run surfaced three real defects, all since fixed:

- **Blood group was a scoring bonus, not a filter.** An incompatible donor earned 0 compatibility points but still collected 30 for proximity and 20 for availability — 50 points, clearing the `score > 30` cutoff — so seven of the eight request groups could be offered a donor they must never receive. Only the backend's pre-filter kept this out of production; the engine, whose port is published, had no gate of its own. Blood group is now checked before scoring, and a separate check confirms the gate doesn't overreach and drop the weakest *legitimate* donor (permitted group, 100km away, unavailable, no history — 35 points, which must still qualify).
- **Every blood group reported CRITICAL.** A group with zero donors had its ratio pinned to a hardcoded `1.0` regardless of `requestCount`, and `1.0 >= 0.8` is CRITICAL — so blood groups nobody had requested were raising the top-level shortage alarm on the landing page. The same sentinel collapsed severity (1 unmet request scored identically to 99) and sorted a zero-supply group *below* any group whose ratio exceeded 1, which mattered because the landing page renders only the top three.
- **Malformed payloads returned 500, and unknown blood groups returned 200.** Missing fields raised a bare `KeyError` on a publicly-reachable port, and an unrecognised blood group was silently accepted and scored. Both endpoints now validate up front and return `400` with a message naming the offending field and index.

The compatibility matrix is asserted against a policy table written out longhand in the test file rather than read from `app.py` — comparing the module against itself would always pass. Any future edit to the matrix fails that section, so widening it past the rare-type reservation policy has to be a deliberate decision in both places.

---

## Security

An external code-level audit identified several issues, all of which were fixed and covered by the integration test suite above:

- **Public registration could accept a client-supplied `role: "ADMIN"`** — fixed; registration now only ever creates `DONOR` or `HOSPITAL` accounts, regardless of what the request body contains
- **Donor match-response endpoint had no ownership check (IDOR)** — a donor could potentially respond to another donor's match by guessing its ID; fixed with an explicit ownership check
- **Hospital request/fulfil/no-show endpoints had no ownership check** — a hospital could potentially modify another hospital's request; fixed the same way
- **Public request feed leaked hospital password hashes** (`include: { user: true }` instead of an explicit field `select`) — also caught and fixed a second leak of the same shape: donor push tokens, match response tokens, and Cloudinary photo IDs on the same public endpoints
- **No server-side validation of status transitions** — a client could previously send any enum value directly; both `Match` and `BloodRequest` status changes are now validated against explicit allowed-transition maps before being applied