
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { authorize } from '../middleware/role.middleware'
import { uploadDonationPhotoMiddleware } from '../middleware/upload.middleware'
import { getProfile, updateProfile, getInventory, updateInventory, getRequests, createHospitalProfile, getAnalytics, fulfillRequest, reportNoShow, savePushToken} from '../controllers/hospital.controller'

const router = Router()

router.get('/profile', authenticate, authorize('HOSPITAL'), getProfile)
router.put('/profile', authenticate, authorize('HOSPITAL'), updateProfile)
router.get('/inventory', authenticate, authorize('HOSPITAL'), getInventory)
router.put('/inventory', authenticate, authorize('HOSPITAL'), updateInventory)
router.get('/requests', authenticate, authorize('HOSPITAL'), getRequests)
router.post('/profile', authenticate, authorize('HOSPITAL'), createHospitalProfile)
router.get('/analytics', authenticate, authorize('HOSPITAL'), getAnalytics)
// multipart/form-data — the upload middleware runs after auth so we never spend
// bandwidth buffering a 5MB file for a request that was going to be rejected anyway
router.put(
  '/requests/:id/fulfill',
  authenticate,
  authorize('HOSPITAL'),
  uploadDonationPhotoMiddleware,
  fulfillRequest
)
router.patch('/matches/:id/no-show', authenticate, authorize('HOSPITAL'), reportNoShow)
router.put('/push-token', authenticate, authorize('HOSPITAL'), savePushToken)

export default router