
import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import axios from 'axios'

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

const getWeeklyHeroes = async (req: Request, res: Response) => {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const heroes = await prisma.match.findMany({
      where: {
        status: 'ACCEPTED',
        respondedAt: { gte: oneWeekAgo }
      },
      include: {
        donor: {
          include: { user: true }
        }
      },
      orderBy: { respondedAt: 'desc' },
      take: 10
    })

    const heroList = heroes.map(match => ({
      name: match.donor.user.name || 'Anonymous',
      city: match.donor.user.city,
      bloodGroup: match.donor.bloodGroup,
      commitmentScore: match.donor.commitmentScore
    }))

    res.status(200).json({ heroes: heroList })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getShortagePrediiction = async (req: Request, res: Response) => {
  try {
    const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const bloodStats = await Promise.all(
      bloodGroups.map(async (bg) => {
        const [requestCount, donorCount] = await Promise.all([
          prisma.bloodRequest.count({
            where: {
              bloodGroup: bg as any,
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          prisma.donor.count({
            where: {
              bloodGroup: bg as any,
              isAvailable: true
            }
          })
        ])

        return { bloodGroup: bg, requestCount, donorCount }
      })
    )

    // call Flask AI engine
    const aiResponse = await axios.post('http://localhost:5001/ai/predict', {
      bloodStats
    })

    res.status(200).json({ predictions: aiResponse.data.predictions })

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export { getMapStats, getPublicStats, getWeeklyHeroes, getShortagePrediiction }

