import cron from 'node-cron'
import prisma from '../lib/prisma'

export const startExpiryJob = () => {
  // runs every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('Running expiry check...')

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