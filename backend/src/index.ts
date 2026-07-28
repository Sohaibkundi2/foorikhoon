import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import { startExpiryJob } from './jobs/expiry.job'
import { startEscalationJob } from './jobs/escalation.job'
import prisma from './lib/prisma'
import authRouter from './routes/auth.routes'

//protected routes
import hospitalRouter from './routes/hospital.routes'
import donorRouter from './routes/donor.routes'
import requestRouter from './routes/request.routes'
import adminRouter from './routes/admin.routes'
import mapRouter from './routes/map.routes'

const app = express()

app.use(cors())
app.use(express.json())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter for auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
})

app.use('/api/auth', authLimiter, authRouter)

app.use('/api/hospital', limiter, hospitalRouter)
app.use('/api/donor', limiter, donorRouter)
app.use('/api/requests', limiter, requestRouter)
app.use('/api/admin', limiter, adminRouter)
app.use('/api/map', limiter, mapRouter)

app.get('/', (req, res) => {
  res.json({ message: 'ForiKhoon API running' })
})

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