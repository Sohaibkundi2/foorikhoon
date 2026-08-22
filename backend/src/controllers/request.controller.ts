import { Request, Response } from "express"
import prisma from "../lib/prisma"
import axios from "axios"
import { BloodGroup } from "../../prisma/generated"
import { sendPushNotification } from '../services/notification.service'
import { haversineDistance, getBoundingBox, RADIUS_TIERS_KM } from "../lib/distance"
import { COMPATIBLE_DONOR_GROUPS } from "../lib/compatibility"
import { findEligibleDonors } from '../lib/donorMatching'
import {
  canTransitionRequest,
  illegalTransitionMessage,
  isRequestStatus
} from '../lib/statusTransitions'

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const createRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { bloodGroup, units, urgency, notes } = req.body

    const hospital = await prisma.hospital.findUnique({
      where: { userId },
      include: { user: true }
    })

    if (!hospital) {
      res.status(404).json({ message: "hospital not found" })
      return
    }

    if (hospital.latitude == null || hospital.longitude == null) {
      return res.status(400).json({
        message: 'Hospital location is not set — please update your address in profile before posting a request'
      })
    }

    const newRequest = await prisma.bloodRequest.create({
      data: {
        hospitalId: hospital.id,
        bloodGroup,
        units,
        urgency,
        notes,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    const { matches: found, radiusUsed } = await findEligibleDonors(
      hospital.latitude,
      hospital.longitude,
      COMPATIBLE_DONOR_GROUPS[bloodGroup] ?? [bloodGroup]
    )

    const matchingDonors = found.map(f => f.donor)
    const distanceByDonorId = Object.fromEntries(found.map(f => [f.donor.id, f.distanceKm]))

    const aiResponse = await axios.post('http://localhost:5001/ai/match', {
      donors: matchingDonors.map(d => ({
        id: d.id,
        bloodGroup: d.bloodGroup,
        distanceKm: distanceByDonorId[d.id],
        commitmentScore: d.commitmentScore,
        isAvailable: d.isAvailable
      })),
      request: {
        bloodGroup,
        urgency
      }
    })

    const rankedDonors = aiResponse.data.matches
    const topDonors = rankedDonors.slice(0, 3)

    const matches = await Promise.all(
      topDonors.map(async (ranked: any) => {
        const match = await prisma.match.create({
          data: {
            requestId: newRequest.id,
            donorId: ranked.donorId
          }
        })

        const donor = await prisma.donor.findUnique({
          where: { id: ranked.donorId }
        })

        if (donor?.pushToken) {
          await sendPushNotification(
            donor.pushToken,
            '🩸 Blood Needed Urgently',
            `${hospital.name} needs ${bloodGroupLabels[bloodGroup]} blood nearby`,
            { requestId: newRequest.id }
          )
        }

        return match
      })
    )

    res.status(201).json({
      message: 'Request created and donors matched',
      request: newRequest,
      matchedDonors: matches.length,
      radiusUsedKm: radiusUsed,
      aiRanking: rankedDonors
    })
  }
  catch (error) {
    console.error('Create request error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getRequests = async (req: Request, res: Response) => {
  try {
    const pendingRequests = await prisma.bloodRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        // `include: { user: true }` here returned the hospital's entire User row —
        // including the bcrypt `password` hash, plus email and phone — on an endpoint
        // that is mounted WITHOUT `authenticate`, so anyone on the internet could read
        // every hospital's password hash straight out of the public request feed.
        // Prisma has no way to exclude one field from an `include`, so the fix is an
        // explicit `select`: additive by default, meaning a field added to User later
        // cannot silently start leaking here.
        // `city` is the only User field the request feeds actually render (the displayed
        // hospital name comes from Hospital.name, not User.name).
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            verified: true,
            latitude: true,
            longitude: true,
            user: { select: { city: true } }
          }
        },
        // Both clients declare this as `{ id: string }[]` and only ever read `.length`
        // ("N donors notified"), but `matches: true` was returning every scalar on the
        // row to anonymous callers: `donorId`, which lets anyone enumerate which donors
        // were approached for which blood group; `responseToken`, a unique token that
        // would be an outright auth bypass the moment anything starts honouring it; and
        // `photoPublicId`. Narrowed to the one field actually rendered.
        matches: { select: { id: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    res.status(200).json({ requests: pendingRequests })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getRequestById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const request = await prisma.bloodRequest.findUnique({
      where: { id },
      // Same treatment as getRequests above — this route is also mounted without
      // `authenticate`. `hospital: true` was returning every Hospital scalar to anonymous
      // callers, including `pushToken` (an Expo push token: anyone holding it can fire
      // notifications at that hospital's device) and `licenseNo`. `matches: true` was
      // returning `donorId`, `responseToken` and `photoPublicId`; both detail pages only
      // render `matches.length`.
      // NOTE: `user: { select: { city: true } }` is new data, not just a narrowing. Both
      // detail pages already render `request.hospital?.user?.city`, but `hospital: true`
      // never included the user relation, so that line has always displayed blank. Drop
      // this one line if you'd rather keep the fix purely subtractive.
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            verified: true,
            latitude: true,
            longitude: true,
            user: { select: { city: true } }
          }
        },
        matches: { select: { id: true } }
      }
    })
    if (!request) {
      res.status(404).json({ message: 'Request not found' })
      return
    }
    res.status(200).json({ request })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }
    const { newStatus } = req.body
    const id = req.params.id as string

    // Reject anything that isn't a real RequestStatus before touching the database, so a
    // typo or a probe can't reach Prisma and surface as an opaque 500.
    if (!isRequestStatus(newStatus)) {
      return res.status(400).json({ message: 'Invalid request status' })
    }

    // FULFILLED is deliberately not reachable here. Marking a request fulfilled also has
    // to attach the hospital's proof photo, move the match to COMPLETED and credit the
    // donor's commitment score — all of which live in the dedicated fulfil endpoint. If
    // this generic setter could write FULFILLED, a hospital could close out a request with
    // no photo and no donor credited, which is exactly the unverified claim the photo
    // requirement exists to prevent.
    if (newStatus === 'FULFILLED') {
      return res.status(400).json({
        message: 'Use PUT /api/hospital/requests/:id/fulfill to fulfil a request — it requires a photo of the blood bag.'
      })
    }

    // `authorize('HOSPITAL')` only proves the caller is *a* hospital, not that they own
    // this request. Without the check below, any logged-in hospital could expire or
    // re-open another hospital's request just by knowing its id.
    const hospital = await prisma.hospital.findUnique({ where: { userId } })
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' })
    }

    const existing = await prisma.bloodRequest.findUnique({
      where: { id },
      select: { hospitalId: true, status: true }
    })
    if (!existing) {
      return res.status(404).json({ message: 'Request not found' })
    }
    if (existing.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'This request belongs to another hospital' })
    }

    if (!canTransitionRequest(existing.status, newStatus)) {
      return res.status(400).json({
        message: illegalTransitionMessage('request', existing.status, newStatus)
      })
    }

    const updateStatus = await prisma.bloodRequest.update({
      where: { id },
      data: { status: newStatus }
    })
    res.status(200).json({ message: 'Request status updated', request: updateStatus })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus
}