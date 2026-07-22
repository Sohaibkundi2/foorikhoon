import { Request, Response } from 'express'
import prisma from '../lib/prisma'

const getStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalDonors, totalHospitals, totalRequests, totalMatches, pendingVerification] =
      await Promise.all([
        prisma.user.count(),
        prisma.donor.count(),
        prisma.hospital.count(),
        prisma.bloodRequest.count(),
        prisma.match.count(),
        prisma.hospital.count({ where: { verified: false } })
      ])

    res.status(200).json({
      stats: {
        totalUsers,
        totalDonors,
        totalHospitals,
        totalRequests,
        totalMatches,
        pendingVerification
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getHospitals = async (req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      include: {
        user: true,
        requests: true,
      },
      orderBy: { verified: 'asc' }
    })
    res.status(200).json({ hospitals })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const verifyHospital = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const hospital = await prisma.hospital.findUnique({ where: { id } })

    if (!hospital) {
      res.status(404).json({ message: 'Hospital not found' })
      return
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: { verified: !hospital.verified }
    })

    res.status(200).json({ message: 'Hospital verification updated', hospital: updated })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    res.status(200).json({ users })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.bloodRequest.findMany({
      include: {
        hospital: { include: { user: true } },
        matches: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.status(200).json({ requests })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const deleteHospital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string }

    // delete related data first
    await prisma.inventory.deleteMany({ where: { hospitalId: id } })
    await prisma.match.deleteMany({
      where: { request: { hospitalId: id } }
    })
    await prisma.bloodRequest.deleteMany({ where: { hospitalId: id } })
    await prisma.hospital.delete({ where: { id } })

    res.status(200).json({ message: 'Hospital deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export { 
  getStats, 
  getHospitals, 
  verifyHospital, 
  getUsers, 
  getRequests, 
  deleteHospital
 }