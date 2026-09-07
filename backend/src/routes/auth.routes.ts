import { Router, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, forgotPassword, resetPassword, changePassword, deleteAccount } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

const isTestEnv = process.env.NODE_ENV === 'test'
const passthrough: RequestHandler = (_req, _res, next) => next()

// Dedicated, unmixed rate limiters per endpoint:
// Prevents login, registration, and password recovery from sharing rate-limit budgets.
const loginLimiter = isTestEnv
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many login attempts, please try again later.' }
    })

const registerLimiter = isTestEnv
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many registration attempts, please try again later.' }
    })

const forgotPasswordLimiter = isTestEnv
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many password reset requests, please try again later.' }
    })

const resetPasswordLimiter = isTestEnv
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many password reset attempts, please try again later.' }
    })

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)
router.post('/reset-password', resetPasswordLimiter, resetPassword)
router.put('/change-password', authenticate, changePassword)
router.delete('/account', authenticate, deleteAccount)

export default router