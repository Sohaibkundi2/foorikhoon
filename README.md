# ForiKhoon — Emergency Blood Network

A full-stack blood donation platform connecting donors with hospitals across Pakistan in real time.

---

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to matching the right donor using AI, to tracking whether the donation happened.

**For donors** — register once, set your blood group and availability, get notified when someone nearby needs your blood type, and build a commitment score over time.

**For hospitals** — post emergency requests, track responses in real time, manage blood inventory, and get matched with the most reliable donors first.

**For administrators** — monitor donation activity across cities, verify hospitals, and view live stats and shortage trends.

---

## Key Features

- Role-based access for donors, hospitals, and admins
- AI-powered donor matching using Python Flask microservice
- Donors ranked by blood compatibility, location, availability, and commitment score
- Escalation system — requests auto-expire after 24 hours
- Commitment scoring — donors earn points for accepting, lose points for declining
- Badge system — donors earn badges for milestones (First Blood, Lifesaver, Hero)
- City-level heatmap showing blood demand across Pakistan
- Live public stats on landing page
- Admin dashboard with hospital verification, user management, and request monitoring
- Background jobs using node-cron for auto-expiry

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
│   ├── src/
│   │   ├── app/               Pages (App Router)
│   │   │   ├── page.tsx       Landing page with heatmap
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── donor/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── profile/
│   │   │   │   └── matches/
│   │   │   ├── hospital/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── profile/
│   │   │   │   ├── requests/
│   │   │   │   ├── inventory/
│   │   │   │   └── request/new/
│   │   │   └── admin/
│   │   │       └── dashboard/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Map.tsx
│   │   │   └── BadgePopup.tsx
│   │   ├── store/
│   │   │   └── authStore.ts   Zustand auth store
│   │   └── lib/
│   │       └── api.ts         Axios instance
│
├── backend/                   Node.js + Express API
│   ├── src/
│   │   ├── index.ts           Entry point
│   │   ├── routes/            Auth, Donor, Hospital, Request, Admin, Map
│   │   ├── controllers/       Business logic
│   │   ├── middleware/        Auth + Role middleware
│   │   ├── jobs/              Expiry job (node-cron)
│   │   └── lib/
│   │       └── prisma.ts      Prisma client
│   └── prisma/
│       ├── schema.prisma      Database models
│       ├── migrations/
│       └── seed.ts            Seed data (50 donors, 5 hospitals, 25 requests)
│
├── ai-engine/                 Python Flask microservice
│   └── app.py                 Donor scoring + ranking endpoint
│
└── docker-compose.yml
```

---

## Database Models

```
User        — base model for all roles (DONOR, HOSPITAL, ADMIN)
Donor       — blood group, availability, commitment score, badges
Hospital    — name, address, license, verified status
BloodRequest — blood group, units, urgency, status, expiry
Match       — links donor to request, tracks response
Inventory   — hospital blood stock per blood group
```

---

## API Endpoints

```
AUTH
POST  /api/auth/register
POST  /api/auth/login

DONOR
POST  /api/donor/profile
GET   /api/donor/profile
PUT   /api/donor/profile
PUT   /api/donor/availability
GET   /api/donor/matches
PUT   /api/donor/matches/:id

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests

REQUESTS
POST  /api/requests
GET   /api/requests
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
```

---

## AI Matching Algorithm

When a hospital posts a blood request, Node.js calls the Python Flask AI engine with the list of eligible donors. Each donor is scored:

```
Blood group match  → +50 points
City match         → +30 points
Is available       → +20 points
Commitment score   → score × 0.5 bonus points
```

Donors are ranked by score. Only the top 3 are matched and notified.

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (or Neon DB account)

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

### Docker (all services)

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
docker-compose up --build
```

---

## Test Accounts (after seeding)

```
Donor:    donor1@foorikhoon.com  / 123456
Hospital: hospital1@foorikhoon.com / 123456
Admin:    (create via seed script or update role manually)
```

---


## Author

Sohaib Khan
github.com/sohaibkundi2
sohaibkhan.me