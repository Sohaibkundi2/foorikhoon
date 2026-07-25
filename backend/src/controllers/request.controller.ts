import { Request, Response } from "express"
import prisma from "../lib/prisma"
import axios from "axios"
import { Donor, User, BloodGroup } from "../../prisma/generated"
import { sendPushNotification } from '../services/notification.service'

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const COMPATIBLE_DONOR_GROUPS: Record<string, BloodGroup[]> = {
  A_POS:  [BloodGroup.A_POS, BloodGroup.A_NEG, BloodGroup.O_POS, BloodGroup.O_NEG],
  A_NEG:  [BloodGroup.A_NEG, BloodGroup.O_NEG],
  B_POS:  [BloodGroup.B_POS, BloodGroup.B_NEG, BloodGroup.O_POS, BloodGroup.O_NEG],
  B_NEG:  [BloodGroup.B_NEG, BloodGroup.O_NEG],
  AB_POS: [BloodGroup.A_POS, BloodGroup.A_NEG, BloodGroup.B_POS, BloodGroup.B_NEG, BloodGroup.AB_POS, BloodGroup.AB_NEG, BloodGroup.O_POS, BloodGroup.O_NEG],
  AB_NEG: [BloodGroup.A_NEG, BloodGroup.B_NEG, BloodGroup.AB_NEG, BloodGroup.O_NEG],
  O_POS:  [BloodGroup.O_POS, BloodGroup.O_NEG],
  O_NEG:  [BloodGroup.O_NEG],
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
            res.status(404).json({
                message: "hospital not found"
            })
            return
        }

        const newRequest = await prisma.bloodRequest.create({
            data: {
                hospitalId: hospital.id,
                bloodGroup,
                units,
                urgency,
                notes,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        })

        const RARE_GROUPS = ['O_NEG', 'AB_NEG']

        const isRareRequest = RARE_GROUPS.includes(bloodGroup)

        // Stage 1: exact blood-group match only for rare requests,
        // full compatible list for common ones

        let matchingDonors = await prisma.donor.findMany({
            where: {
                bloodGroup: isRareRequest
                    ? bloodGroup
                    : { in: COMPATIBLE_DONOR_GROUPS[bloodGroup] ?? [bloodGroup] },
                isAvailable: true,
                user: { city: hospital.user.city }
            },
            include: { user: true }
        })

        // Stage 2: only for rare requests with zero exact-match donors,
        // widen to other compatible donors
        if (isRareRequest && matchingDonors.length === 0) {
            matchingDonors = await prisma.donor.findMany({
                where: {
                    bloodGroup: { in: COMPATIBLE_DONOR_GROUPS[bloodGroup] ?? [bloodGroup] },
                    isAvailable: true,
                    user: { city: hospital.user.city }
                },
                include: { user: true }
            })
        }

        const aiResponse = await axios.post('http://localhost:5001/ai/match', {
            donors: matchingDonors.map(d => ({
                id: d.id,
                bloodGroup: d.bloodGroup,
                city: d.user.city,
                commitmentScore: d.commitmentScore,
                isAvailable: d.isAvailable
            })),
            request: {
                bloodGroup,
                city: hospital.user.city,
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
        `${hospital.name} needs ${bloodGroupLabels[bloodGroup]} blood in ${hospital.user.city}`,
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
            aiRanking: rankedDonors
        })
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const getRequests = async (req: Request, res: Response) => {
  try {
    const pendingRequests = await prisma.bloodRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        hospital: {
          include: {
            user: true  
          }
        },
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


    }
    catch (error) {
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

    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

export {
    createRequest,
    getRequests,
    getRequestById,
    updateRequestStatus
}