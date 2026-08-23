// Loaded first, and as a bare import, so the .env values are in process.env before any
// module below is evaluated. `src/lib/prisma.ts` reads DATABASE_URL at module scope, so
// the ordering here is load-bearing rather than stylistic.
import 'dotenv/config'

import app from './app'
import { startExpiryJob } from './jobs/expiry.job'
import { startEscalationJob } from './jobs/escalation.job'
import prisma from './lib/prisma'

prisma.$connect()
  .then(() => {
    console.log('Database connected')
    startExpiryJob()
    startEscalationJob()
  })
  .catch((err: Error) => console.error('Database connection failed', err))

const PORT = process.env.PORT || 8000
const server = app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`)
})

server.on('error', (err) => {
  console.error('Server error:', err)
})
server.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})
