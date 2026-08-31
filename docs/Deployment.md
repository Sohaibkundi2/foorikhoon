# Deployment

The full stack is containerized and runs on a single AWS EC2 instance (Amazon Linux, t3-class), with an Elastic IP for a stable underlying address and an nginx reverse proxy handling TLS termination and routing for the domain.

| Service | Internal port | Reached via |
|---|---|---|
| Web frontend (Next.js) | 3000 | `https://forikhoon.app/` |
| Backend API (Express) | 5000 | `https://forikhoon.app/api/` |
| Scoring engine (Flask) | 5001 | internal only — not intended to be public |

The scoring engine only needs to be reachable from the backend container over the Docker Compose network; it should not be published to the internet directly.

```
deploy/
├── backend.Dockerfile      multi-stage build: TypeScript compile + Prisma generate, then a slim runtime image
├── ai-engine.Dockerfile    Python slim image running the Flask app under gunicorn (not the dev server)
└── frontend.Dockerfile     multi-stage build using Next.js `output: 'standalone'`, with NEXT_PUBLIC_API_URL baked in at build time

docker-compose.yml          wires all three services together on a shared network;
                             the backend reaches the scoring engine via the service
                             name (ai-engine:5001), not localhost

nginx (host-level)          reverse proxy in front of the compose stack; terminates TLS
                             (Let's Encrypt via certbot) and routes forikhoon.app/api/*
                             to the backend container and everything else to the frontend
```

**Update flow**, run directly on the EC2 instance:
```bash
git pull
docker compose up --build -d
```

**Note on `NEXT_PUBLIC_*` variables:** these are compiled into the frontend's JavaScript bundle at build time, not read at container startup. Any change to `NEXT_PUBLIC_API_URL` or similar requires a full rebuild of the frontend image (`docker compose build --no-cache frontend`) — restarting the container alone will not pick up the new value.

---

## Real bugs found and fixed during deployment

**Prisma queries intermittently timing out.** Every Prisma query intermittently failed with `ETIMEDOUT` once the app had been running under Docker for more than a few minutes — cron jobs would fail, then live API requests started failing too. The cause: Node 20 enables "Happy Eyeballs" (`autoSelectFamily`) by default, racing IPv4 and IPv6 connection attempts and abandoning each after ~250ms. The Docker container has no IPv6 route, so IPv6 attempts failed instantly — but the network round-trip to Neon's `us-east-1` endpoint sometimes took longer than the 250ms window, so the IPv4 attempt kept getting cut off before it could complete, and Node reported the whole race as a timeout. Forcing IPv4-first DNS resolution resolved it. Nothing in the application logic was wrong; this was a Node/Docker networking interaction specific to containerized IPv4-only environments.

**The escalation job could not reach the scoring engine.** `jobs/escalation.job.ts` hardcoded `http://localhost:5001/ai/match` while the three controllers all correctly used `AI_ENGINE_URL`. Inside the backend container `localhost` is the backend itself, which listens on 5000 — nothing answers on 5001 there — so timeout-escalation's ranking call failed every time the job ran. It went unnoticed locally, where both services share a host, and was masked in the first containerized run because the job was already dying on the Prisma timeout above before it ever reached the HTTP call. Fixed by using the same `AI_ENGINE_URL` env var as everywhere else, which `docker-compose.yml` sets to the `ai-engine:5001` service name.