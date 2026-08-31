# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

**Live demo:** [https://forikhoon.app](https://forikhoon.app)

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
| Infrastructure | Docker, Docker Compose, nginx (reverse proxy + TLS), AWS EC2 (Elastic IP), Neon (managed Postgres) |

---

## Architecture

```
Next.js Web App                       React Native Mobile App
        |                                      |
        |         HTTPS / REST API             |
        └──────────────┬───────────────────────┘
                       |
                  nginx (TLS termination, reverse proxy)
                       |
         Node.js + Express Backend (port 5000)
                  |              |
            Prisma ORM        HTTP POST
                  |              |
          PostgreSQL        Python Flask
           (Neon DB)        Scoring Engine (port 5001)
```

All three services (backend, scoring engine, web frontend) run as separate Docker containers on a single AWS EC2 instance, coordinated by `docker-compose.yml`, with nginx handling TLS and routing in front of them. The database remains external, managed by Neon.

Full deployment notes, real bugs found in production, and the security audit are in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Documentation

- [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) — full repo layout, database models, request/match lifecycle, badge and commitment-score systems
- [`docs/API.md`](./docs/API.md) — all API endpoints
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — scoring engine internals, deployment details, real bugs found and fixed, testing, security audit findings

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

Seed scripts (`prisma/seed.ts`, `prisma/seed-admin.ts`) create local test accounts for development — see those files for credentials. None are exposed here since this repo is public.

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

## Known Limitations

The radius query pulls candidates per tier from Postgres using a lat/lng bounding-box filter, then computes precise distance in the application layer. This is efficient enough for the project's current scale, but a production deployment with a very large donor base would benefit from a PostGIS spatial index (`ST_DWithin`).

No-show detection is currently manual — a hospital must actively report it; there is no automatic timeout-based flag.

The scoring engine's compatibility matrix is deliberately maintained in two places (`backend/lib/compatibility.ts` and `ai-engine/app.py`) rather than one shared source of truth, since they're separate languages/services. Both sides are now pinned by tests, so editing either without the other fails a test rather than silently diverging. It remains two files to keep in step, though, and that is a manual-sync risk.

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

## System Design

Architecture, ER, DFD (levels 0-1), sequence, and state diagrams are available in [`/diagrams`](./diagrams).

## Status

Deployed. Final Year Project — Gomal University, D.I. Khan (2023–2027).

## Author

Sohaib Khan · BSCS · Gomal University, D.I. Khan
github.com/sohaibkundi2 · https://mr-sohaib.vercel.app