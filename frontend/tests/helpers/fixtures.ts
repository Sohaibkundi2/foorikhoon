/**
 * Fixture builders mirroring the interfaces the pages under test declare locally.
 *
 * Each builder returns a complete, valid object and takes overrides, so a test states only
 * the field it is actually about. Where two pages declare same-named but different shapes —
 * `Match` in donor/dashboard carries a nested `request`, `Match` in hospital/requests
 * carries `donorId` and `donorContact` — they get separate builders rather than one union,
 * so a fixture cannot accidentally satisfy the wrong page.
 */

/** ISO timestamp `n` days before now, for date arithmetic the components do at render time. */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

/** Matches `DonorProfile` in src/app/donor/dashboard/page.tsx. */
export function donorProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'donor-1',
    bloodGroup: 'O_POS',
    isAvailable: true,
    commitmentScore: 60,
    lastDonated: null as string | null,
    area: 'Hayatabad',
    latitude: 31.8313,
    longitude: 70.9017,
    user: {
      name: 'Ali Khan',
      email: 'ali@example.com',
      city: 'DI Khan',
      phone: '03001234567'
    },
    ...overrides
  }
}

/**
 * Matches what src/app/donor/profile/page.tsx reads off `/api/donor/profile`.
 *
 * Same endpoint as `donorProfile` above, but a different subset: the profile page is the
 * only consumer of `shareContactInfo`, and the dashboard's interface does not declare it.
 */
export function donorProfileForEditing(overrides: Record<string, unknown> = {}) {
  return {
    ...donorProfile(),
    shareContactInfo: false,
    ...overrides
  }
}

/** Matches `Match` in src/app/donor/dashboard/page.tsx. */
export function donorMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    status: 'PENDING',
    createdAt: daysAgo(1),
    photoUrl: null as string | null,
    photoUploadedAt: null as string | null,
    request: {
      bloodGroup: 'O_POS',
      units: 2,
      urgency: 'CRITICAL',
      hospital: {
        name: 'DHQ Hospital DI Khan',
        address: 'Hospital Road, DI Khan'
      }
    },
    ...overrides
  }
}

/** Matches `Match` in src/app/hospital/requests/page.tsx. */
export function hospitalMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    donorId: 'donor-1',
    status: 'PENDING',
    photoUrl: null as string | null,
    photoUploadedAt: null as string | null,
    donorContact: null as { name: string; phone: string | null } | null,
    ...overrides
  }
}

/** Matches `BloodRequest` in src/app/hospital/requests/page.tsx. */
export function bloodRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    bloodGroup: 'O_POS',
    units: 2,
    urgency: 'CRITICAL',
    status: 'PENDING',
    notes: null as string | null,
    createdAt: daysAgo(1),
    matches: [] as ReturnType<typeof hospitalMatch>[],
    ...overrides
  }
}

/** Matches the `User` shape the zustand auth store holds. */
export function authUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'ali@example.com',
    role: 'DONOR',
    ...overrides
  }
}
