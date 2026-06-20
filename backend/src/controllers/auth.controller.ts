import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hash,
                name,
                phone,
                city,
                role
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

