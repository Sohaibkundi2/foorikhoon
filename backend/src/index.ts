import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
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

app.use('/api/auth', authRouter)
app.use('/api/hospital', hospitalRouter)
app.use('/api/donor', donorRouter)  
app.use('/api/requests', requestRouter)
app.use('/api/admin', adminRouter)
app.use('/api/map', mapRouter)

app.get('/', (req, res) => {
  res.json({ message: 'ForiKhoon API running' })
})

prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch((err) => console.error('Database connection failed', err))

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