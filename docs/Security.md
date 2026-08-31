# Security

An external code-level audit identified several issues, all of which were fixed and covered by the integration test suite (see [`TESTING.md`](./TESTING.md)):

- **Public registration could accept a client-supplied `role: "ADMIN"`** — fixed; registration now only ever creates `DONOR` or `HOSPITAL` accounts, regardless of what the request body contains
- **Donor match-response endpoint had no ownership check (IDOR)** — a donor could potentially respond to another donor's match by guessing its ID; fixed with an explicit ownership check
- **Hospital request/fulfil/no-show endpoints had no ownership check** — a hospital could potentially modify another hospital's request; fixed the same way
- **Public request feed leaked hospital password hashes** (`include: { user: true }` instead of an explicit field `select`) — also caught and fixed a second leak of the same shape: donor push tokens, match response tokens, and Cloudinary photo IDs on the same public endpoints
- **No server-side validation of status transitions** — a client could previously send any enum value directly; both `Match` and `BloodRequest` status changes are now validated against explicit allowed-transition maps before being applied