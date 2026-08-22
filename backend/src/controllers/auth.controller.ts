import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

