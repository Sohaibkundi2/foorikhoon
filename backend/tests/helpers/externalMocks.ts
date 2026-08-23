import type { AxiosStatic } from 'axios'

/**
 * Stand-ins for the two external HTTP dependencies the request lifecycle reaches for.
 *
 * Both go through axios, so a single module mock covers them:
 *   - the Python scoring engine at localhost:5001/ai/match
 *   - Expo's push service at exp.host
 *
 * Neither may be contacted from a test: the scoring engine is a separate process that
 * would have to be running, and a real push send would be an outbound side effect.
 *
 * The /ai/match stub reimplements the engine's *ordering* contract, not its arithmetic —
 * highest commitment score first, nearer donor breaking ties. That keeps the lifecycle
 * test deterministic about which donor gets picked without coupling it to the exact point
 * weights, which live in ai-engine/app.py and are tested there.
 */

interface ScoringDonor {
  id: string
  bloodGroup: string
  distanceKm: number
  commitmentScore: number
  isAvailable: boolean
}

export interface ExternalCallLog {
  aiMatchCalls: { donors: ScoringDonor[] }[]
  pushCalls: { to: string; title: string; body: string; data?: unknown }[]
}

export function installExternalMocks(axios: jest.Mocked<AxiosStatic>): ExternalCallLog {
  const log: ExternalCallLog = { aiMatchCalls: [], pushCalls: [] }

  axios.post.mockImplementation(async (url: string, payload?: unknown) => {
    if (url.includes('/ai/match')) {
      const body = (payload ?? {}) as { donors?: ScoringDonor[] }
      const donors = body.donors ?? []
      log.aiMatchCalls.push({ donors })

      const ranked = [...donors].sort(
        (a, b) => b.commitmentScore - a.commitmentScore || a.distanceKm - b.distanceKm
      )

      return {
        data: {
          matches: ranked.map(donor => ({
            donorId: donor.id,
            score: donor.commitmentScore,
            distanceKm: donor.distanceKm
          }))
        }
      }
    }

    if (url.includes('exp.host')) {
      const body = (payload ?? {}) as ExternalCallLog['pushCalls'][number]
      log.pushCalls.push(body)
      return { data: { data: { status: 'ok' } } }
    }

    throw new Error(`Unexpected outbound HTTP call in a test: ${url}`)
  })

  return log
}

/**
 * Makes the scoring engine unreachable so `escalateAfterDecline` throws.
 *
 * Escalation is a best-effort follow-on: the endpoint that triggered it has already committed
 * the state change the client asked for, so an escalation failure must be invisible to the
 * client. This is the seam for proving that — the engine is the one dependency in the
 * escalation path that is reached over the network and can therefore realistically fail.
 *
 * Push notification is left working, so a test cannot pass merely because everything
 * outbound is broken. Call this *after* `installExternalMocks`; it replaces the
 * implementation rather than layering on it, so ordering matters.
 */
export function failAiMatch(
  axios: jest.Mocked<AxiosStatic>,
  message = 'ai engine unreachable'
): void {
  axios.post.mockImplementation(async (url: string) => {
    if (url.includes('/ai/match')) throw new Error(message)
    if (url.includes('exp.host')) return { data: { data: { status: 'ok' } } }
    throw new Error(`Unexpected outbound HTTP call in a test: ${url}`)
  })
}

/** Matches the shape `hospital.controller.fulfillRequest` expects from the Cloudinary wrapper. */
export const CLOUDINARY_MOCK_PUBLIC_ID = 'foorikhoon/donations/test-public-id'

export const cloudinaryServiceMock = () => ({
  uploadDonationPhoto: jest.fn(async () => CLOUDINARY_MOCK_PUBLIC_ID),
  getSignedPhotoUrl: jest.fn((publicId: string) => `https://res.cloudinary.test/signed/${publicId}`),
  deleteDonationPhoto: jest.fn(async () => undefined)
})
