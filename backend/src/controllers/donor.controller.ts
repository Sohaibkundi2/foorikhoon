import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { geocodeAddress } from "../lib/geocode"
import { COMPATIBLE_DONOR_GROUPS } from "../lib/compatibility"
import { haversineDistance, getBoundingBox, RADIUS_TIERS_KM } from "../lib/distance"
import axios from "axios"
import { sendPushNotification } from '../services/notification.service'

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

const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { name, bloodGroup, city, phone, area } = req.body

    let coords = null
    if (area && area.trim()) {
      coords = await geocodeAddress(area.trim())

      if (!coords) {
        return res.status(400).json({
          message: "We couldn't find that location. Please be more specific (e.g. add your city or a well-known landmark)."
        })
      }
    }

    const updatedUser = await prisma.donor.update({
      where: { userId },
      data: {
        bloodGroup,
        ...(area && area.trim() && { area: area.trim() }),
        ...(coords && {
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      }
    })

    await prisma.user.update({
      where: { id: userId },
      data: { name, city: city?.trim(), phone }
    })

    res.status(200).json({ message: "profile updated successfully", updatedUser })
  } catch (error) {
    res.status(500).json({ message: "internal server error" })
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

    res.status(200).json({ matches: matchedDonor })

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

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { status, respondedAt: new Date() }
    })

    if (status === 'DECLINED') {
      await prisma.donor.update({
        where: { id: updatedMatch.donorId },
        data: { commitmentScore: { decrement: 5 } }
      })

      // Immediately try to find a replacement donor — don't wait for a timeout
      await escalateAfterDecline(updatedMatch.requestId)
    }

    if (status === 'ACCEPTED') {
      await prisma.bloodRequest.update({
        where: { id: updatedMatch.requestId },
        data: { status: 'MATCHED' }
      })
    }

    res.status(200).json({ message: 'Match updated', match: updatedMatch })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export async function escalateAfterDecline(requestId: string) {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
    include: { hospital: true, matches: true }
  })

  if (!request || request.status !== 'PENDING') return // already matched/fulfilled/expired, nothing to do

  const alreadyTriedDonorIds = request.matches.map(m => m.donorId)
  const allowedGroups = COMPATIBLE_DONOR_GROUPS[request.bloodGroup] ?? [request.bloodGroup]

  for (const radiusKm of RADIUS_TIERS_KM) {
    const box = getBoundingBox(request.hospital.latitude!, request.hospital.longitude!, radiusKm)

    const candidates = await prisma.donor.findMany({
      where: {
        bloodGroup: { in: allowedGroups },
        isAvailable: true,
        id: { notIn: alreadyTriedDonorIds },
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLon, lte: box.maxLon },
      },
      include: { user: true }
    })

    if (candidates.length === 0) continue

    const withinRadius = candidates
      .map(d => ({
        donor: d,
        distanceKm: haversineDistance(request.hospital.latitude!, request.hospital.longitude!, d.latitude!, d.longitude!)
      }))
      .filter(d => d.distanceKm <= radiusKm)

    if (withinRadius.length === 0) continue

    const aiResponse = await axios.post('http://localhost:5001/ai/match', {
      donors: withinRadius.map(w => ({
        id: w.donor.id,
        bloodGroup: w.donor.bloodGroup,
        distanceKm: w.distanceKm,
        commitmentScore: w.donor.commitmentScore,
        isAvailable: w.donor.isAvailable
      })),
      request: { bloodGroup: request.bloodGroup, urgency: request.urgency }
    })

    const nextDonor = aiResponse.data.matches[0] // replace just the one who declined, not a whole new batch of 3
    if (!nextDonor) continue

    await prisma.match.create({
      data: { requestId: request.id, donorId: nextDonor.donorId }
    })

    const donor = await prisma.donor.findUnique({ where: { id: nextDonor.donorId } })
    if (donor?.pushToken) {
      await sendPushNotification(
        donor.pushToken,
        '🩸 Blood Needed Urgently',
        `${request.hospital.name} needs blood — please respond`,
        { requestId: request.id }
      )
    }

    return // found a replacement, done
  }
  // if we reach here, no replacement was found at any radius tier — request stays PENDING with fewer active matches
}

const createDonorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { bloodGroup, area } = req.body

    if (!area || !area.trim()) {
      return res.status(400).json({ message: 'Area is required' })
    }

    const coords = await geocodeAddress(area.trim())

    if (!coords) {
      return res.status(400).json({
        message: "We couldn't find that location. Please be more specific (e.g. add your city or a well-known landmark)."
      })
    }

    const donor = await prisma.donor.create({
      data: {
        userId,
        bloodGroup,
        area: area.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      }
    })

    res.status(201).json({ message: 'Donor profile created', donor })
  } catch (error) {
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

export {
  getProfile,
  updateProfile,
  updateAvailability,
  getMatches,
  respondToMatch,
  createDonorProfile,
  savePushToken
}