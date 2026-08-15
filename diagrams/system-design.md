# System Architecture

High-level view of ForiKhoon's client, backend, AI, and external service layers.

![System Design](./system-design.png)

```mermaid
flowchart TB
    subgraph clients["Clients"]
        donor["Donor"]
        hospital["Hospital Staff"]
        admin["Administrator"]
        public["Public User"]
    end
    subgraph client_layer["Client Layer"]
        web["Next.js Web App\nPort 3000"]
        mobile["React Native Mobile App\nExpo SDK 54"]
    end
    subgraph backend_layer["Backend Layer (single Node process)"]
        backend["Node.js + Express\nPort 5000"]
        jobs["Background Jobs\nnode-cron (in-process)"]
    end
    subgraph ai_layer["AI Layer"]
        ai["Python Flask AI Engine\nPort 5001"]
    end
    db[("PostgreSQL\nNeon DB")]
    nominatim["Nominatim\nOpenStreetMap Geocoding"]
    push["Expo Push Service\nFCM"]
    device_gps["Device GPS / Location Services"]

    donor --> web
    donor --> mobile
    hospital --> web
    hospital --> mobile
    admin --> web
    admin --> mobile
    public --> web
    public --> mobile

    device_gps -->|"Coordinates"| web
    device_gps -->|"Coordinates"| mobile

    web -->|"HTTPS / REST API\n(incl. push token registration)"| backend
    mobile -->|"HTTPS / REST API\n(incl. push token registration)"| backend

    backend -->|"Prisma ORM v7"| db
    backend -->|"POST /ai/match\nPOST /ai/predict"| ai
    ai -->|"Ranked donors\nRisk levels"| backend

    backend -->|"Geocode address\n(fallback only, if GPS denied)"| nominatim
    nominatim -->|"lat/lng"| backend

    backend -->|"Send notification"| push
    push -->|"FCM (mobile only)"| mobile

    jobs -.->|"same process,\nquery via Prisma"| db
```

## Notes

- **AI Layer is a separate process**, not a library call — the backend talks to it over HTTP (`localhost:5001`), which adds a network hop and a second point of failure in exchange for language/tooling separation (Python for scoring, room to move to a trained model later).
- **`jobs` runs in-process** with the backend (node-cron inside the same Express server), not as a separately deployed service — the dashed line reflects that it's the same process, just shown separately to highlight it as a distinct responsibility (expiry checks, escalation timeouts).
- **Nominatim is now a fallback path only.** Since GPS-based location capture became the primary registration method, geocoding only runs when a user denies location permission or explicitly chooses manual address entry.
- **Push notifications are mobile-only.** The web app has no browser-push implementation, so hospital/donor users on web rely on polling (dashboard refresh) rather than real-time push.
