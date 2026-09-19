import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/role.middleware'
import {
  registerWalkinDonor,
  getStaffDonors,
  getStaffProfile,
} from '../controllers/staff.controller'

const router = Router()

router.use(authenticate, authorize('STAFF'))

router.get('/profile', getStaffProfile)
router.post('/donors', registerWalkinDonor)
router.get('/donors', getStaffDonors)

export default router
