import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/role.middleware'
import { 
  getProfile, 
  updateProfile, 
  updateAvailability,
  getMatches,
  respondToMatch
} from '../controllers/donor.controller'

const router = Router()

router.get('/profile', authenticate, authorize('DONOR'), getProfile)
router.put('/profile', authenticate, authorize('DONOR'), updateProfile)
router.put('/availability', authenticate, authorize('DONOR'), updateAvailability)
router.get('/matches', authenticate, authorize('DONOR'), getMatches)
router.put('/matches/:id', authenticate, authorize('DONOR'), respondToMatch)

export default router