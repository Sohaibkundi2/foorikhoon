import { Router } from 'express'
import { getMapStats, getPublicStats, getShortagePrediiction, getWeeklyHeroes } from '../controllers/map.controller'

const router = Router()

router.get('/stats', getMapStats)
router.get('/public-stats', getPublicStats)
router.get('/weekly-heroes', getWeeklyHeroes)
router.get('/shortage', getShortagePrediiction)

export default router 