import { Router } from 'express'
import { getMapStats, getPublicStats, getWeeklyHeroes } from '../controllers/map.controller'

const router = Router()

router.get('/stats', getMapStats)
router.get('/public-stats', getPublicStats)
router.get('/weekly-heroes', getWeeklyHeroes)

export default router 