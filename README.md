# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to matching the right donor using AI, to tracking whether the donation happened.

**For donors** — register once, set your blood group and availability, get notified when someone nearby needs your blood type, earn badges for milestones, and build a commitment score over time.

**For hospitals** — post emergency requests, track donor responses in real time, manage blood inventory, view analytics, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, view live stats, shortage predictions, and manage all users.

**For the public** — view active blood requests, filter by city and blood group, share requests, and see the donor leaderboard.

---

## Key Features

- Role-based access for donors, hospitals, and admins
- AI-powered donor matching using Python Flask microservice
- **Medically correct blood-compatibility matching** — donors ranked using a compatible-donor matrix per blood group
- **Strict rare-type reservation** — scarce types (O−, AB−) are matched only against requests for their own exact type; they are never used as cross-type substitutes for other blood groups, regardless of urgency
- **Geolocation-based matching** — donors and hospitals are geocoded (via Nominatim/OpenStreetMap) to real coordinates; requests search a widening radius (10km → 25km → 50km → 100km), stopping at the first tier with a qualifying donor, instead of relying on exact city-name matches
- Donors ranked by blood compatibility, proximity, availability, and commitment score
- Shortage prediction — predicts which blood groups will run low based on 30-day history
- Request auto-expiry — PENDING requests expire after 24 hours via background job
- Commitment scoring — donors earn/lose points based on response behavior
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
│       │   └── expiry.job.ts
│       └── lib/prisma.ts
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
Donor        — blood group, availability, commitment score, pushToken, area, latitude/longitude
Hospital     — name, address, latitude/longitude, license, verified
BloodRequest — blood group, units, urgency, status, expiry
Match        — links donor to request, tracks response
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
GET   /api/donor/profile        → includes badges
PUT   /api/donor/profile
PUT   /api/donor/availability
PUT   /api/donor/push-token
GET   /api/donor/matches
PUT   /api/donor/matches/:id    → updates commitment score + lastDonated

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests
GET   /api/hospital/analytics
PUT   /api/hospital/requests/:id/fulfill

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

**Radius escalation:** for a given request, the compatible donor pool is searched at increasing radii — 10km, then 25km, 50km, 100km — using a bounding-box pre-filter (cheap, indexable) followed by precise Haversine distance on the much smaller candidate set. The search stops at the first radius tier with any qualifying donor, so nearby donors are always preferred over farther ones. This is designed to stay reasonably efficient even with a large donor base, since the database — not the application — narrows the candidate set before distance is calculated.

Top 3 ranked donors (from the winning radius tier) are matched and notified via push notification.

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
FULFILLED → hospital marks complete after blood collected
EXPIRED   → no donor responded within 24 hours (auto by cron job)
```

---

## Commitment Score System

```
Donor accepts match   → +10 points
Donor declines match  → -5 points
Score range: 0 - 100
Higher score = ranked higher in future AI matching
```

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

## Roadmap — Planned Features

### Recently completed
- **Geolocation-based matching** — lat/lng + Haversine distance with radius escalation (10km → 25km → 50km → 100km), replacing city-string matching. Hospitals geocoded to an exact point (verified institutions); donors geocoded to an area/neighborhood center only, to preserve location privacy. Addresses geocoded via Nominatim (OpenStreetMap).
- **Strict rare-type reservation policy** — O−/AB− donors are reserved exclusively for exact-type requests, never used as cross-type substitutes.

### Known limitation
- The radius query currently pulls candidates per tier from Postgres using a lat/lng bounding-box filter, then computes precise distance in the application layer. This is efficient enough for the project's current scale, but a production deployment with a very large donor base would benefit from a PostGIS spatial index (`ST_DWithin`) to push distance filtering fully into the database.

### Planned
- Twilio SMS notifications for donors without smartphones
- Full escalation system — auto-expand search radius / notify next donor batch if no response within 30 minutes
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

---

## Research Contribution

This project proposes a **Reliability-Weighted Donor Prioritization (RWDP)** framework for emergency blood donation. Unlike existing blood bank directories that treat all available donors equally, RWDP ranks donors using a composite score combining blood compatibility, geographic proximity, real-time availability, and longitudinal commitment history. The commitment score updates dynamically after each interaction, creating a self-improving prioritization system that favors historically reliable donors in future matches. A planned simulation study will compare RWDP against random-baseline matching to quantify improvement in donation fulfillment rates.

---

## Status

Active development. Final Year Project — Gomal University, D.I. Khan (2023–2027).

## Author

Sohaib Khan · BSCS · Gomal University, D.I. Khan
github.com/sohaibkundi2 · sohaibkhan.me