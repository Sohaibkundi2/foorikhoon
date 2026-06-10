
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/role.middleware'
import { getProfile, updateProfile, getInventory, updateInventory, getRequests } from '../controllers/hospital.controller'

const router = Router()

router.get('/profile', authenticate, authorize('HOSPITAL'), getProfile)
router.put('/profile', authenticate, authorize('HOSPITAL'), updateProfile)
router.get('/inventory', authenticate, authorize('HOSPITAL'), getInventory)
router.put('/inventory', authenticate, authorize('HOSPITAL'), updateInventory)
router.get('/requests', authenticate, authorize('HOSPITAL'), getRequests)

export default router