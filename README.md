# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time. Built as a Final Year Project at Gomal University, D.I. Khan.

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to matching the right donor using AI, to tracking whether the donation happened.

**For donors** — register once, set your blood group and availability, get notified when someone nearby needs your blood type, earn badges for milestones, and build a commitment score over time.

**For hospitals** — post emergency requests, track responses in real time, manage blood inventory, view analytics, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, view live stats, shortage predictions, and manage all users.

**For the public** — view active blood requests, filter by city and blood group, share requests, and see the donor leaderboard.

---

## Key Features

- Role-based access for donors, hospitals, and admins
- AI-powered donor matching using Python Flask microservice
- Donors ranked by blood compatibility, location, availability, and commitment score
- Shortage prediction — predicts which blood groups will run low based on 30-day history
- Escalation system — requests auto-expire after 24 hours via background job
- Commitment scoring — donors earn/lose points based on response behavior
- Badge system — donors earn badges (First Blood, Lifesaver, Hero etc)
- City-level heatmap showing blood demand across Pakistan
- Live public stats on landing page
- Weekly heroes slider — showcases donors who donated this week
- Donor leaderboard with city filter
- Public blood request board with filters
- Hospital analytics — most requested blood group, fulfillment rate, inventory status
- Admin dashboard with hospital verification, user management, shortage alerts
- Mobile responsive with hamburger menu

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM v7 |
| AI Engine | Python 3, Flask |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| State | Zustand with persistence |
| Maps | Leaflet.js, React Leaflet |
| Background Jobs | node-cron |
| HTTP Client | Axios |
| Date Handling | Day.js |
| Infrastructure | Docker (docker-compose) |

---

## Architecture

```
Next.js Frontend (port 3000)
        |
        | REST API
        |
Node.js + Express Backend (port 5000)
        |                    |
        | Prisma ORM          | HTTP
        |                    |
PostgreSQL (Neon)     Python Flask AI Engine (port 5001)
```

---

## Project Structure

```
foorikhoon/
├── frontend/                  Next.js app
│   └── src/
│       ├── app/
│       │   ├── page.tsx               Landing page
│       │   ├── login/
│       │   ├── register/
│       │   ├── requests/
│       │   │   ├── page.tsx           Public request board
│       │   │   └── [id]/page.tsx      Request detail
│       │   ├── leaderboard/
│       │   ├── donor/
│       │   │   ├── dashboard/
│       │   │   ├── profile/
│       │   │   └── matches/
│       │   ├── hospital/
│       │   │   ├── dashboard/
│       │   │   ├── profile/
│       │   │   ├── analytics/
│       │   │   ├── requests/
│       │   │   ├── inventory/
│       │   │   └── request/new/
│       │   └── admin/dashboard/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Map.tsx
│       │   ├── BadgePopup.tsx
│       │   └── WeeklyHeroes.tsx
│       ├── store/authStore.ts
│       └── lib/api.ts
│
├── backend/
│   └── src/
│       ├── index.ts
│       ├── routes/
│       ├── controllers/
│       ├── middleware/
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
User         — base model (DONOR, HOSPITAL, ADMIN)
Donor        — blood group, availability, commitment score
Hospital     — name, address, license, verified
BloodRequest — blood group, units, urgency, status, expiry
Match        — links donor to request, tracks response
Inventory    — hospital blood stock per blood group
```

---

## API Endpoints

```
AUTH          POST /api/auth/register, /api/auth/login

DONOR         POST/GET/PUT /api/donor/profile
              PUT /api/donor/availability
              GET /api/donor/matches
              PUT /api/donor/matches/:id

HOSPITAL      POST/GET/PUT /api/hospital/profile
              GET/PUT /api/hospital/inventory
              GET /api/hospital/requests
              GET /api/hospital/analytics

REQUESTS      POST/GET /api/requests
              GET/PUT /api/requests/:id

ADMIN         GET /api/admin/stats
              GET /api/admin/hospitals
              PUT /api/admin/hospitals/:id/verify
              GET /api/admin/users
              GET /api/admin/requests

MAP           GET /api/map/stats
              GET /api/map/public-stats
              GET /api/map/weekly-heroes
              GET /api/map/leaderboard
              GET /api/map/shortage
```

---

## AI Engine Endpoints

```
POST /ai/match    — scores and ranks donors for a blood request
POST /ai/predict  — predicts blood group shortage based on 30-day history
```

### Matching Algorithm

```
Blood group match  → +50 points
City match         → +30 points
Is available       → +20 points
Commitment score   → score × 0.5 bonus
```

Top 3 ranked donors are matched and notified.

### Shortage Prediction

```
ratio = requestCount / donorCount (last 30 days)

ratio >= 0.8  → CRITICAL
ratio >= 0.5  → HIGH
ratio >= 0.3  → MODERATE
ratio < 0.3   → LOW
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon DB free tier works)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Add DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev
```

### Frontend
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

### Docker
```bash
cp .env.example .env
docker-compose up --build
```

---

## Test Accounts (after seeding)

```
Donor:    donor1@foorikhoon.com  / 123456
Hospital: hospital1@foorikhoon.com / 123456
Admin:    update any user role via seed script
```

---

## Pages

| Page | Access |
|---|---|
| / | Public |
| /login | Public |
| /register | Public |
| /requests | Public |
| /requests/:id | Public |
| /leaderboard | Public |
| /donor/dashboard | Donor |
| /donor/profile | Donor |
| /donor/matches | Donor |
| /hospital/dashboard | Hospital |
| /hospital/profile | Hospital |
| /hospital/analytics | Hospital |
| /hospital/requests | Hospital |
| /hospital/inventory | Hospital |
| /hospital/request/new | Hospital |
| /admin/dashboard | Admin |

---

## Author

Sohaib Khan
github.com/sohaibkundi2 · sohaibkhan.me