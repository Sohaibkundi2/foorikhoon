import { Router } from 'express'
import { register, login } from '../controllers/auth.controller'

console.log('auth routes loaded') 

const router = Router()

router.post('/register', register)
router.post('/login', login)

export default router