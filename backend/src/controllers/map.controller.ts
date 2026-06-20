
import { Request, Response } from 'express'
import prisma from '../lib/prisma'

const getMapStats = async (req: Request, res: Response) => {
  try {
    const cities = ['DI Khan', 'Tank', 'Peshawar', 'Islamabad']

    const cityStats = await Promise.all(
      cities.map(async (city) => {
        const [activeDonors, activeRequests] = await Promise.all([
          prisma.donor.count({
            where: { isAvailable: true, user: { city } }
          }),
          prisma.bloodRequest.count({
            where: { status: 'PENDING', hospital: { user: { city } } }
          }),
        ])
        return { city, activeDonors, activeRequests }
      })
    )

    res.status(200).json({ cities: cityStats })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getPublicStats = async (req: Request, res: Response) => {
  try {
    const [totalDonors, totalHospitals, totalMatches] = await Promise.all([
      prisma.donor.count(),
      prisma.hospital.count({ where: { verified: true } }),
      prisma.match.count({ where: { status: 'ACCEPTED' } })
    ])

    res.status(200).json({ totalDonors, totalHospitals, totalMatches })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export { getMapStats, getPublicStats }