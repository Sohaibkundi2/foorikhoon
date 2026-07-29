# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to matching the right donor using AI, to tracking whether the donation actually happened, to automatically finding a replacement if it doesn't.

**For donors** — register once, set your blood group and location, get notified when someone nearby needs your blood type, earn badges for milestones, and build a commitment score based on your actual donation track record.

**For hospitals** — post emergency requests, track donor responses in real time, mark a match as fulfilled or as a no-show, manage blood inventory, view analytics, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, view live stats, shortage predictions, and manage all users.

**For the public** — view active blood requests, filter by city and blood group, share requests, and see the donor leaderboard.

---

## Key Features

- Role-based access for donors, hospitals, and admins
- AI-powered donor matching using Python Flask microservice
- **Medically correct blood-compatibility matching** — donors ranked using a compatible-donor matrix per blood group
- **Strict rare-type reservation** — scarce types (O−, AB−) are matched only against requests for their own exact type; they are never used as cross-type substitutes for other blood groups, regardless of urgency
- **Geolocation-based matching** — donors and hospitals are geocoded (via Nominatim/OpenStreetMap) to real coordinates, with hardened validation against garbage or misleading geocoding results; requests search a widening radius (10km → 25km → 50km → 100km), stopping at the first tier with a qualifying donor
- **90-day donor eligibility window** — donors are automatically excluded from matching for 90 days after their last donation, regardless of their manual availability toggle, reflecting the real medical recovery period for whole-blood donation
- **Escalation on decline or no-show** — if a donor declines, or a hospital reports a no-show after acceptance, the system immediately searches for and notifies a replacement donor, excluding everyone already tried for that request
- **Escalation on silence** — a background job checks every 5 minutes for requests where no donor has responded within 15 minutes, and escalates to a new batch of donors
- **Commitment score reflects real outcomes, not just replies** — score increases only when a donor actually completes a donation, and decreases for both declines and no-shows (no-shows penalized more heavily, since they break trust after other donors were already excluded); score is clamped between 0 and 100
- Donors ranked by blood compatibility, proximity, availability, and commitment score
- Shortage prediction — predicts which blood groups will run low based on 30-day history
- Request auto-expiry — PENDING requests expire after 24 hours via background job
- Badge system — donors earn badges (First Blood, Lifesaver, Hero etc)
- City-level heatmap showing blood demand across Pakistan
- Live public stats on landing page
- Weekly heroes slider — showcases donors who donated this week
- Donor leaderboard with city filter
- Public blood request board with filters
- Hospital analytics — most requested blood group, fulfillment rate, inventory status
- Admin dashboard with hospital verification, shortage alerts, user management
- Push notifications via Expo Push Service (production ready)
- Offline support with cached data on mobile
- Mobile responsive web + React Native mobile app
- **Donor contact-sharing consent** — donors can opt in to sharing their name and phone number with a hospital once they accept a match, to help coordinate the actual donation. Off by default; contact info is only ever included in the hospital's data when the donor has explicitly enabled it and the match is accepted — never exposed otherwise, enforced server-side
- **Hospital push notifications** — hospitals are notified the moment a donor accepts their request, including the donor's contact info if shared

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Mobile App | React Native, Expo SDK 54, Expo Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM v7 |
| AI Engine | Python 3, Flask |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| Mobile Auth | Expo SecureStore |
| State (Web) | Zustand with persistence |
| State (Mobile) | Zustand + AsyncStorage |
| Maps | Leaflet.js, React Leaflet |
| Push Notifications | Expo Push Service (FCM) |
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
           (Neon DB)        AI Engine (port 5001)
```

---

## Project Structure

```
foorikhoon/
├── frontend/                  Next.js web app
│   └── src/
│       ├── app/               Pages (App Router)
│       │   ├── page.tsx       Landing page
│       │   ├── login/
│       │   ├── register/
│       │   ├── requests/
│       │   ├── leaderboard/
│       │   ├── donor/
│       │   ├── hospital/
│       │   └── admin/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Map.tsx
│       │   ├── BadgePopup.tsx
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
│       └── seed.ts
│
├── ai-engine/
│   └── app.py
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

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests
GET   /api/hospital/analytics
PUT   /api/hospital/requests/:id/fulfill   → marks donation complete, rewards donor
PATCH /api/hospital/matches/:id/no-show    → marks accepted donor as no-show, penalizes, escalates
PUT   /api/hospital/push-token             → saves hospital's Expo push token

REQUESTS
POST  /api/requests             → creates request + AI matching + push notifications
GET   /api/requests             → public, sorted ascending
GET   /api/requests/:id
PUT   /api/requests/:id

ADMIN
GET   /api/admin/stats
GET   /api/admin/hospitals
PUT   /api/admin/hospitals/:id/verify
GET   /api/admin/users
GET   /api/admin/requests

MAP
GET   /api/map/stats
GET   /api/map/public-stats
GET   /api/map/weekly-heroes
GET   /api/map/leaderboard
GET   /api/map/shortage
```

---

## AI Engine

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
COMPLETED  → donor actually donated — commitment score +10, lastDonated updated
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
Higher score = ranked higher in future AI matching
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
# Add DATABASE_URL and JWT_SECRET to .env
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev
```

### Web Frontend
```bash
cd frontend
npm install
# Add NEXT_PUBLIC_API_URL=http://localhost:5000 to .env.local
npm run dev
```

### AI Engine
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
yarn expo start --go
```

### Docker (all services)
```bash
cp .env.example .env
docker-compose up --build
```

---

## Test Accounts (after seeding)

```
Donor:    donor1@foorikhoon.com  / 123456
Hospital: hospital1@foorikhoon.com / 123456
Admin:    update role via seed script
```

---

## Mobile App Features

- Full donor and hospital flows
- Push notifications (production via Expo Push Service + FCM)
- Offline support with cached data and "Last updated X ago" banner
- City stats, weekly heroes, public request board
- Leaderboard with city filter
- Secure token storage via Expo SecureStore

---

## Known Limitation

The radius query currently pulls candidates per tier from Postgres using a lat/lng bounding-box filter, then computes precise distance in the application layer. This is efficient enough for the project's current scale, but a production deployment with a very large donor base would benefit from a PostGIS spatial index (`ST_DWithin`) to push distance filtering fully into the database.

---

## Roadmap — Planned Features

- Twilio SMS notifications for donors without smartphones
- Hero certificate / shareable donation card (PNG export, WhatsApp/Instagram sharing)
- Chart.js analytics for admin and hospital dashboards
- Real-time updates via WebSockets (Socket.io)
- Redis caching for public stats, leaderboard, heatmap
- Photo verification of blood donation (Cloudinary)
- Urdu language support (i18n) for web and mobile
- Blood drive event scheduling
- Hospital-to-hospital inventory transfer
- Donor health eligibility checklist before match acceptance
- Streak & achievement system
- Trained ML model (logistic regression) replacing rule-based scoring, once sufficient real/synthetic data is available
- Unit + integration tests (Jest, Cypress), CI/CD via GitHub Actions
- AWS deployment (EC2, S3, RDS, CloudWatch)
- RWDP simulation study — synthetic donor-behavior dataset compared against random-matching baseline
- Small-scale user study (SUS usability testing) for FYP evaluation
- Google Play Store release
- Automatic (cron-based) no-show detection — currently a hospital must manually report a no-show; a timeout-based auto-flag is a possible future improvement

---

## Research Contribution

This project proposes a **Reliability-Weighted Donor Prioritization (RWDP)** framework for emergency blood donation. Unlike existing blood bank directories that treat all available donors equally, RWDP ranks donors using a composite score combining blood compatibility, geographic proximity, real-time availability, and longitudinal commitment history. The commitment score updates dynamically based on confirmed donation outcomes — not just replies — creating a self-improving prioritization system that favors historically reliable donors in future matches. A planned simulation study will compare RWDP against random-baseline matching to quantify improvement in donation fulfillment rates.

---

## Status

Active development. Final Year Project — Gomal University, D.I. Khan (2023–2027).

## Author

Sohaib Khan · BSCS · Gomal University, D.I. Khan
github.com/sohaibkundi2 · sohaibkhan.me