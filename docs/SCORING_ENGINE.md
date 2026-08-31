# Scoring Engine (`ai-engine/`)

A standalone Python/Flask microservice that ranks donors and projects shortages, run under gunicorn in production (not Flask's debug server). The directory and route prefix are named `ai` for historical reasons, but nothing in it is machine learning: both endpoints are deterministic arithmetic over the weights documented below, so the same inputs always produce the same ranking.

```
POST /ai/match    — scores and ranks donors for a blood request
POST /ai/predict  — predicts blood group shortage based on 30-day history
```

## Matching Algorithm (Reliability-Weighted Donor Prioritization)

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

## Shortage Prediction

```
ratio = requestCount / max(donorCount, 1)     (requestCount over the last 30 days)

ratio >= 0.8  → CRITICAL
ratio >= 0.5  → HIGH
ratio >= 0.3  → MODERATE
ratio <  0.3  → LOW
```

A blood group with no available donors is treated as having one notional donor, so its ratio becomes its count of unfillable requests. That keeps severity monotonic — 40 unmet requests outranks 7, which outranks 2 — and keeps a zero-supply group above groups that still have donors, which matters because the landing page shows only the three highest-risk groups. A group with no donors *and* no requests scores 0.0 and stays LOW rather than raising an alarm nobody asked for.