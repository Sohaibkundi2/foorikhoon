import { Router } from 'express'
import { getMapStats } from '../controllers/map.controller'

const router = Router()

router.get('/stats', getMapStats)

export default router