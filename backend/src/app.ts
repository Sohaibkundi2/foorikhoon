import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'

import authRouter from './routes/auth.routes'

//protected routes
import hospitalRouter from './routes/hospital.routes'
import donorRouter from './routes/donor.routes'
import requestRouter from './routes/request.routes'
import adminRouter from './routes/admin.routes'
import mapRouter from './routes/map.routes'

/**
 * The Express app, with no side effects on import.
 *
 * Why this is split out of `index.ts`: that file opens a port, calls `prisma.$connect()`
 * and starts both cron jobs the moment it is imported. Supertest works by importing the
 * app object and driving it in-process, so importing `index.ts` from a test would connect
 * to whatever database `DATABASE_URL` points at, bind a real socket, and leave two cron
 * timers running that keep the Jest worker alive forever. Everything here is pure
 * construction; all the bootstrapping stays in `index.ts`.
 */
const app = express()

app.use(cors())
app.use(express.json())

/**
 * Rate limiting is bypassed under NODE_ENV=test only.
 *
 * express-rate-limit keeps its counters in process memory, so an entire Jest run shares
 * one budget: the auth limiter's 10-request window is consumed by the first handful of
 * registrations and every later test gets a 429 instead of the status code it is
 * asserting. That produces failures that look like app bugs but are an artefact of
 * running the suite in a single process. Production behaviour is untouched — when
 * NODE_ENV is anything other than 'test' these are the same two limiters as before.
 */
const isTestEnv = process.env.NODE_ENV === 'test'

const passthrough: express.RequestHandler = (_req, _res, next) => next()

const limiter = isTestEnv
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later.' }
    })

const authLimiter = isTestEnv
  ? passthrough
  : rateLimit({
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

export default app
