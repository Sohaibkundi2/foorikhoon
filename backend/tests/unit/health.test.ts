import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/lib/prisma'

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn()
  }
}))

describe('GET /api/healthz (Health Check Endpoint)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with status ok, uptime, and timestamp when DB query succeeds', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const res = await request(app).get('/api/healthz')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      timestamp: expect.any(String)
    })
    expect(res.body.uptime).toBeGreaterThanOrEqual(0)
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('returns 503 with status error and message when DB query fails', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection terminated unexpectedly'))

    const res = await request(app).get('/api/healthz')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({
      status: 'error',
      message: 'Connection terminated unexpectedly'
    })
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('does not require authentication and is also accessible at /healthz', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const res = await request(app).get('/healthz')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
