import cron from 'node-cron'
import prisma from '../lib/prisma'

export const startExpiryJob = () => {
  // runs every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('Running expiry check...')

    // Deliberately pins PENDING instead of deriving from `requestStatesLeadingTo('EXPIRED')`.
    // The cron's rule is intentionally NARROWER than the general transition rule: a hospital
    // may cancel a MATCHED request by hand (patient transferred, blood sourced elsewhere),
    // so MATCHED -> EXPIRED is legal — but a timer must never do it unattended, because a
    // donor has already accepted and may be on their way to the hospital. Expiring that
    // silently would strand them. Only an unanswered request ages out.
    //
    // Still race-safe: the status filter is applied by the database as part of the write,
    // not read first and checked in Node.
    const expired = await prisma.bloodRequest.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() } // less than current time
      },
      data: { status: 'EXPIRED' }
    })

    if (expired.count > 0) {
      console.log(`${expired.count} requests expired`)
    }
  })

  console.log('Expiry job started')
}