import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/role.middleware'
import {
  getStats,
  getHospitals,
  verifyHospital,
  getUsers,
  getRequests,
  deleteHospital,
  deleteUser
} from '../controllers/admin.controller'

const router = Router()

router.use(authenticate, authorize('ADMIN'))

router.delete('/hospitals/:id', deleteHospital)
router.delete('/users/:id', deleteUser)
router.get('/stats', getStats)
router.get('/hospitals', getHospitals)
router.put('/hospitals/:id/verify', verifyHospital)
router.get('/users', getUsers)
router.get('/requests', getRequests)
export default router