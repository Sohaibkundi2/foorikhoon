# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

**Live demo:** [http://98.82.70.84:3000](http://98.82.70.84:3000)

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to ranking candidate donors with a reliability-weighted scoring engine, to tracking whether the donation actually happened, to automatically finding a replacement if it doesn't.

**For donors** — register once, set your blood group and location, get notified when someone nearby needs your blood type, earn badges and shareable donation certificates for milestones, and build a commitment score based on your actual donation track record.

**For hospitals** — post emergency requests, track donor responses in real time, mark a match as fulfilled (with required photo verification) or as a no-show, manage blood inventory, view analytics, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, view live stats, shortage predictions, and manage all users.

**For the public** — view active blood requests, filter by city and blood group, share requests, and see the donor leaderboard.

---

## Key Features

- Role-based access for donors, hospitals, and admins — public registration cannot create an admin account under any circumstances
- **Reliability-weighted multi-factor scoring engine** — donor ranking is a deterministic weighted sum of blood compatibility, proximity, availability, and commitment score, computed by a Python Flask scoring microservice. The formula is explicit and auditable, not a trained model; nothing here learns from data
- **Conservative compatibility matching with strict rare-type reservation** — donors are ranked using a compatible-donor matrix per blood group. This is deliberately narrower than textbook ABO/Rh compatibility: full universal-donor logic (O− to any recipient) is **not** implemented, because treating the scarcest types as universal substitutes drains them first. The matrix encodes a scarcity-management policy, not a claim of clinical correctness — any real deployment needs sign-off from a qualified transfusion service
- **Strict rare-type reservation** — scarce types (O−, AB−) are matched only against requests for their own exact type; they are never used as cross-type substitutes for other blood groups, regardless of urgency
- **Geolocation-based matching** — donors and hospitals are geocoded (via Nominatim/OpenStreetMap) to real coordinates, with hardened validation against garbage or misleading geocoding results; requests search a widening radius (10km → 25km → 50km → 100km), stopping at the first tier with a qualifying donor
- **GPS-based location capture** — donors and hospitals can share their device location directly at registration or profile edit for faster, more accurate matching, with manual address entry (geocoded via Nominatim) as a fallback if permission is denied. Donor coordinates are fuzzed before storage to preserve privacy; hospital coordinates are stored exact
- **90-day donor eligibility window** — donors are automatically excluded from matching for 90 days after their last donation, regardless of their manual availability toggle, reflecting the real medical recovery period for whole-blood donation
- **Escalation on decline or no-show** — if a donor declines, or a hospital reports a no-show after acceptance, the system immediately searches for and notifies a replacement donor, excluding everyone already tried for that request
- **Escalation on silence** — a background job checks every 5 minutes for requests where no donor has responded within 15 minutes, and escalates to a new batch of donors
- **Commitment score reflects real outcomes, not just replies** — score increases only when a donor actually completes a donation, and decreases for both declines and no-shows (no-shows penalized more heavily, since they break trust after other donors were already excluded); score is clamped between 0 and 100
- **Server-side status-transition validation** — Match and BloodRequest status changes are checked against explicit allowed-transition maps before being applied; a client cannot force an illegal state (e.g. skip straight to COMPLETED). MATCHED → EXPIRED is intentionally allowed, since a hospital must be able to cancel a request even after a donor has accepted
- Donors ranked by blood compatibility, proximity, availability, and commitment score
- Shortage prediction — predicts which blood groups will run low based on 30-day history
- Request auto-expiry — PENDING requests expire after 24 hours via background job
- Badge system — donors earn badges (First Blood, Lifesaver, Hero etc)
- **Photo verification of donations (Cloudinary)** — a hospital cannot mark a request fulfilled without uploading a photo of the blood bag, which carries the donor's details printed on the label. The photo becomes the donor's proof that their blood was actually collected, visible in their match history and optionally on their hero certificate. Photos are stored on Cloudinary as `authenticated` assets and served only through server-signed URLs, so a leaked link cannot expose a donor's name and blood group to the public web
- **Hero certificates — shareable donation cards (web + mobile)** — when a hospital marks a request fulfilled, the donor is notified their donation was confirmed and can view a designed, downloadable/shareable certificate card (blood group, donation count, commitment score, badge earned, donation details, verification photo) directly from their match history. Shareable to WhatsApp and other apps via the native share sheet; downloadable as PNG on web, savable to photos on mobile
- City-level heatmap showing blood demand across Pakistan
- Live public stats on landing page
- Weekly heroes slider — showcases donors who donated this week
- Donor leaderboard with city filter
- Public blood request board with filters
- Hospital analytics — most requested blood group, fulfillment rate, inventory status
- Admin dashboard with hospital verification, shortage alerts, user management (including account deletion)
- Push notifications via Expo Push Service (production ready)
- Offline support with cached data on mobile
- Mobile responsive web + React Native mobile app
- **Donor contact-sharing consent** — donors can opt in to sharing their name and phone number with a hospital once they accept a match, to help coordinate the actual donation. Off by default; contact info is only ever included in the hospital's data when the donor has explicitly enabled it and the match is accepted — never exposed otherwise, enforced server-side
- **Hospital push notifications** — hospitals are notified the moment a donor accepts their request, including the donor's contact info if shared

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | Next.js 15, TypeScript, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`) |
| Web Icons / Motion | lucide-react, motion (Framer Motion) |
| Web Type | `next/font` — Inter (text), Instrument Serif (display italic), IBM Plex Mono (labels, figures) |
| Mobile App | React Native, Expo SDK 54, Expo Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM v7 |
| Scoring Engine (`ai-engine/`) | Python 3, Flask, gunicorn |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| Mobile Auth | Expo SecureStore |
| State (Web) | Zustand with persistence |
| State (Mobile) | Zustand + AsyncStorage |
| Maps | Leaflet.js, React Leaflet |
| Push Notifications | Expo Push Service (FCM) |
| Image Storage | Cloudinary (authenticated assets + signed URLs) |
| File Uploads | Multer (memory storage), expo-image-picker (mobile) |
| Certificate Export (Web) | html2canvas |
| Certificate Export (Mobile) | react-native-view-shot, expo-sharing, expo-media-library |
| Offline Cache | AsyncStorage + NetInfo |
| Background Jobs | node-cron |
| HTTP Client | Axios |
| Date Handling | Day.js |
| Testing | Jest + ts-jest + supertest (backend), Jest + React Testing Library (frontend) |
| Infrastructure | Docker, Docker Compose, AWS EC2 (Elastic IP), Neon (managed Postgres) |

---

## Architecture

```
Next.js Web App (port 3000)          React Native Mobile App
        |                                      |
        |         HTTPS / REST API             |
        └──────────────┬───────────────────────┘
                       |
         Node.js + Express Backend (port 5000)
                  |              |
            Prisma ORM        HTTP POST
                  |              |
          PostgreSQL        Python Flask
           (Neon DB)        Scoring Engine (port 5001)
```

All three services (backend, scoring engine, web frontend) run as separate Docker containers on a single AWS EC2 instance, coordinated by `docker-compose.yml`. The database remains external, managed by Neon.

---

## Deployment

The full stack is containerized and runs on a single AWS EC2 instance (Amazon Linux 2023, t3.micro) with an Elastic IP for a stable public address.

| Service | Published port | URL |
|---|---|---|
| Web frontend (Next.js) | 3000 | [http://98.82.70.84:3000](http://98.82.70.84:3000) |
| Backend API (Express) | 5000 | `http://98.82.70.84:5000/api` |
| Scoring engine (Flask) | 5001 | `http://98.82.70.84:5001` |

The scoring engine only needs to be reachable from the backend container, so publishing 5001 to the internet is wider than necessary — closing it to the host and letting the two services talk over the compose network alone is a hardening step worth taking before any real use.

```
deploy/
├── backend.Dockerfile      multi-stage build: TypeScript compile + Prisma generate, then a slim runtime image
├── ai-engine.Dockerfile    Python slim image running the Flask app under gunicorn (not the dev server)
└── frontend.Dockerfile     multi-stage build using Next.js `output: 'standalone'`, with NEXT_PUBLIC_API_URL baked in at build time

docker-compose.yml          wires all three services together on a shared network;
                             the backend reaches the scoring engine via the service
                             name (ai-engine:5001), not localhost
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

---

## Project Structure

```
foorikhoon/
├── deploy/                    Dockerfiles for each service (see Deployment)
├── docker-compose.yml
│
├── frontend/                  Next.js web app
│   ├── jest.config.js
│   ├── tests/                 React Testing Library suites
│   └── src/
│       ├── app/               Pages (App Router)
│       │   ├── page.tsx       Landing page
│       │   ├── globals.css    Tailwind v4 @theme tokens
│       │   ├── login/
│       │   ├── register/
│       │   ├── requests/
│       │   ├── leaderboard/
│       │   ├── donor/
│       │   ├── hospital/
│       │   └── admin/
│       ├── components/
│       │   ├── fk.tsx         shared design-system primitives
│       │   ├── Navbar.tsx
│       │   ├── Map.tsx
│       │   ├── BadgePopup.tsx
│       │   ├── FulfillPhotoModal.tsx
│       │   ├── HeroCertificate.tsx
│       │   └── WeeklyHeroes.tsx
│       ├── store/authStore.ts
│       └── lib/api.ts
│
├── mobile/                    React Native app (Expo)
│   └── app/
│       ├── index.tsx
│       ├── login.tsx
│       ├── register.tsx
│       ├── donor/
│       ├── hospital/
│       ├── requests/
│       └── leaderboard.tsx
│   └── src/
│       ├── components/
│       ├── hooks/useNetwork.ts
│       ├── lib/
│       └── store/authStore.ts
│
├── backend/
│   ├── tests/                 unit + integration Jest suites
│   └── src/
│       ├── index.ts
│       ├── routes/
│       ├── controllers/
│       ├── middleware/
│       ├── services/
│       ├── jobs/
│       │   ├── expiry.job.ts
│       │   └── escalation.job.ts
│       └── lib/
│           ├── prisma.ts
│           ├── geocode.ts
│           ├── distance.ts
│           ├── compatibility.ts
│           ├── donorMatching.ts
│           └── statusTransitions.ts
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── seed-admin.ts
│
├── ai-engine/
│   ├── app.py
│   ├── requirements.txt
│   └── tests/
│       └── test_logic.py      104 behavioural checks via Flask's test client
│
├── research/                  RWDP simulation study
│   ├── RWDP_Research_Report.pdf
│   ├── simulate.py
│   ├── algorithms.py
│   ├── population.py
│   ├── requests.py
│   ├── compatibility.py
│   └── response_model.py
│
└── diagrams/                  system architecture, ER, DFD, sequence, state diagrams
```

---

## Database Models

```
User         — base model (DONOR, HOSPITAL, ADMIN), city trimmed on write
Donor        — blood group, availability, commitment score (0-100), lastDonated,
               pushToken, area, latitude/longitude, shareContactInfo (all location fields required)
Hospital     — name, address, latitude/longitude (required), license, verified, pushToken
BloodRequest — blood group, units, urgency, status, expiry
Match        — links donor to request; status: PENDING, ACCEPTED, DECLINED, COMPLETED, NO_SHOW
               photoPublicId, photoUploadedAt, responseToken
Inventory    — hospital blood stock per blood group
```

---

## API Endpoints

```
AUTH
POST  /api/auth/register        → role coerced to DONOR/HOSPITAL only, ADMIN not reachable
POST  /api/auth/login

DONOR
POST  /api/donor/profile
GET   /api/donor/profile              → includes badges
PUT   /api/donor/profile
PUT   /api/donor/availability
PUT   /api/donor/push-token
GET   /api/donor/matches
PUT   /api/donor/matches/:id          → donor accepts/declines; ownership + transition validated
GET   /api/donor/certificate/:matchId → hero-certificate data for a COMPLETED match

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests
GET   /api/hospital/analytics
PUT   /api/hospital/requests/:id/fulfill   → multipart/form-data, field "photo" (required);
                                              ownership + transition validated
PATCH /api/hospital/matches/:id/no-show    → ownership + transition validated
PUT   /api/hospital/push-token

REQUESTS
POST  /api/requests             → creates request + donor scoring + push notifications
GET   /api/requests             → public; explicit field select, no password/token leaks
GET   /api/requests/:id
PUT   /api/requests/:id         → ownership + transition validated

ADMIN
GET    /api/admin/stats
GET    /api/admin/hospitals
PUT    /api/admin/hospitals/:id/verify
DELETE /api/admin/hospitals/:id
GET    /api/admin/users
DELETE /api/admin/users/:id     → admin accounts excluded
GET    /api/admin/requests

MAP
GET   /api/map/stats
GET   /api/map/public-stats
GET   /api/map/weekly-heroes
GET   /api/map/leaderboard
GET   /api/map/shortage
```

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

## Request Lifecycle

```
PENDING   → request posted, matching donors notified
MATCHED   → donor accepted, on their way
FULFILLED → hospital marks complete after blood is actually donated (requires photo + an ACCEPTED match)
EXPIRED   → no donor responded within 24 hours, or hospital manually cancelled
```

A request can move back from MATCHED to PENDING if the accepted donor is later reported as a no-show — the request isn't considered resolved until a donation is actually marked FULFILLED. A hospital can also cancel a MATCHED request (→ EXPIRED) if the patient is transferred or blood is sourced elsewhere; the 24-hour auto-expiry cron only ever acts on PENDING requests, so a request with a donor en route is never silently expired by the timer.

---

## Match Status

```
PENDING    → donor notified, awaiting response
ACCEPTED   → donor said yes
DECLINED   → donor said no — commitment score -5, replacement escalation triggered
COMPLETED  → donor actually donated — commitment score +10, lastDonated updated,
             photo attached, donor notified with a hero certificate available
NO_SHOW    → donor accepted but never donated — commitment score -10, replacement escalation triggered
```

All transitions are validated server-side against an explicit allowed-transition map.

---

## Commitment Score System

```
Donor completes a donation (COMPLETED)    → +10 points
Donor declines a match (DECLINED)         → -5 points
Donor accepts but never donates (NO_SHOW) → -10 points
Score range: 0 - 100 (clamped)
```

Accepting a match, on its own, does not change the score — only a confirmed outcome does.

---

## Badge System

```
First Step   → joined ForiKhoon
First Blood  → accepted first match
Reliable     → commitment score > 50
Dedicated    → commitment score > 80
Lifesaver    → accepted 5+ matches
Hero         → accepted 10+ matches
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon DB free tier)
- Docker + Docker Compose (for containerized run)
- Expo Go app (for mobile development)

### Docker (all services, recommended)
```bash
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, CLOUDINARY_*, AI_ENGINE_URL, NEXT_PUBLIC_API_URL
docker compose up --build -d
```

### Backend (without Docker)
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx ts-node prisma/seed.ts
npx ts-node prisma/seed-admin.ts
npm run dev
```

### Web Frontend (without Docker)
```bash
cd frontend
npm install
npm run dev
```

### AI Engine (without Docker)
```bash
cd ai-engine
pip install -r requirements.txt
python app.py
```

### Mobile App
```bash
cd mobile
yarn install
# EXPO_PUBLIC_API_URL must be your machine's local network IP, not localhost
yarn expo start --go
```

### Running Tests
```bash
cd backend
cp .env.test.example .env.test  # fill in a separate Neon test database URL
npm run test:migrate
npm run test:unit
npm run test:integration

cd frontend
npm test

cd ai-engine
python tests/test_logic.py   # no server or database needed
```

---

## Test Accounts (after seeding)

```
Donor:    donor1@foorikhoon.com  / 123456
Hospital: hospital1@foorikhoon.com / 123456
Admin:    admin@321.com / (set via prisma/seed-admin.ts)
```

---

## Known Limitations

The radius query pulls candidates per tier from Postgres using a lat/lng bounding-box filter, then computes precise distance in the application layer. This is efficient enough for the project's current scale, but a production deployment with a very large donor base would benefit from a PostGIS spatial index (`ST_DWithin`).

No-show detection is currently manual — a hospital must actively report it; there is no automatic timeout-based flag.

The scoring engine's compatibility matrix is deliberately maintained in two places (`backend/lib/compatibility.ts` and `ai-engine/app.py`) rather than one shared source of truth, since they're separate languages/services. Both sides are now pinned by tests — a backend unit test checks the TypeScript matrix, and `ai-engine/tests/test_logic.py` asserts the Python one against a policy table written out longhand — so editing either without the other fails a test rather than silently diverging. It remains two files to keep in step, though, and that is a manual-sync risk.

---

## Roadmap — Planned Features

- Real-time updates via WebSockets (Socket.io)
- Redis caching for public stats, leaderboard, heatmap
- Urdu language support (i18n) for web and mobile
- Automatic (cron-based) no-show detection
- Blood drive event scheduling
- Hospital-to-hospital inventory transfer
- Trained ML model (logistic regression) replacing rule-based scoring, once sufficient real/synthetic data is available
- CI/CD pipeline (GitHub Actions) for automated test-and-deploy
- Small-scale user study (SUS usability testing) for FYP evaluation
- Google Play Store release

---

## Research Contribution

This project proposes a **Reliability-Weighted Donor Prioritization (RWDP)** framework for emergency blood donation. Unlike existing blood bank directories that treat all available donors equally, RWDP ranks donors using a composite score combining blood compatibility, geographic proximity, real-time availability, and longitudinal commitment history. The commitment score updates dynamically based on confirmed donation outcomes — not just replies — creating a self-improving prioritization system that favors historically reliable donors in future matches.

### Simulation Study

A Monte Carlo simulation (30 trials per scenario, synthetic donor/request populations) compared RWDP against two baselines — pure random selection and the project's original exact-match-only (V1) logic — across three donor-supply conditions:

| Scenario | Donors | RWDP Fulfillment | vs Random | vs Exact-Match-Only |
|---|---|---|---|---|
| Abundant | 800 | 95.27% | +2.30pp (p<0.001) | +2.03pp (p<0.001) |
| Moderate | 300 | 88.41% | +1.07pp (p=0.008) | +1.92pp (p<0.001) |
| Scarce | 150 | 81.14% | +0.07pp (p=0.89, not significant) | +2.84pp (p<0.001) |

RWDP produced a statistically significant fulfillment-rate improvement over both baselines under abundant and moderate donor supply, and a consistently lower no-show rate than random selection across every scenario (e.g. 5.87% vs 11.83% under abundant supply).

Under severe donor scarcity, RWDP's advantage over random selection disappears (not statistically significant), since a very small candidate pool leaves little room for donor ordering to matter. RWDP still significantly outperforms the exact-match-only baseline in this condition, since compatibility-matrix matching alone continues to expand the usable donor pool.

**Known limitation:** RWDP consistently produces a higher maximum donor load than the random baseline across all scenarios, since top-scored donors are repeatedly prioritized — a fairness trade-off worth addressing in future work (e.g. a temporary priority cooldown after consecutive matches).

Full methodology, results, and discussion available in [RWDP_Research_Report.pdf](./research/RWDP_Research_Report.pdf).

---


## System Design

Architecture, ER, DFD (levels 0-1), sequence, and state diagrams are available in [`/diagrams`](./diagrams).

## Status

Deployed. Final Year Project — Gomal University, D.I. Khan (2023–2027).

## Author

Sohaib Khan · BSCS · Gomal University, D.I. Khan
github.com/sohaibkundi2 · https://mr-sohaib.vercel.app
