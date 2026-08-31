# API Endpoints

```
AUTH
POST  /api/auth/register        → role coerced to DONOR/HOSPITAL only, ADMIN not reachable
POST  /api/auth/login

DONOR
POST  /api/donor/profile
GET   /api/donor/profile              → includes badges
PUT   /api/donor/profile
PUT   /api/donor/availability
PUT   /api/donor/push-token
GET   /api/donor/matches
PUT   /api/donor/matches/:id          → donor accepts/declines; ownership + transition validated
GET   /api/donor/certificate/:matchId → hero-certificate data for a COMPLETED match

HOSPITAL
POST  /api/hospital/profile
GET   /api/hospital/profile
PUT   /api/hospital/profile
GET   /api/hospital/inventory
PUT   /api/hospital/inventory
GET   /api/hospital/requests
GET   /api/hospital/analytics
PUT   /api/hospital/requests/:id/fulfill   → multipart/form-data, field "photo" (required);
                                              ownership + transition validated
PATCH /api/hospital/matches/:id/no-show    → ownership + transition validated
PUT   /api/hospital/push-token

REQUESTS
POST  /api/requests             → creates request + donor scoring + push notifications
GET   /api/requests             → public; explicit field select, no password/token leaks
GET   /api/requests/:id
PUT   /api/requests/:id         → ownership + transition validated

ADMIN
GET    /api/admin/stats
GET    /api/admin/hospitals
PUT    /api/admin/hospitals/:id/verify
DELETE /api/admin/hospitals/:id
GET    /api/admin/users
DELETE /api/admin/users/:id     → admin accounts excluded
GET    /api/admin/requests

MAP
GET   /api/map/stats
GET   /api/map/public-stats
GET   /api/map/weekly-heroes
GET   /api/map/leaderboard
GET   /api/map/shortage
```