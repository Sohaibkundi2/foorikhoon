import { Request, Response } from 'express'
import prisma from '../lib/prisma'

export const getHealth = async (req: Request, res: Response) => {
  try {
    // Verify real database connectivity via a trivial query
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Health check failed:', error)
    res.status(503).json({
      status: 'error',
      message: error?.message || 'Database connection failed'
    })
  }
}
