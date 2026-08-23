import { Request, Response } from "express"
import prisma from "../lib/prisma"
import { geocodeAddress } from "../lib/geocode"
import { escalateAfterDeclineBestEffort } from './donor.controller'
import { sendPushNotification } from "../services/notification.service"
import {
    uploadDonationPhoto,
    getSignedPhotoUrl,
    deleteDonationPhoto
} from "../services/cloudinary.service"
import type { RequestWithPhoto } from "../middleware/upload.middleware"
import { canTransitionMatch, illegalTransitionMessage } from '../lib/statusTransitions'

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

        const { name, address, phone, city, latitude, longitude } = req.body

        let locationUpdate: { address: string; latitude: number; longitude: number } | null = null

        if (typeof latitude === 'number' && typeof longitude === 'number') {
            const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLon: 60.5, maxLon: 77.5 }
            if (
                latitude < PAKISTAN_BOUNDS.minLat || latitude > PAKISTAN_BOUNDS.maxLat ||
                longitude < PAKISTAN_BOUNDS.minLon || longitude > PAKISTAN_BOUNDS.maxLon
            ) {
                return res.status(400).json({ message: 'Location coordinates are outside the supported region.' })
            }

            locationUpdate = {
                address: address && address.trim() ? address.trim() : 'Shared location',
                latitude,
                longitude,
            }
        } else if (address && address.trim()) {
            const coords = await geocodeAddress(address.trim())

            if (!coords) {
                return res.status(400).json({
                    message: "We couldn't find that address. Please be more specific (e.g. add a well-known landmark or the city name)."
                })
            }

            locationUpdate = { address: address.trim(), latitude: coords.latitude, longitude: coords.longitude }
        }

        const updatedHospital = await prisma.hospital.update({
            where: { userId },
            data: {
                name,
                ...(locationUpdate && locationUpdate)
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
            include: {
                matches: {
                    include: {
                        donor: {
                            include: { user: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // strip donor contact info unless the match is ACCEPTED and the
        // donor has explicitly opted in to sharing it
        const sanitized = requests.map(request => ({
            ...request,
            matches: request.matches.map(match => {
                const canShowContact =
                    match.status === 'ACCEPTED' && match.donor.shareContactInfo

                return {
                    id: match.id,
                    status: match.status,
                    donorId: match.donorId,
                    createdAt: match.createdAt,
                    respondedAt: match.respondedAt,
                    photoUrl: match.photoPublicId ? getSignedPhotoUrl(match.photoPublicId) : null,
                    photoUploadedAt: match.photoUploadedAt,
                    donorContact: canShowContact
                        ? { name: match.donor.user.name, phone: match.donor.user.phone }
                        : null
                }
            })
        }))

        res.status(200).json({ message: "Requests fetched successfully", requests: sanitized })

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

        const { name, address, licenseNo, latitude, longitude } = req.body

        let finalCoords: { latitude: number; longitude: number }
        let finalAddress: string

        if (typeof latitude === 'number' && typeof longitude === 'number') {
            const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLon: 60.5, maxLon: 77.5 }
            if (
                latitude < PAKISTAN_BOUNDS.minLat || latitude > PAKISTAN_BOUNDS.maxLat ||
                longitude < PAKISTAN_BOUNDS.minLon || longitude > PAKISTAN_BOUNDS.maxLon
            ) {
                return res.status(400).json({ message: 'Location coordinates are outside the supported region.' })
            }

            finalCoords = { latitude, longitude } // no fuzzing -- hospital location is public/institutional
            finalAddress = address && address.trim() ? address.trim() : 'Shared location'
        } else {
            if (!address || !address.trim()) {
                return res.status(400).json({ message: 'Address is required' })
            }

            const coords = await geocodeAddress(address.trim())

            if (!coords) {
                return res.status(400).json({
                    message: "We couldn't find that address. Please be more specific (e.g. add a well-known landmark or the city name)."
                })
            }

            finalCoords = coords
            finalAddress = address.trim()
        }

        const hospital = await prisma.hospital.create({
            data: {
                userId,
                name,
                address: finalAddress,
                licenseNo,
                latitude: finalCoords.latitude,
                longitude: finalCoords.longitude,
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
    let uploadedPublicId: string | null = null

    try {
        const userId = req.user?.userId
        if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

        const id = req.params.id as string

        const hospital = await prisma.hospital.findUnique({ where: { userId } })
        if (!hospital) return res.status(404).json({ message: 'Hospital not found' })

        const existing = await prisma.bloodRequest.findUnique({
            where: { id },
            include: { matches: true, hospital: true }
        })

        if (!existing) return res.status(404).json({ message: 'Request not found' })

        // Ownership check. Without this, any authenticated hospital could fulfil any
        // other hospital's request — closing their case, crediting their donor and
        // firing their notifications.
        if (existing.hospitalId !== hospital.id) {
            return res.status(403).json({ message: 'You can only fulfil your own requests' })
        }

        // Idempotency guard: re-fulfilling would upload a second photo and re-credit
        // the donor, and there's no legitimate reason to do it.
        if (existing.status === 'FULFILLED') {
            return res.status(400).json({ message: 'This request is already fulfilled' })
        }

        if (existing.status === 'EXPIRED') {
            return res.status(400).json({ message: 'This request has expired and cannot be fulfilled' })
        }

        // A donation can only be confirmed for a donor who actually accepted. This is
        // a deliberate tightening: previously a request could be marked FULFILLED with
        // no accepted match at all, which recorded a donation that never happened and
        // silently credited nobody.
        const acceptedMatch = existing.matches.find(m => m.status === 'ACCEPTED')
        if (!acceptedMatch) {
            return res.status(400).json({
                message: 'No donor has accepted this request yet, so there is no donation to confirm'
            })
        }

        // Match-side transition, asserted against the shared map. Redundant with the find
        // above today, but it is the assertion that keeps this endpoint honest if the
        // selection above is ever loosened.
        if (!canTransitionMatch(acceptedMatch.status, 'COMPLETED')) {
            return res.status(400).json({
                message: illegalTransitionMessage('match', acceptedMatch.status, 'COMPLETED')
            })
        }

        // On the request side, the FULFILLED and EXPIRED guards above are the transition
        // map's rule (both are terminal) expressed with friendlier messages. Note that
        // PENDING is deliberately allowed through even though the map only lists
        // PENDING → MATCHED / EXPIRED: escalation resets a multi-unit request to PENDING
        // when a second donor declines, while the first donor's acceptance still stands.
        // An ACCEPTED match is stronger evidence than the request's own status, and
        // refusing here would stop a hospital confirming a donation that really happened.

        const file = (req as RequestWithPhoto).file
        if (!file) {
            return res.status(400).json({
                message: 'A photo of the blood bag is required to confirm a donation'
            })
        }

        // Completed count BEFORE this donation, so we can detect a newly-crossed
        // badge threshold rather than re-announcing an old one.
        const priorCompletedCount = await prisma.match.count({
            where: { donorId: acceptedMatch.donorId, status: 'COMPLETED' }
        })

        uploadedPublicId = await uploadDonationPhoto(file)

        const now = new Date()

        const { request, donor } = await prisma.$transaction(async (tx) => {
            const request = await tx.bloodRequest.update({
                where: { id },
                data: { status: 'FULFILLED' },
                include: { hospital: true }
            })

            await tx.match.update({
                where: { id: acceptedMatch.id },
                data: {
                    status: 'COMPLETED',
                    photoPublicId: uploadedPublicId,
                    photoUploadedAt: now
                }
            })

            // Clamp in one computed write. The previous implementation incremented and
            // then issued a second corrective update if the result exceeded 100, which
            // briefly persisted an out-of-range score and needed two round trips.
            const current = await tx.donor.findUnique({
                where: { id: acceptedMatch.donorId },
                select: { commitmentScore: true }
            })

            const donor = await tx.donor.update({
                where: { id: acceptedMatch.donorId },
                data: {
                    commitmentScore: Math.min(100, (current?.commitmentScore ?? 0) + 10),
                    lastDonated: now
                }
            })

            return { request, donor }
        })

        const newCompletedCount = priorCompletedCount + 1
        const badgeThresholds: { name: string; count: number }[] = [
            { name: 'First Blood', count: 1 },
            { name: 'Lifesaver', count: 5 },
            { name: 'Hero', count: 10 }
        ]
        const newlyEarnedBadge = badgeThresholds.find(b => b.count === newCompletedCount)?.name ?? null

        if (donor.pushToken) {
            await sendPushNotification(
                donor.pushToken,
                '🎉 Donation Confirmed!',
                `${request.hospital.name} confirmed your donation. Thank you for saving a life — tap to view your certificate.`,
                {
                    type: 'DONATION_CONFIRMED',
                    matchId: acceptedMatch.id,
                    requestId: request.id,
                    newBadge: newlyEarnedBadge
                }
            )
        }

        res.status(200).json({
            message: 'Request fulfilled',
            request,
            photoUrl: getSignedPhotoUrl(uploadedPublicId)
        })
    } catch (error) {
        // If we uploaded but never managed to reference the image from a row, remove it.
        // Otherwise every failed fulfilment leaks an orphaned asset that nothing points
        // at and no cleanup job knows about.
        if (uploadedPublicId) {
            await deleteDonationPhoto(uploadedPublicId)
        }
        console.error('Fulfil request error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const reportNoShow = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

        const matchId = req.params.id as string

        const hospital = await prisma.hospital.findUnique({ where: { userId } })
        if (!hospital) return res.status(404).json({ message: 'Hospital not found' })

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { request: true }
        })
        if (!match) return res.status(404).json({ message: 'Match not found' })

        // Ownership check. Without it, any hospital could report a no-show against a
        // donor on someone else's request and knock 10 points off their commitment
        // score — the most damaging penalty in the system.
        if (match.request.hospitalId !== hospital.id) {
            return res.status(403).json({ message: 'You can only report no-shows on your own requests' })
        }

        // Validated against the shared transition map: ACCEPTED is the only state a
        // no-show can be reported from. Guards against re-penalising a donor who has
        // already been marked NO_SHOW, and against penalising one whose donation is
        // already COMPLETED.
        if (!canTransitionMatch(match.status, 'NO_SHOW')) {
            return res.status(400).json({
                message: illegalTransitionMessage('match', match.status, 'NO_SHOW')
            })
        }

        const { updatedMatch } = await prisma.$transaction(async (tx) => {
            const updatedMatch = await tx.match.update({
                where: { id: matchId },
                data: { status: 'NO_SHOW' }
            })

            const current = await tx.donor.findUnique({
                where: { id: match.donorId },
                select: { commitmentScore: true }
            })

            await tx.donor.update({
                where: { id: match.donorId },
                data: { commitmentScore: Math.max(0, (current?.commitmentScore ?? 0) - 10) }
            })

            return { updatedMatch }
        })

        // the request wasn't actually fulfilled — find a replacement,
        // same as a decline, since the accepted donor never showed up.
        // Best-effort: the no-show and its deduction are already committed above, so a
        // failure to find a replacement must not turn this into a 500 the client cannot retry.
        await escalateAfterDeclineBestEffort(match.requestId)

        res.status(200).json({ message: 'No-show recorded', match: updatedMatch })
    } catch (error) {
        console.error('Report no-show error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const savePushToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' })

    const { pushToken } = req.body

    const hospital = await prisma.hospital.update({
      where: { userId },
      data: { pushToken }
    })

    res.status(200).json({ message: 'Push token saved', hospital })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}


export { getProfile, updateProfile, getInventory, updateInventory, getRequests, createHospitalProfile, getAnalytics, fulfillRequest, reportNoShow, savePushToken }
