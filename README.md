# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to ranking candidate donors with a reliability-weighted scoring engine, to tracking whether the donation actually happened, to automatically finding a replacement if it doesn't.

**For donors** — register once, set your blood group and location, get notified when someone nearby needs your blood type, earn badges and shareable donation certificates for milestones, and build a commitment score based on your actual donation track record.

**For hospitals** — post emergency requests, track donor responses in real time, mark a match as fulfilled or as a no-show, manage blood inventory, view analytics, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, view live stats, shortage predictions, and manage all users.

**For the public** — view active blood requests, filter by city and blood group, share requests, and see the donor leaderboard.

---

## Key Features

- Role-based access for donors, hospitals, and admins
- **Reliability-weighted multi-factor scoring engine** — donor ranking is a deterministic weighted sum of blood compatibility, proximity, availability, and commitment score, computed by a Python Flask scoring microservice. The formula is explicit and auditable, not a trained model; nothing here learns from data
- **Conservative compatibility matching with strict rare-type reservation** — donors are ranked using a compatible-donor matrix per blood group. This is deliberately narrower than textbook ABO/Rh compatibility: full universal-donor logic (O− to any recipient) is **not** implemented, because treating the scarcest types as universal substitutes drains them first. The matrix encodes a scarcity-management policy, not a claim of clinical correctness — any real deployment needs sign-off from a qualified transfusion service
- **Strict rare-type reservation** — scarce types (O−, AB−) are matched only against requests for their own exact type; they are never used as cross-type substitutes for other blood groups, regardless of urgency
- **Geolocation-based matching** — donors and hospitals are geocoded (via Nominatim/OpenStreetMap) to real coordinates, with hardened validation against garbage or misleading geocoding results; requests search a widening radius (10km → 25km → 50km → 100km), stopping at the first tier with a qualifying donor
- **GPS-based location capture** — donors and hospitals can share their device location directly at registration for faster, more accurate matching, with manual address entry (geocoded via Nominatim) as a fallback if permission is denied. Donor coordinates are fuzzed before storage to preserve privacy; hospital coordinates are stored exact
- **90-day donor eligibility window** — donors are automatically excluded from matching for 90 days after their last donation, regardless of their manual availability toggle, reflecting the real medical recovery period for whole-blood donation
- **Escalation on decline or no-show** — if a donor declines, or a hospital reports a no-show after acceptance, the system immediately searches for and notifies a replacement donor, excluding everyone already tried for that request
- **Escalation on silence** — a background job checks every 5 minutes for requests where no donor has responded within 15 minutes, and escalates to a new batch of donors
- **Commitment score reflects real outcomes, not just replies** — score increases only when a donor actually completes a donation, and decreases for both declines and no-shows (no-shows penalized more heavily, since they break trust after other donors were already excluded); score is clamped between 0 and 100
- Donors ranked by blood compatibility, proximity, availability, and commitment score
- Shortage prediction — predicts which blood groups will run low based on 30-day history
- Request auto-expiry — PENDING requests expire after 24 hours via background job
- Badge system — donors earn badges (First Blood, Lifesaver, Hero etc)
- **Photo verification of donations (Cloudinary)** — a hospital cannot mark a request fulfilled without uploading a photo of the blood bag, which carries the donor's details printed on the label. The photo becomes the donor's proof that their blood was actually collected, visible in their match history and optionally on their hero certificate. Photos are stored on Cloudinary as `authenticated` assets and served only through server-signed URLs, so a leaked link cannot expose a donor's name and blood group to the public web
- **Hero certificates — shareable donation cards (web + mobile)** — when a hospital marks a request fulfilled, the donor is notified their donation was confirmed and can view a designed, downloadable/shareable certificate card (blood group, donation count, commitment score, badge earned, donation details) directly from their match history. Shareable to WhatsApp and other apps via the native share sheet; downloadable as PNG on web, savable to photos on mobile (native dev builds)
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
| Scoring Engine (`ai-engine/`) | Python 3, Flask |
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
| Infrastructure | Docker (docker-compose) |

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

---

## Project Structure

```
foorikhoon/
├── frontend/                  Next.js web app
│   ├── jest.config.js         serial by necessity — see the note in the file
│   ├── tests/                 React Testing Library suites (register, donor, hospital)
│   └── src/
│       ├── app/               Pages (App Router)
│       │   ├── page.tsx       Landing page
│       │   ├── globals.css    Tailwind v4 @theme tokens + texture utilities
│       │   ├── login/
│       │   ├── register/
│       │   ├── requests/
│       │   ├── leaderboard/
│       │   ├── donor/
│       │   ├── hospital/
│       │   └── admin/
│       ├── components/
│       │   ├── fk.tsx         shared design-system primitives (see Design System)
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
│       ├── index.tsx          Landing screen
│       ├── login.tsx
│       ├── register.tsx
│       ├── donor/
│       │   ├── dashboard.tsx
│       │   ├── matches.tsx
│       │   └── profile.tsx
│       ├── hospital/
│       │   ├── dashboard.tsx
│       │   └── new-request.tsx
│       ├── requests/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       └── leaderboard.tsx
│   └── src/
│       ├── components/
│       │   ├── WeeklyHeroes.tsx
│       │   ├── CityStats.tsx
│       │   ├── HeroCertificate.tsx
│       │   └── OfflineBanner.tsx
│       ├── hooks/useNetwork.ts
│       ├── lib/
│       │   ├── api.ts
│       │   ├── cache.ts
│       │   └── notifications.ts
│       └── store/authStore.ts
│
├── backend/
│   └── src/
│       ├── index.ts
│       ├── routes/
│       ├── controllers/
│       ├── middleware/
│       ├── services/
│       │   └── notification.service.ts
│       ├── jobs/
│       │   ├── expiry.job.ts
│       │   └── escalation.job.ts
│       └── lib/
│           ├── prisma.ts
│           ├── geocode.ts
│           ├── distance.ts
│           ├── compatibility.ts
│           └── donorMatching.ts
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── seed-admin.ts
│
├── ai-engine/
│   └── app.py
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
└── docker-compose.yml
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
               photoPublicId, photoUploadedAt — Cloudinary proof-of-donation photo (see below)
Inventory    — hospital blood stock per blood group
```

---

## API Endpoints

```
AUTH
POST  /api/auth/register
POST  /api/auth/login

DONOR
POST  /api/donor/profile
GET   /api/donor/profile              → includes badges
PUT   /api/donor/profile
PUT   /api/donor/availability
PUT   /api/donor/push-token
GET   /api/donor/matches
PUT   /api/donor/matches/:id          → donor accepts/declines a match
GET   /api/donor/certificate/:matchId → returns hero-certificate data for a COMPLETED match
                                         (donor name, blood group, city, hospital, date,
                                         badge earned, donation count, commitment score)

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests
GET   /api/hospital/analytics
PUT   /api/hospital/requests/:id/fulfill   → multipart/form-data, field "photo" (required).
                                              Marks donation complete, rewards donor, sends a
                                              "Donation Confirmed" push notification
PATCH /api/hospital/matches/:id/no-show    → marks accepted donor as no-show, penalizes, escalates
PUT   /api/hospital/push-token             → saves hospital's Expo push token

REQUESTS
POST  /api/requests             → creates request + donor scoring + push notifications
GET   /api/requests             → public, sorted ascending
GET   /api/requests/:id
PUT   /api/requests/:id

ADMIN
GET    /api/admin/stats
GET    /api/admin/hospitals
PUT    /api/admin/hospitals/:id/verify
DELETE /api/admin/hospitals/:id
GET    /api/admin/users
DELETE /api/admin/users/:id     → deletes a donor/hospital account and its profile; admin accounts excluded
GET    /api/admin/requests

MAP
GET   /api/map/stats
GET   /api/map/public-stats
GET   /api/map/weekly-heroes    → includes matchId per hero, linking to their certificate
GET   /api/map/leaderboard
GET   /api/map/shortage
```

---

## Scoring Engine (`ai-engine/`)

A standalone Python/Flask microservice that ranks donors and projects shortages. The
directory and route prefix are named `ai` for historical reasons, but nothing in it is
machine learning: both endpoints are deterministic arithmetic over the weights documented
below, so the same inputs always produce the same ranking and any result can be explained
by hand. Replacing the rule-based scoring with a trained model is on the roadmap, not in
the codebase.

```
POST /ai/match    — scores and ranks donors for a blood request
POST /ai/predict  — predicts blood group shortage based on 30-day history
```

### Matching Algorithm (Reliability-Weighted Donor Prioritization)

```
Exact blood-group match         → +50 points
Compatible (non-exact) match    → +35 points
Proximity (gradient, 0-100km)   → up to +30 points, fading to 0 at 100km
Is available                    → +20 points
Commitment score                → score × 0.5 bonus
```

**Rare blood types (O−, AB−) are excluded from every other group's compatible-donor list.** They are only ever considered for requests of their own exact type — never surfaced as a cross-type substitute for another blood group, even under CRITICAL urgency. This keeps scarce donors reserved for the patients who specifically need them.

**Donor eligibility** for any match — initial matching, decline-escalation, or timeout-escalation — requires: matching blood compatibility, `isAvailable = true`, and either no prior donation or at least 90 days since `lastDonated` (the standard whole-blood recovery window). This is enforced by a single shared query (`lib/donorMatching.ts`) used by all three matching entry points, so the rule can't drift out of sync between them.

**Radius escalation:** for a given request, the eligible donor pool is searched at increasing radii — 10km, then 25km, 50km, 100km — using a bounding-box pre-filter (cheap, indexable) followed by precise Haversine distance on the much smaller candidate set. The search stops at the first radius tier with any qualifying donor, so nearby donors are always preferred over farther ones.

**Escalation on decline or no-show:** the moment a donor declines, or a hospital reports an accepted donor as a no-show, the system immediately re-runs the eligibility search — excluding every donor already tried for that request — and notifies a single replacement, rather than waiting for a timeout. The request's status is reset to PENDING at this point, since it no longer has a confirmed donor.

**Escalation on silence:** a background job (`escalation.job.ts`) runs every 5 minutes and finds any PENDING request where every existing match is still PENDING and was created more than 15 minutes ago. It re-runs the same eligibility search (excluding already-tried donors) and notifies a fresh batch of up to 3 donors.

Top 3 ranked donors (from the winning radius tier) are matched and notified via push notification on initial request creation; escalation notifies one donor at a time (decline/no-show) or a fresh batch of 3 (timeout).

### Shortage Prediction

```
ratio = requestCount / donorCount (last 30 days)

ratio >= 0.8  → CRITICAL
ratio >= 0.5  → HIGH
ratio >= 0.3  → MODERATE
ratio <  0.3  → LOW
```

---

## Request Lifecycle

```
PENDING   → request posted, matching donors notified
MATCHED   → donor accepted, on their way
FULFILLED → hospital marks complete after blood is actually donated
EXPIRED   → no donor responded within 24 hours (auto by cron job)
```

A request can move back from MATCHED to PENDING if the accepted donor is later reported as a no-show — the request isn't considered resolved until a donation is actually marked FULFILLED.

---

## Match Status

```
PENDING    → donor notified, awaiting response
ACCEPTED   → donor said yes
DECLINED   → donor said no — commitment score -5, replacement escalation triggered
COMPLETED  → donor actually donated — commitment score +10, lastDonated updated,
             donor notified with a "Donation Confirmed" push and can view their
             hero certificate
NO_SHOW    → donor accepted but never donated — commitment score -10, replacement escalation triggered
```

---

## Commitment Score System

```
Donor completes a donation (COMPLETED)    → +10 points
Donor declines a match (DECLINED)         → -5 points
Donor accepts but never donates (NO_SHOW) → -10 points (penalized more than a decline,
                                             since it wastes the request's time after
                                             other donors were already excluded)
Score range: 0 - 100 (clamped)
Higher score = ranked higher in future donor ranking
```

Accepting a match, on its own, no longer changes the score — only a confirmed outcome (an actual donation, or a confirmed no-show) does, since simply saying yes isn't proof of reliability.

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

## Photo Verification of Donations

A hospital cannot mark a request as fulfilled without attaching a photo of the blood bag. Because Pakistani blood bags carry the donor's name and blood group printed on the label, that photo doubles as the donor's independent evidence that their blood was actually collected rather than the hospital simply clicking a button.

The fulfil endpoint accepts `multipart/form-data` with a single `photo` field. Uploads are capped at 5MB and restricted to JPEG, PNG and WebP. The request is authorised before a single byte is buffered, and the file is pushed to Cloudinary before any database write happens — so a failed upload leaves the request exactly as it was, and a failed database write deletes the just-uploaded asset instead of orphaning it. The status change, the score increment and the photo attachment all happen inside one Prisma transaction; the push notification is sent afterwards, outside it, so an external HTTP call can never hold a database connection open.

Fulfilment now also requires an ACCEPTED match to exist. Previously a request could be marked FULFILLED with no donor attached, which awarded nothing to anybody and left a misleading record.

---

## Hero Certificates

When a hospital marks a request as fulfilled, the donor whose match is COMPLETED:

1. Has their commitment score incremented and `lastDonated` updated (as above)
2. Receives a push notification confirming their donation, including whether it unlocked a new badge
3. Can open a "View Certificate" action from their match history to see a designed, portrait shareable card — donor name, blood group, donation count, commitment score, badge earned (if any), and donation details (date, hospital, certificate ID)
4. Can share the card directly via the device's native share sheet (WhatsApp, etc.) or download it as a PNG

**Web** — the card is rendered as plain-inline-styled HTML/CSS (deliberately avoiding Tailwind's oklch/oklab-based color utilities, which `html2canvas` can't parse) and exported client-side via `html2canvas`.

**Mobile** — the same design is built with React Native `StyleSheet` and captured via `react-native-view-shot`; sharing uses `expo-sharing`.


---

## Design System (web)

The web app has one visual language, defined in two files.

**`src/app/globals.css`** holds the palette and textures as Tailwind v4 `@theme` tokens, so
they compile to ordinary utilities — `bg-ink`, `bg-surface`, `bg-raised`, `bg-blood`,
`text-bone`, `text-mute`, `text-faint`, `text-life`, `text-warn`, `border-line`,
`border-line-soft`. There is no `tailwind.config.js`; Tailwind v4 is configured in CSS.

**`src/components/fk.tsx`** holds the shared primitives every route builds from —
`PageHead`, `SectionLabel`, `Panel`, `Lattice`, `Stat`, `Chip`, `EmptyState`, `Field`,
`SegmentMeter`, `Texture`, `Reveal`, `LiveDot` — plus named class strings (`primaryBtn`,
`ghostBtn`, `inputClass`, `selectClass`, …) and the enum→colour maps (`urgencyTone`,
`statusTone`, `riskTone`). The class strings are complete variants rather than a base to
override, because Tailwind resolves conflicting utilities by CSS source order, not by the
order they appear in a `className`.

Three rules the whole UI holds to:

- **Four colour families only** — blood red for danger and brand, amber for the middle
  tier, green for confirmed good outcomes, and neutral bone/grey for everything else. A
  fifth hue would mean colour is decorating rather than meaning something.
- **No emoji.** Every glyph that carried meaning is a `lucide-react` icon, or geometry
  where an icon cannot survive rasterisation (see below).
- **Nothing implied that the page did not fetch.** Figures are labelled with what they
  actually count — e.g. hospital analytics draws its low-stock rule at `units < 5` because
  that is the threshold the analytics controller itself uses, and the admin shortage table
  states outright that request counts are 30-day windowed while donor counts are not.

`HeroCertificate.tsx` is the one deliberate exception: everything inside the captured card
uses plain inline hex/rgba, since `html2canvas` cannot parse the `oklch()` values Tailwind
v4 compiles its palette to. Every text node in it also carries an explicit `lineHeight`,
without which the exported PNG mis-centres text that looks correct on screen. Its marks are
CSS shapes rather than icons or glyphs for the same reason.

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon DB free tier)
- Expo Go app (for mobile development)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and the three CLOUDINARY_* values
# (Cloudinary is required for donation photo verification — the fulfil
#  endpoint returns a clear error if the keys are missing)
npx prisma migrate dev
npx ts-node prisma/seed.ts
npx ts-node prisma/seed-admin.ts
npm run dev
```

### Web Frontend
```bash
cd frontend
npm install
# Add NEXT_PUBLIC_API_URL=http://localhost:5000 to .env.local
npm run dev
```

### Scoring Engine (`ai-engine/`)
```bash
cd ai-engine
pip install flask flask-cors
python app.py
```

### Mobile App
```bash
cd mobile
yarn install
# Add EXPO_PUBLIC_API_URL=http://<your-local-ip>:5000 to .env
# (must be your machine's local network IP, not localhost — a physical
# device can't resolve localhost back to your dev machine)
yarn expo start --go
```

### Docker (all services)
```bash
cp .env.example .env
docker-compose up --build
```

---

## Tests

```bash
cd frontend && npm test          # React Testing Library suites, jsdom
cd backend  && npm run test:unit  # no database needed
cd backend  && npm test           # unit + integration (needs .env.test)
```

The backend's integration tests run against **real Postgres** — create a second Neon branch,
point `.env.test` at it, and run `npm run test:migrate` once. The loader refuses to run if
`.env.test` and `.env` resolve to the same database. Full instructions, cleanup and the known
gaps are in [`backend/tests/README.md`](./backend/tests/README.md).

`frontend/jest.config.js` pins `maxWorkers: 1` deliberately: the SWC binary installed on the
development machine cannot load inside a Jest worker process, so parallel runs fail whenever
the transform cache is cold. The reasoning is documented in the file.

---

## Test Accounts (after seeding)

```
Donor:    donor1@foorikhoon.com  / 123456
Hospital: hospital1@foorikhoon.com / 123456
Admin:    admin@321.com / (set via prisma/seed-admin.ts)
```

---

## Mobile App Features

- Full donor and hospital flows
- Push notifications (production via Expo Push Service + FCM)
- Offline support with cached data and "Last updated X ago" banner
- City stats, weekly heroes, public request board
- Leaderboard with city filter
- Secure token storage via Expo SecureStore
- Shareable hero certificate cards for completed donations
- Blood-bag photo capture (camera or gallery) for hospitals confirming a donation, and proof-photo viewing for donors

---

## Known Limitations

- The radius query currently pulls candidates per tier from Postgres using a lat/lng bounding-box filter, then computes precise distance in the application layer. This is efficient enough for the project's current scale, but a production deployment with a very large donor base would benefit from a PostGIS spatial index (`ST_DWithin`) to push distance filtering fully into the database.
- Saving a hero certificate directly to the mobile photo library needs a native `expo-media-library` permission declaration that Expo Go's fixed binary doesn't support; this only works once the project is built with EAS or a custom dev client. In the meantime, mobile users can still share the certificate via the native share sheet.
- Signed URLs for donation photos are access-controlled but do **not** expire. Cloudinary's standard plans sign `authenticated` assets without a TTL; genuine short-lived links require either the token-based authentication add-on or proxying the image bytes through our own API. In practice this means a signed URL, if deliberately copied out of the app, stays valid — the meaningful protection is that the URL cannot be guessed or discovered without authenticating first.

---

## Roadmap — Planned Features

- Twilio SMS notifications for donors without smartphones
- Chart.js analytics for admin and hospital dashboards — hospital analytics currently draws
  its stock profile with hand-built CSS columns, since `/api/hospital/analytics` returns no
  time series and there is nothing yet for a charting library to plot over time. Chart.js is
  not a dependency
- Real-time updates via WebSockets (Socket.io)
- Redis caching for public stats, leaderboard, heatmap
- Urdu language support (i18n) for web and mobile
- Blood drive event scheduling
- Hospital-to-hospital inventory transfer
- Donor health eligibility checklist before match acceptance
- Streak & achievement system
- Trained ML model (logistic regression) replacing rule-based scoring, once sufficient real/synthetic data is available
- End-to-end tests (Cypress) and CI/CD via GitHub Actions — unit and integration suites
  already exist for both backend and web frontend (see [Tests](#tests))
- AWS deployment (EC2, S3, RDS, CloudWatch)
- Small-scale user study (SUS usability testing) for FYP evaluation
- Google Play Store release, including moving mobile builds to EAS/dev-client (also unlocks direct photo-library saving for certificates)
- Automatic (cron-based) no-show detection — currently a hospital must manually report a no-show; a timeout-based auto-flag is a possible future improvement

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

RWDP produced a statistically significant fulfillment-rate improvement over both baselines under abundant and moderate donor supply, and a consistently lower no-show rate than random selection across every scenario (e.g. 5.87% vs 11.83% under abundant supply) — evidence that commitment-score weighting measurably improves donor reliability, not just match speed.

Under severe donor scarcity, RWDP's advantage over random selection disappears (not statistically significant), since a very small candidate pool leaves little room for donor ordering to matter — nearly every available donor ends up contacted regardless of priority. RWDP still significantly outperforms the exact-match-only baseline in this condition, since compatibility-matrix matching alone continues to expand the usable donor pool.

**Known limitation:** RWDP consistently produces a higher maximum donor load than the random baseline across all scenarios (e.g. ~21–26 vs ~8–19 times the most-contacted donor was reached), since top-scored donors are repeatedly prioritized. This is a fairness trade-off worth addressing in future work (e.g. a temporary priority cooldown after consecutive matches), not currently implemented.

Full methodology, results, and discussion available in [RWDP_Research_Report.pdf](./research/RWDP_Research_Report.pdf).

---


## System Design

Architecture, ER, DFD (levels 0-1), sequence, and state diagrams are available in [`/diagrams`](./diagrams).

## Status

Active development. Final Year Project — Gomal University, D.I. Khan (2023–2027).

## Author

Sohaib Khan · BSCS · Gomal University, D.I. Khan
github.com/sohaibkundi2 · sohaibkhan.me