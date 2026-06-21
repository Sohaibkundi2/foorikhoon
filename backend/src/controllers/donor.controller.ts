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

    // update match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status,
        respondedAt: new Date()
      }
    })

    // update commitment score
    if (status === 'ACCEPTED') {
      await prisma.donor.update({
        where: { id: updatedMatch.donorId },
        data: { commitmentScore: { increment: 10 } }
      })
    } else if (status === 'DECLINED') {
      await prisma.donor.update({
        where: { id: updatedMatch.donorId },
        data: { commitmentScore: { decrement: 5 } }
      })
    }

    // if accepted → mark request as MATCHED
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