# Project Structure

```
foorikhoon/
├── deploy/                    Dockerfiles for each service (see docs/ARCHITECTURE.md)
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