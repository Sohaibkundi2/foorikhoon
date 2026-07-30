import prisma from './prisma'
import { BloodGroup } from '../../prisma/generated'
import { haversineDistance, getBoundingBox, RADIUS_TIERS_KM } from './distance'

export interface DonorCandidate {
  donor: any // Prisma Donor with `include: { user: true }`
  distanceKm: number
}

/**
 * Shared donor-eligibility query used by initial matching, decline-escalation,
 * and the timeout cron job. Enforces: blood-group compatibility, availability,
 * the 90-day post-donation recovery window, exclusion of already-tried donors,
 * and precise radius filtering (bounding-box pre-filter + haversine).
 *
 * Tries each radius tier in RADIUS_TIERS_KM in order, returning the first
 * tier that has at least one eligible donor.
 */
export async function findEligibleDonors(
  hospitalLat: number,
  hospitalLon: number,
  allowedGroups: BloodGroup[],
  excludeDonorIds: string[] = []
): Promise<{ matches: DonorCandidate[]; radiusUsed: number | null }> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  for (const radiusKm of RADIUS_TIERS_KM) {
    const box = getBoundingBox(hospitalLat, hospitalLon, radiusKm)

    const candidates = await prisma.donor.findMany({
      where: {
        bloodGroup: { in: allowedGroups },
        isAvailable: true,
        id: { notIn: excludeDonorIds },
        OR: [
          { lastDonated: null },
          { lastDonated: { lte: ninetyDaysAgo } }
        ],
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLon, lte: box.maxLon },
      },
      include: { user: true }
    })

    if (candidates.length === 0) continue

    const withinRadius = candidates
      .map(d => ({
        donor: d,
        distanceKm: haversineDistance(hospitalLat, hospitalLon, d.latitude!, d.longitude!)
      }))
      .filter(d => d.distanceKm <= radiusKm)

    if (withinRadius.length > 0) {
      return { matches: withinRadius, radiusUsed: radiusKm }
    }
  }

  return { matches: [], radiusUsed: null }
}