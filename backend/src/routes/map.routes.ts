import { Router } from 'express'
import { getMapStats, getPublicStats } from '../controllers/map.controller'

const router = Router()

router.get('/stats', getMapStats)
router.get('/public-stats', getPublicStats)

export default router 