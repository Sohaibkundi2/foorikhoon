import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
import prisma from './lib/prisma'


const app = express();

app.use(cors())
app.use(express.json())

prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch((err) => console.error('Database connection failed', err))

app.get('/', (req, res) => {
  res.json({ message: 'ForiKhoon API running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})