# Entity-Relationship Diagram

Database schema and relationships, based on `backend/prisma/schema.prisma`.

![ER Diagram](./er-diagram.png)

```mermaid
erDiagram
    User ||--o| Donor : "has"
    User ||--o| Hospital : "has"
    Hospital ||--o{ BloodRequest : "creates"
    Hospital ||--o{ Inventory : "stocks"
    BloodRequest ||--o{ Match : "receives"
    Donor ||--o{ Match : "responds to"

    User {
        string id PK
        string email UK
        string name
        string phone
        Role role
        string password
        string city
        datetime createdAt
        datetime updatedAt
    }

    Donor {
        string id PK
        string userId FK
        BloodGroup bloodGroup
        datetime lastDonated
        boolean isAvailable
        int commitmentScore
        string area
        float latitude
        float longitude
        string pushToken
        boolean shareContactInfo
    }

    Hospital {
        string id PK
        string userId FK
        string name
        string address
        float latitude
        float longitude
        string licenseNo UK
        boolean verified
        string pushToken
    }

    BloodRequest {
        string id PK
        string hospitalId FK
        BloodGroup bloodGroup
        int units
        Urgency urgency
        RequestStatus status
        string notes
        datetime createdAt
        datetime updatedAt
        datetime expiresAt
    }

    Match {
        string id PK
        string requestId FK
        string donorId FK
        MatchStatus status
        datetime respondedAt
        datetime createdAt
    }

    Inventory {
        string id PK
        string hospitalId FK
        BloodGroup bloodGroup
        int units
        datetime updatedAt
    }
```

## Notes

- **`User` → `Donor`/`Hospital` is 1-to-0-or-1, not 1-to-1.** A `User` row can exist without a matching `Donor`/`Hospital` profile — this happens when registration's second step (profile creation) fails after the account itself is already created, and is a real edge case the system has to guard against.
- **`Inventory` has a composite unique constraint** on `(hospitalId, bloodGroup)` — enforces one row per blood group per hospital, which is what makes the inventory-update endpoint's `upsert` behave correctly.
- **`Match` is not a plain join table.** It carries meaningful state (`status`, `respondedAt`) that drives the entire escalation and commitment-score system — a donor-request pairing has a lifecycle, not just an association.
