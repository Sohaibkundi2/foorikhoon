import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { geocodeAddress } from "../lib/geocode"
import { COMPATIBLE_DONOR_GROUPS } from "../lib/compatibility"
import axios from "axios"
import { sendPushNotification } from '../services/notification.service'
import { findEligibleDonors } from '../lib/donorMatching'
import { getSignedPhotoUrl } from '../services/cloudinary.service'
import {
  canTransitionMatch,
  illegalTransitionMessage,
  isMatchStatus,
  requestStatesLeadingTo
} from '../lib/statusTransitions'

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const donor = await prisma.donor.findUnique({
      where: { userId },
      include: { user: true },
    })

    if (!donor) {
      res.status(404).json({ message: "Donor profile not found" })
      return
    }

    const badges = []

    if (donor) badges.push('First Step')

    const acceptedMatches = await prisma.match.count({
      where: { donorId: donor.id, status: 'ACCEPTED' }
    })

    if (acceptedMatches >= 1) badges.push('First Blood')
    if (acceptedMatches >= 5) badges.push('Lifesaver')
    if (acceptedMatches >= 10) badges.push('Hero')
    if (donor.commitmentScore >= 50) badges.push('Reliable')
    if (donor.commitmentScore >= 80) badges.push('Dedicated')

    // return badges with donor profile
    res.status(200).json({ donor, badges })


  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const updateAvailability = async (req: Request, res: Response) => {

  try {

    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { isAvailable } = req.body

    const updatedDoner = await prisma.donor.update({ where: { userId }, data: { isAvailable } })

    res.status(200).json({ message: "availability updated successfully", updatedDoner })

  } catch (error) {
    res.status(500).json({ message: "internal server error" })
  }

}
const getMatches = async (req: Request, res: Response) => {

  try {

    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const donor = await prisma.donor.findUnique({ where: { userId } })

    if (!donor) {
      res.status(404).json({ message: 'Donor profile not found' })
      return
    }

    const matchedDonor = await prisma.match.findMany({
      where: { donorId: donor.id },
      include: {
        request: {
          include: {
            hospital: true
          }
        }
      }
    })


    const matches = matchedDonor.map(({ photoPublicId, ...match }) => ({
      ...match,
      photoUrl: photoPublicId ? getSignedPhotoUrl(photoPublicId) : null
    }))

    res.status(200).json({ matches })

  } catch (error) {
    res.status(500).json({ message: "internal server error" })
  }
}

const respondToMatch = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const matchId = req.params.id as string
    const { status } = req.body

    if (!isMatchStatus(status)) {
      return res.status(400).json({ message: 'Invalid match status' })
    }

    // A donor may only ever accept or decline. COMPLETED and NO_SHOW are hospital-confirmed
    // outcomes — letting a donor set them would mint a hero certificate and a +10
    // commitment score with no hospital ever confirming the donation took place.
    if (status !== 'ACCEPTED' && status !== 'DECLINED') {
      return res.status(403).json({ message: 'A donor can only accept or decline a match' })
    }

    const donorProfile = await prisma.donor.findUnique({ where: { userId } })
    if (!donorProfile) {
      return res.status(404).json({ message: 'Donor profile not found' })
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) {
      return res.status(404).json({ message: 'Match not found' })
    }

    // Ownership check. Without it, any donor could accept or decline a match belonging
    // to a different donor, moving someone else's request and score.
    if (match.donorId !== donorProfile.id) {
      return res.status(403).json({ message: 'This match does not belong to you' })
    }

    // Validated against the shared transition map so this endpoint can't drift from the
    // hospital-side ones. With status already narrowed to ACCEPTED/DECLINED above, this
    // fails exactly when the match has already been answered — re-responding would
    // penalise the donor twice and trigger a second escalation for the same request.
    if (!canTransitionMatch(match.status, status)) {
      return res.status(400).json({
        message: illegalTransitionMessage('match', match.status, status)
      })
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { status, respondedAt: new Date() }
    })

    if (status === 'DECLINED') {
        // Single computed write, clamped at 0 — same pattern as the fulfil and no-show
        // paths, rather than decrementing and then correcting an out-of-range value.
        await prisma.donor.update({
            where: { id: updatedMatch.donorId },
            data: { commitmentScore: Math.max(0, donorProfile.commitmentScore - 5) }
        })

        await escalateAfterDeclineBestEffort(updatedMatch.requestId)
    }

    if (status === 'ACCEPTED') {
        // Guard the transition in the WHERE clause rather than with a read-then-write.
        // A request can hold several PENDING matches at once (units > 1, or escalation
        // fan-out), so two donors can accept within the same tick. Filtering on the
        // legal predecessor states makes this atomic: the first acceptance moves the
        // request to MATCHED, the second matches zero rows. A no-op is the correct
        // outcome — the second acceptance is legitimate, the request has simply already
        // moved, so this must not be treated as an illegal transition and rejected.
        await prisma.bloodRequest.updateMany({
            where: {
                id: updatedMatch.requestId,
                status: { in: requestStatesLeadingTo('MATCHED') }
            },
            data: { status: 'MATCHED' }
        })

        const request = await prisma.bloodRequest.findUniqueOrThrow({
            where: { id: updatedMatch.requestId },
            include: { hospital: true }
        })

        const donorWithUser = await prisma.donor.findUnique({
            where: { id: updatedMatch.donorId },
            include: { user: true }
        })

        if (request.hospital.pushToken) {
            const contactHint = donorWithUser?.shareContactInfo
                ? `${donorWithUser.user.name} · ${donorWithUser.user.phone ?? 'no phone on file'}`
                : 'Contact info not shared — check in-app for updates'

            await sendPushNotification(
                request.hospital.pushToken,
                '✅ Donor Accepted',
                `A donor accepted your ${bloodGroupLabels[request.bloodGroup] ?? request.bloodGroup} request. ${contactHint}`,
                { requestId: request.id }
            )
        }
    }

    res.status(200).json({ message: 'Match updated', match: updatedMatch })
  } catch (error) {
    console.error('Respond to match error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export async function escalateAfterDecline(requestId: string) {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
    include: { hospital: true, matches: true }
  })

  if (!request) return
  if (request.status === 'FULFILLED' || request.status === 'EXPIRED') return // already resolved, nothing to do

  // Return the request to the pool. Guarded by the transition map and applied atomically
  // in the WHERE clause, so this can only ever fire from a state MATCHED→PENDING is legal
  // from, and never fights a concurrent write.
  await prisma.bloodRequest.updateMany({
    where: {
      id: request.id,
      status: { in: requestStatesLeadingTo('PENDING') }
    },
    data: { status: 'PENDING' }
  })

  const alreadyTriedDonorIds = request.matches.map(m => m.donorId)
  const allowedGroups = COMPATIBLE_DONOR_GROUPS[request.bloodGroup] ?? [request.bloodGroup]

  const { matches, radiusUsed } = await findEligibleDonors(
    request.hospital.latitude!,
    request.hospital.longitude!,
    allowedGroups,
    alreadyTriedDonorIds
  )

  if (matches.length === 0) return // no replacement found at any radius tier

  const aiResponse = await axios.post('http://localhost:5001/ai/match', {
    donors: matches.map(w => ({
      id: w.donor.id,
      bloodGroup: w.donor.bloodGroup,
      distanceKm: w.distanceKm,
      commitmentScore: w.donor.commitmentScore,
      isAvailable: w.donor.isAvailable
    })),
    request: { bloodGroup: request.bloodGroup, urgency: request.urgency }
  })

  const nextDonor = aiResponse.data.matches[0]
  if (!nextDonor) return

  await prisma.match.create({
    data: { requestId: request.id, donorId: nextDonor.donorId }
  })

  // NOTE: there was a second `update` to PENDING here. It has been removed rather than
  // guarded, because it was both redundant and unsafe. Redundant: the request is already
  // PENDING on every path that reaches this line — it was either PENDING on entry or set
  // above. Unsafe: the AI scoring call between the two points is an awaited HTTP request,
  // and another donor accepting during that window moves the request to MATCHED. The old
  // unconditional write would then reset it to PENDING and silently discard a real
  // acceptance. Please don't reinstate it.

  const donor = await prisma.donor.findUnique({ where: { id: nextDonor.donorId } })
  if (donor?.pushToken) {
    await sendPushNotification(
      donor.pushToken,
      '🩸 Blood Needed Urgently',
      `${request.hospital.name} needs blood — please respond`,
      { requestId: request.id }
    )
  }
}

export async function escalateAfterDeclineBestEffort(requestId: string): Promise<void> {
  try {
    await escalateAfterDecline(requestId)
  } catch (error) {
    console.error(
      `Escalation failed for request ${requestId}. The triggering action was committed and ` +
      'has been reported as successful; no replacement donor was notified.',
      error
    )
  }
}

// small privacy fuzz for donor GPS coordinates -- rounds to ~1.1km precision
// instead of storing the donor's exact doorstep location, mirroring the
// same privacy intent as the old "area, not exact address" approach
function fuzzCoordinates(lat: number, lon: number) {
    const FUZZ_PRECISION = 2 // decimal places -- ~1.1km at this latitude range
    return {
        latitude: parseFloat(lat.toFixed(FUZZ_PRECISION)),
        longitude: parseFloat(lon.toFixed(FUZZ_PRECISION)),
    }
}

const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { name, bloodGroup, city, phone, area, shareContactInfo, latitude, longitude, lastDonated } = req.body

    // Clients send lastDonated on every save, so an explicit null means "no date
    // on record" and has to be persisted; only an absent field leaves it alone.
    // This gates matching -- donorMatching.ts offers a donor only when
    // lastDonated is null or at least 90 days old -- so a wrong value here can
    // get someone called in too soon, which is why the future date is rejected
    // rather than clamped.
    let donationDate: Date | null | undefined = undefined

    if ('lastDonated' in req.body) {
      if (lastDonated === null || lastDonated === '') {
        donationDate = null
      } else {
        const parsed = new Date(lastDonated)
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ message: 'Last donation date is not a valid date.' })
        }
        if (parsed.getTime() > Date.now()) {
          return res.status(400).json({ message: 'Last donation date cannot be in the future.' })
        }
        donationDate = parsed
      }
    }

    let locationUpdate: { area: string; latitude: number; longitude: number } | null = null

    if (typeof latitude === 'number' && typeof longitude === 'number') {
        // GPS path
        const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLon: 60.5, maxLon: 77.5 }
        if (
            latitude < PAKISTAN_BOUNDS.minLat || latitude > PAKISTAN_BOUNDS.maxLat ||
            longitude < PAKISTAN_BOUNDS.minLon || longitude > PAKISTAN_BOUNDS.maxLon
        ) {
            return res.status(400).json({ message: 'Location coordinates are outside the supported region.' })
        }

        const fuzzed = fuzzCoordinates(latitude, longitude)
        locationUpdate = {
            area: area && area.trim() ? area.trim() : 'We\'ll use this to match you with nearby requests',
            latitude: fuzzed.latitude,
            longitude: fuzzed.longitude,
        }
    } else if (area && area.trim()) {
        // manual address path -- existing geocoding flow, unchanged
        const coords = await geocodeAddress(area.trim())

        if (!coords) {
            return res.status(400).json({
                message: "We couldn't find that location. Please be more specific (e.g. add your city or a well-known landmark)."
            })
        }

        locationUpdate = { area: area.trim(), latitude: coords.latitude, longitude: coords.longitude }
    }

    const updatedUser = await prisma.donor.update({
      where: { userId },
      data: {
        bloodGroup,
        ...(locationUpdate && locationUpdate),
        ...(typeof shareContactInfo === 'boolean' && { shareContactInfo }),
        ...(donationDate !== undefined && { lastDonated: donationDate })
      }
    })

    await prisma.user.update({
      where: { id: userId },
      data: { name, city: city?.trim(), phone }
    })

    res.status(200).json({ message: "profile updated successfully", updatedUser })
  } catch (error) {
    console.error('Update donor profile error:', error)
    res.status(500).json({ message: "internal server error" })
}
}

const createDonorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { bloodGroup, area, latitude, longitude } = req.body

    let finalCoords: { latitude: number; longitude: number }
    let finalArea: string

    if (typeof latitude === 'number' && typeof longitude === 'number') {
        // GPS path -- fuzz before storing, area label is just descriptive
        const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLon: 60.5, maxLon: 77.5 }
        if (
            latitude < PAKISTAN_BOUNDS.minLat || latitude > PAKISTAN_BOUNDS.maxLat ||
            longitude < PAKISTAN_BOUNDS.minLon || longitude > PAKISTAN_BOUNDS.maxLon
        ) {
            return res.status(400).json({ message: 'Location coordinates are outside the supported region.' })
        }

        finalCoords = fuzzCoordinates(latitude, longitude)
        finalArea = area && area.trim() ? area.trim() : 'Shared location'
    } else {
        // manual address path -- existing geocoding flow, unchanged
        if (!area || !area.trim()) {
            return res.status(400).json({ message: 'Area is required' })
        }

        const coords = await geocodeAddress(area.trim())

        if (!coords) {
            return res.status(400).json({
                message: "We couldn't find that location. Please be more specific (e.g. add your city or a well-known landmark)."
            })
        }

        finalCoords = coords
        finalArea = area.trim()
    }

    const donor = await prisma.donor.create({
        data: {
            userId,
            bloodGroup,
            area: finalArea,
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude,
        }
    })

    res.status(201).json({ message: 'Donor profile created', donor })
  } catch (error) {
    console.error('Create donor profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
}
}

const savePushToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

    const { pushToken } = req.body

    const donor = await prisma.donor.update({
      where: { userId },
      data: { pushToken }
    })

    res.status(200).json({ message: 'Push token saved', donor })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getCertificate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

    const matchId = req.params.matchId as string

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        donor: { include: { user: true } },
        request: { include: { hospital: true } }
      }
    })

    if (!match || match.status !== 'COMPLETED') {
      return res.status(404).json({ message: 'No completed donation found for this match' })
    }

    if (match.donor.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const completedCount = await prisma.match.count({
      where: { donorId: match.donorId, status: 'COMPLETED' }
    })

    const badgeThresholds: { name: string; count: number }[] = [
      { name: 'First Blood', count: 1 },
      { name: 'Lifesaver', count: 5 },
      { name: 'Hero', count: 10 }
    ]
    const badgeEarnedHere = badgeThresholds.find(b => b.count === completedCount)?.name ?? null

    res.status(200).json({
      certificate: {
        donorName: match.donor.user.name,
        bloodGroup: match.donor.bloodGroup,
        city: match.donor.user.city,
        hospitalName: match.request.hospital.name,
        donationDate: match.respondedAt ?? match.createdAt,
        badge: badgeEarnedHere,
        totalDonations: completedCount,
        commitmentScore: match.donor.commitmentScore,
        // Ownership was verified above (match.donor.userId === userId), so signing here
        // is safe. Null for donations recorded before photo verification shipped.
        photoUrl: match.photoPublicId ? getSignedPhotoUrl(match.photoPublicId) : null,
        photoUploadedAt: match.photoUploadedAt
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export {
  getProfile,
  updateProfile,
  updateAvailability,
  getMatches,
  respondToMatch,
  createDonorProfile,
  savePushToken,
  getCertificate
}