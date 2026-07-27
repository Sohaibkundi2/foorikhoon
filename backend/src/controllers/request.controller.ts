import { Request, Response } from "express"
import prisma from "../lib/prisma"
import axios from "axios"
import { BloodGroup } from "../../prisma/generated"
import { sendPushNotification } from '../services/notification.service'
import { haversineDistance, getBoundingBox, RADIUS_TIERS_KM } from "../lib/distance"

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const COMPATIBLE_DONOR_GROUPS: Record<string, BloodGroup[]> = {
  A_POS:  [BloodGroup.A_POS, BloodGroup.A_NEG],
  A_NEG:  [BloodGroup.A_NEG],
  B_POS:  [BloodGroup.B_POS, BloodGroup.B_NEG],
  B_NEG:  [BloodGroup.B_NEG],
  AB_POS: [BloodGroup.A_POS, BloodGroup.A_NEG, BloodGroup.B_POS, BloodGroup.B_NEG, BloodGroup.AB_POS, BloodGroup.AB_NEG],
  AB_NEG: [BloodGroup.A_NEG, BloodGroup.B_NEG, BloodGroup.AB_NEG],
  O_POS:  [BloodGroup.O_POS],
  O_NEG:  [BloodGroup.O_NEG],
}

async function findDonorsWithinRadius(hospitalLat: number, hospitalLon: number, allowedGroups: BloodGroup[]) {
  for (const radiusKm of RADIUS_TIERS_KM) {
    const box = getBoundingBox(hospitalLat, hospitalLon, radiusKm)

    const candidates = await prisma.donor.findMany({
      where: {
        bloodGroup: { in: allowedGroups },
        isAvailable: true,
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
  return { matches: [], radiusUsed: null as number | null }
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

    const { matches: found, radiusUsed } = await findDonorsWithinRadius(
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
        hospital: { include: { user: true } },
        matches: true
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
      include: { hospital: true, matches: true }
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