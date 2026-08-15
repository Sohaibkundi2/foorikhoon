# State Diagrams

## BloodRequest Status

![State Diagram](./state-diagram.svg)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Request created
    PENDING --> MATCHED: Donor accepts
    PENDING --> EXPIRED: 24h with no fulfillment
    MATCHED --> PENDING: Accepted donor reported as no-show
    MATCHED --> FULFILLED: Hospital confirms donation
    FULFILLED --> [*]
    EXPIRED --> [*]

    note right of MATCHED
        Not final — can bounce back
        to PENDING if the donor
        never actually shows up
    end note
```

## Match Status

```mermaid
stateDiagram-v2
    [*] --> MATCH_PENDING: Donor notified
    MATCH_PENDING --> ACCEPTED: Donor accepts
    MATCH_PENDING --> DECLINED: Donor declines
    ACCEPTED --> COMPLETED: Donation confirmed
    ACCEPTED --> NO_SHOW: Hospital reports no-show
    DECLINED --> [*]
    COMPLETED --> [*]
    NO_SHOW --> [*]

    note right of DECLINED
        commitmentScore -5
        triggers replacement escalation
    end note
    note right of NO_SHOW
        commitmentScore -10
        triggers replacement escalation
    end note
    note right of COMPLETED
        commitmentScore +10
        lastDonated updated
    end note
```

## Notes

- The `MATCHED → PENDING` transition on `BloodRequest` is the one transition that isn't a typical forward-only lifecycle step — it reflects that an accepted donor is not a guarantee, only a `COMPLETED` match resolves the request for good.
- `Match` status transitions are strictly one-directional and terminal (`DECLINED`, `COMPLETED`, `NO_SHOW` are all end states for that specific match) — a new attempt at fulfilling the request creates a **new** `Match` row rather than reusing or resetting an old one, which keeps a full audit trail of every donor who was ever tried for a given request.