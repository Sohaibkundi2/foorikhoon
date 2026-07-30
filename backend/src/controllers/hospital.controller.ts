import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { geocodeAddress } from "../lib/geocode"
import { escalateAfterDecline } from './donor.controller'

const getProfile = async (req: Request, res: Response) => {

    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospitalProfile = await prisma.hospital.findUnique({
            where: { userId },
            include: { user: true }
        })

        if (!hospitalProfile) {
            res.status(400).json({ message: "hospital profile not found" })
            return
        }

        res.status(200).json({ message: "hospital profile fetched with user details", hospitalProfile })
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

        const { name, address, phone, city } = req.body

        let coords = null
        if (address && address.trim()) {
            coords = await geocodeAddress(address.trim())

            if (!coords) {
                return res.status(400).json({
                    message: "We couldn't find that address. Please be more specific (e.g. add a well-known landmark or the city name)."
                })
            }
        }

        const updatedHospital = await prisma.hospital.update({
            where: { userId },
            data: {
                name,
                ...(address && address.trim() && { address: address.trim() }),
                ...(coords && {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                })
            }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { phone, ...(city && { city: city.trim() }) }
        })

        res.status(200).json({ message: "hospital updated successfully", updatedHospital })

    } catch (error) {
        console.error('Hospital profile error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}
const getInventory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const inventory = await prisma.inventory.findMany({
            where: { hospitalId: hospital.id }
        })


        res.status(200).json({ message: "Inventory fetched successfully", inventory })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const updateInventory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const { bloodGroup, units } = req.body

        const updatedInventory = await prisma.inventory.upsert({
            where: {
                hospitalId_bloodGroup: { hospitalId: hospital.id, bloodGroup }
            },
            update: { units },
            create: { hospitalId: hospital.id, bloodGroup, units }
        })
        // console.log(bloodGroup, units)
        res.status(200).json({ message: "Inventory updated successfully", updatedInventory })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const getRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const requests = await prisma.bloodRequest.findMany({
            where: { hospitalId: hospital.id },
            include: { matches: true },
            orderBy: { createdAt: 'asc' }
        })

        res.status(200).json({ message: "Requests fetched successfully", requests })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

const createHospitalProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const { name, address, licenseNo } = req.body

        if (!address || !address.trim()) {
            return res.status(400).json({ message: 'Address is required' })
        }

        const coords = await geocodeAddress(address.trim())

        if (!coords) {
            return res.status(400).json({
                message: "We couldn't find that address. Please be more specific (e.g. add a well-known landmark or the city name)."
            })
        }

        const hospital = await prisma.hospital.create({
            data: {
                userId,
                name,
                address: address.trim(),
                licenseNo,
                latitude: coords.latitude,
                longitude: coords.longitude,
            }
        })

        res.status(201).json({ message: 'Hospital profile created', hospital })
    } catch (error) {
        console.error('Hospital profile error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const getAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

        const hospital = await prisma.hospital.findUnique({ where: { userId } })
        if (!hospital) return res.status(404).json({ message: 'Hospital not found' })

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const [allRequests, monthRequests, inventory] = await Promise.all([
            prisma.bloodRequest.findMany({
                where: { hospitalId: hospital.id }
            }),
            prisma.bloodRequest.findMany({
                where: {
                    hospitalId: hospital.id,
                    createdAt: { gte: startOfMonth }
                }
            }),
            prisma.inventory.findMany({
                where: { hospitalId: hospital.id }
            })
        ])

        // most requested blood group
        const bloodGroupCount: Record<string, number> = {}
        allRequests.forEach(r => {
            bloodGroupCount[r.bloodGroup] = (bloodGroupCount[r.bloodGroup] || 0) + 1
        })
        const mostRequested = Object.entries(bloodGroupCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null

        // fulfillment rate
        const fulfilled = allRequests.filter(r => r.status === 'FULFILLED').length
        const fulfillmentRate = allRequests.length > 0
            ? Math.round((fulfilled / allRequests.length) * 100)
            : 0

        // low stock — units < 5
        const lowStock = inventory.filter(i => i.units < 5)

        res.status(200).json({
            analytics: {
                mostRequested,
                totalRequestsThisMonth: monthRequests.length,
                fulfillmentRate,
                totalRequests: allRequests.length,
                fulfilled,
                lowStock,
                inventory
            }
        })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

const fulfillRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

        const id = req.params.id as string

        const request = await prisma.bloodRequest.update({
            where: { id },
            data: { status: 'FULFILLED' },
            include: { matches: true }
        })

        // reward the donor who actually donated
        const acceptedMatch = request.matches.find(m => m.status === 'ACCEPTED')
        if (acceptedMatch) {
            const donor = await prisma.donor.update({
                where: { id: acceptedMatch.donorId },
                data: {
                    commitmentScore: { increment: 10 },
                    lastDonated: new Date()
                }
            })

            if (donor.commitmentScore > 100) {
                await prisma.donor.update({
                    where: { id: donor.id },
                    data: { commitmentScore: 100 }
                })
            }

            await prisma.match.update({
                where: { id: acceptedMatch.id },
                data: { status: 'COMPLETED' }
            })
        }

        res.status(200).json({ message: 'Request fulfilled', request })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

const reportNoShow = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

        const matchId = req.params.id as string

        const match = await prisma.match.findUnique({ where: { id: matchId } })
        if (!match) return res.status(404).json({ message: 'Match not found' })
        if (match.status !== 'ACCEPTED') {
            return res.status(400).json({ message: 'Only an accepted match can be reported as a no-show' })
        }

        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: { status: 'NO_SHOW' }
        })

        const donor = await prisma.donor.update({
            where: { id: match.donorId },
            data: { commitmentScore: { decrement: 10 } }
        })

        if (donor.commitmentScore < 0) {
            await prisma.donor.update({
                where: { id: donor.id },
                data: { commitmentScore: 0 }
            })
        }
        // the request wasn't actually fulfilled — find a replacement,
        // same as a decline, since the accepted donor never showed up
        await escalateAfterDecline(match.requestId)

        res.status(200).json({ message: 'No-show recorded', match: updatedMatch })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

export { getProfile, updateProfile, getInventory, updateInventory, getRequests, createHospitalProfile, getAnalytics, fulfillRequest, reportNoShow }
