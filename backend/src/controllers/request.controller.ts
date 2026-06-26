import { Request, Response } from "express"
import prisma from "../lib/prisma"
import axios from "axios"

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

        const matchingDonors = await prisma.donor.findMany({
            where: {
                bloodGroup: bloodGroup,
                isAvailable: true,
                user: {
                    city: hospital.user.city  // match hospital's city
                }
            },
            include: { user: true }
        })

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

        // create match for each donor
        const matches = await Promise.all(
            topDonors.map((ranked: any) =>
                prisma.match.create({
                    data: {
                        requestId: newRequest.id,
                        donorId: ranked.donorId
                    }
                })
            )
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
      }
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