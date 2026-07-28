import cron from 'node-cron'
import prisma from '../lib/prisma'
import axios from 'axios'
import { sendPushNotification } from '../services/notification.service'
import { haversineDistance, getBoundingBox, RADIUS_TIERS_KM } from '../lib/distance'
import { COMPATIBLE_DONOR_GROUPS } from '../lib/compatibility'

const RESPONSE_TIMEOUT_MINUTES = 15

export const startEscalationJob = () => {
  // runs every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running escalation check...')

    try {
      const cutoff = new Date(Date.now() - RESPONSE_TIMEOUT_MINUTES * 60 * 1000)

      const staleRequests = await prisma.bloodRequest.findMany({
        where: {
          status: 'PENDING',
          matches: {
            every: {
              status: 'PENDING',
              createdAt: { lt: cutoff }
            }
          }
        },
        include: { hospital: true, matches: true }
      })

      for (const request of staleRequests) {
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

          const nextBatch = aiResponse.data.matches.slice(0, 3)

          for (const ranked of nextBatch) {
            await prisma.match.create({
              data: { requestId: request.id, donorId: ranked.donorId }
            })

            const donor = await prisma.donor.findUnique({ where: { id: ranked.donorId } })
            if (donor?.pushToken) {
              await sendPushNotification(
                donor.pushToken,
                '🩸 Blood Needed Urgently',
                `${request.hospital.name} needs blood — previous donors unavailable`,
                { requestId: request.id }
              )
            }
          }

          console.log(`Escalated request ${request.id} to ${nextBatch.length} new donors at ${radiusKm}km`)
          break
        }
      }
    } catch (error) {
      console.error('[ESCALATION-JOB] error:', error)
    }
  })

  console.log('Escalation job started')
}