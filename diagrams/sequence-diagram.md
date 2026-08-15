# Sequence Diagram

## Simplified — Happy Path

![Sequence Diagram (small)](./sequence-diagram-small.svg)

```mermaid
sequenceDiagram
    participant H as Hospital
    participant B as Backend
    participant AI as AI Engine
    participant DB as Database
    participant D as Donor

    H->>B: Post blood request
    B->>DB: Find eligible donors (compatibility, radius, availability)
    B->>AI: Rank candidates
    AI-->>B: Top 3 donors
    B->>DB: Create match records
    B->>D: Push notification

    D->>B: Accept match
    B->>H: Notify hospital (donor accepted)

    H->>B: Mark fulfilled
    B->>DB: Update donor's commitment score, request status
    B-->>H: Confirmed
```

## Detailed — Full Lifecycle Including Escalation

![Sequence Diagram (detail)](./sequence-diagram-detail.svg)

```mermaid
sequenceDiagram
    participant H as Hospital
    participant B as Backend
    participant AI as AI Engine
    participant DB as Database
    participant D1 as Donor A
    participant D2 as Donor B
    participant Cron as Escalation Job

    H->>B: POST /api/requests (bloodGroup, urgency)
    B->>DB: findEligibleDonors (compatibility, 90-day, radius tiers)
    DB-->>B: candidate donors + distances
    B->>AI: POST /ai/match (candidates, request)
    AI-->>B: ranked donors (top 3)
    B->>DB: create Match rows (status: PENDING)
    B->>D1: push notification
    B->>D2: push notification
    B-->>H: 201 Created (matchedDonors, radiusUsed)

    Note over D1,D2: Path 1 — Donor declines
    D1->>B: PUT /matches/:id (status: DECLINED)
    B->>DB: commitmentScore -5 (clamped >= 0)
    B->>B: escalateAfterDecline(requestId)
    B->>DB: findEligibleDonors (exclude D1)
    B->>DB: create new Match (replacement donor)
    B->>D2: push notification (replacement)

    Note over D2,H: Path 2 — Donor accepts, then no-show
    D2->>B: PUT /matches/:id (status: ACCEPTED)
    B->>DB: BloodRequest status -> MATCHED
    B->>H: push notification (donor accepted + contact info if shared)
    H->>B: PATCH /matches/:id/no-show
    B->>DB: commitmentScore -10 (clamped >= 0)
    B->>DB: BloodRequest status -> PENDING
    B->>B: escalateAfterDecline(requestId)
    B->>DB: findEligibleDonors (exclude D1, D2)
    B->>DB: create new Match (replacement donor)

    Note over Cron: Path 3 — Silence (background job, every 5 min)
    Cron->>DB: find PENDING requests, all matches PENDING > 15 min
    Cron->>DB: findEligibleDonors (exclude already-tried)
    Cron->>DB: create up to 3 new Match rows
    Cron->>D1: push notification (fresh batch)

    Note over D2,H: Path 4 — Successful fulfillment
    D2->>B: PUT /matches/:id (status: ACCEPTED)
    B->>DB: BloodRequest status -> MATCHED
    H->>B: PUT /requests/:id/fulfill
    B->>DB: Match status -> COMPLETED
    B->>DB: commitmentScore +10 (clamped <= 100), lastDonated = now
    B->>DB: BloodRequest status -> FULFILLED
    B-->>H: 200 OK
```

## Notes

- Decline and no-show both call the same `escalateAfterDecline` function — they're the same underlying problem (request lost its donor, needs a replacement, exclude everyone already tried), just triggered from different events.
- All three escalation entry points (decline, no-show, silence-timeout) funnel through the same shared `findEligibleDonors` query, so the eligibility rules (compatibility, 90-day window, availability) can't drift out of sync between them.
- The `MATCHED → PENDING` transition on the no-show path exists because a no-show means the request no longer has a confirmed donor — it isn't resolved just because someone once accepted.
