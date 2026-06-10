import { Router } from "express"
import { authorize } from "../middleware/role.middleware"
import { authenticate } from "../middleware/auth.middleware"
import { createRequest, getRequests, getRequestById, updateRequestStatus } from '../controllers/request.controller'


const router = Router()

router.post('/',authenticate, authorize('HOSPITAL'),createRequest )
router.get('/', getRequests)
router.get('/:id', getRequestById)
router.put('/:id', authenticate, authorize('HOSPITAL'), updateRequestStatus)


export default router