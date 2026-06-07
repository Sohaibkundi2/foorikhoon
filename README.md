# ForiKhoon

A blood donation platform built for Local Area, connecting donors with hospitals in real time.

## The Problem

Finding blood in an emergency in Pakistan is still largely word-of-mouth. Hospitals run out of stock with no reliable way to notify donors. Donors are willing to help but have no structured way to be reached. The gap between supply and demand costs lives.

## What ForiKhoon Does

ForiKhoon bridges that gap with a platform that handles the full lifecycle of a blood donation request — from the moment a hospital posts a need, to matching the right donor, to tracking whether the donation happened.

**For donors** — register once, set your blood group and availability, and get notified when someone nearby needs your blood type.

**For hospitals** — post emergency requests, track responses in real time, and manage your blood inventory in one place.

**For administrators** — monitor donation activity across cities, verify hospitals, and view shortage trends before they become crises.

## Key Features

- Role-based access for donors, hospitals, and admins
- Smart donor matching based on blood group, location, and availability
- Escalation system that widens the search if no donor responds within a time window
- Commitment scoring that tracks donor reliability over time
- City-level heatmap showing blood availability and active requests
- AI-powered shortage prediction using historical donation patterns
- SMS and push notifications via Twilio and Firebase

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM |
| AI Engine | Python, Flask |
| Notifications | Twilio SMS, Firebase Push |
| Infrastructure | Docker |

## Architecture

```
Next.js Frontend
      |
      | REST
      |
Node.js + Express (API Gateway)
      |
      |--- Prisma ORM --- PostgreSQL (Neon)
      |--- HTTP --------- Python Flask (AI Engine)
      |--- SDK ---------- Twilio / Firebase
```

## Project Structure

```
foorikhoon/
├── frontend/        Next.js app
├── backend/         Node.js + Express API
└── ai-engine/       Python Flask microservice
```

## Status

Active development. Built as a final year project at Gomal University, with the goal of deploying a working version for use in D.I. Khan and surrounding districts.

## Author

Sohaib Khan
BSCS — Gomal University