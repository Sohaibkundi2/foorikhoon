import { Request, Response } from 'express'
import prisma from '../lib/prisma'


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

        res.status(200).json({ donor });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}


const updateProfile = async (req: Request, res: Response) => {

    try {

        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const { name, bloodGroup, city, phone } = req.body

        const updatedUser = await prisma.donor.update({
            where: { userId },
            data: { bloodGroup }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { name, city, phone }
        })

        res.status(200).json({ message: "profile updated successfully", updatedUser })

    } catch (error) {
        res.status(500).json({ message: "interval server error" })
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
        res.status(500).json({ message: "interval server error" })
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
        res.status(500).json({ message: "interval server error" })
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
            data: {
                status,
                respondedAt: new Date()
            }
        })

        res.status(200).json({ message: 'Match updated', match: updatedMatch })


    } catch (error) {
        res.status(500).json({ message: "interval server error" })
    }
}

// donor.controller.ts
const createDonorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { bloodGroup } = req.body

    const donor = await prisma.donor.create({
      data: {
        userId,
        bloodGroup
      }
    })

    res.status(201).json({ message: 'Donor profile created', donor })
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
    createDonorProfile
}