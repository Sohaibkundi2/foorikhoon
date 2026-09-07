import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '../services/email.service'
import { deleteUserCascade } from '../services/userDeletion.service'

/**
 * The only roles obtainable through public self-service registration.
 *
 * ADMIN is deliberately absent. `role` arrives in the request body, so anything trusted
 * from it is effectively client-assigned — before this whitelist a caller could simply
 * POST `role: "ADMIN"` and provision themselves an administrator account against the
 * live database. Admin users must be created out-of-band (seed script or direct DB
 * access), never through an unauthenticated endpoint.
 */
const SELF_SIGNUP_ROLES = ['DONOR', 'HOSPITAL'] as const
type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number]

const isSelfSignupRole = (value: unknown): value is SelfSignupRole =>
    typeof value === 'string' && (SELF_SIGNUP_ROLES as readonly string[]).includes(value)

export const register = async (req: Request, res: Response) => {

    try {
        const { email, password, name, phone, city, role } = req.body

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' })
            return
        }

        const existUser = await prisma.user.findUnique({ where: { email } })

        if (existUser) {
            res.status(400).json({ message: 'User already exists' })
            return
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        // Fall back to DONOR rather than rejecting an unknown role: registration is the
        // first thing a new user does, and the least-privileged role is a safe default.
        const safeRole: SelfSignupRole = isSelfSignupRole(role) ? role : 'DONOR'

        const newUser = await prisma.user.create({
            data: {
                email: email.trim().toLowerCase(),
                password: hash,
                name,
                phone,
                city: city.trim(),
                role: safeRole
            }
        })

        res.status(201).json(
            {
                message: "user created",
                user:
                    { id: newUser.id, email: newUser.email }
            })
    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }

}

export const login = async (req: Request, res: Response) => {

    try {
        const { email, password } = req.body

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' })
            return
        }
        const existUser = await prisma.user.findUnique({ where: { email } })

        if (!existUser) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        const isPasswordValid = bcrypt.compareSync(password, existUser.password)

        if (!isPasswordValid) {
            res.status(400).json({ message: "password does not matched" })
            return
        }



        const token = jwt.sign(
            { userId: existUser.id, role: existUser.role },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        )

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: existUser.id, email: existUser.email, role: existUser.role }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }

}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body

        if (!email || typeof email !== 'string' || !email.trim()) {
            res.status(400).json({ message: 'Email is required' })
            return
        }

        const normalizedEmail = email.trim().toLowerCase()
        const existUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (existUser) {
            // Invalidate any existing unused reset tokens for this user
            await prisma.passwordResetToken.updateMany({
                where: {
                    userId: existUser.id,
                    used: false
                },
                data: {
                    used: true
                }
            })

            // Generate secure random token
            const rawToken = crypto.randomBytes(32).toString('hex')
            const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

            await prisma.passwordResetToken.create({
                data: {
                    userId: existUser.id,
                    hashedToken,
                    expiresAt,
                    used: false
                }
            })

            try {
                await sendPasswordResetEmail(existUser.email, rawToken)
            } catch (mailError) {
                console.error('Failed to send password reset email:', mailError)
            }
        }

        // Always respond with generic message to prevent user enumeration
        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        })
    } catch (error) {
        console.error('Forgot password error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body

        if (!token || typeof token !== 'string') {
            res.status(400).json({ message: 'Token is required' })
            return
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters long' })
            return
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

        const resetRecord = await prisma.passwordResetToken.findUnique({
            where: { hashedToken }
        })

        if (!resetRecord) {
            res.status(400).json({ message: 'Invalid or expired password reset token' })
            return
        }

        if (resetRecord.used) {
            res.status(400).json({ message: 'Password reset token has already been used' })
            return
        }

        if (new Date() > resetRecord.expiresAt) {
            res.status(400).json({ message: 'Password reset token has expired' })
            return
        }

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(newPassword, salt)

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetRecord.userId },
                data: { password: hash }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetRecord.id },
                data: { used: true }
            })
        ])

        res.status(200).json({ message: 'Password has been successfully reset' })
    } catch (error) {
        console.error('Reset password error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' })
            return
        }

        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Current password and new password are required' })
            return
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            res.status(400).json({ message: 'New password must be at least 8 characters long' })
            return
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        const isPasswordValid = bcrypt.compareSync(currentPassword, user.password)
        if (!isPasswordValid) {
            res.status(400).json({ message: 'Current password is incorrect' })
            return
        }

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(newPassword, salt)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hash }
        })

        res.status(200).json({ message: 'Password updated successfully' })
    } catch (error) {
        console.error('Change password error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' })
            return
        }

        const { confirmation } = req.body

        if (!confirmation || typeof confirmation !== 'string' || confirmation.trim().toLowerCase() !== 'delete') {
            res.status(400).json({ message: "Please type 'delete' to confirm account deletion" })
            return
        }

        const deleted = await deleteUserCascade(userId)
        if (!deleted) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        res.status(200).json({ message: 'Account deleted successfully' })
    } catch (error) {
        console.error('Delete account error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}
