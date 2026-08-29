import cron from 'node-cron'
import prisma from '../lib/prisma'
import axios from 'axios'
import { sendPushNotification } from '../services/notification.service'
import { COMPATIBLE_DONOR_GROUPS } from '../lib/compatibility'
import { findEligibleDonors } from '../lib/donorMatching'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5001'

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

        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const { matches, radiusUsed } = await findEligibleDonors(
          request.hospital.latitude!,
          request.hospital.longitude!,
          allowedGroups,
          alreadyTriedDonorIds
        )

        if (matches.length === 0) continue

        const aiResponse = await axios.post(`${AI_ENGINE_URL}/ai/match`, {
          donors: matches.map(w => ({
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

        console.log(`Escalated request ${request.id} to ${nextBatch.length} new donors at ${radiusUsed}km`)
      }
    } catch (error) {
      console.error('[ESCALATION-JOB] error:', error)
    }
  })

  console.log('Escalation job started')
}