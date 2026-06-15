import { Request, Response } from "express"
import prisma from "../lib/prisma"

const getProfile = async (req: Request, res: Response) => {

    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospitalProfile = await prisma.hospital.findUnique({
            where: { userId },
            include: { user: true }
        })

        if (!hospitalProfile) {
            res.status(400).json({ message: "hospital profile not found" })
            return
        }

        res.status(200).json({ message: "hospital profile fetched with user details", hospitalProfile })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const { name, address, phone, city } = req.body

        const updatedHospital = await prisma.hospital.update({
            where: { userId },
            data: { name, address }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { phone, city }
        })

        res.status(200).json({ message: "hospital updated successfully", updatedHospital })


    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const getInventory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const inventory = await prisma.inventory.findMany({
            where: { hospitalId: hospital.id }
        })


        res.status(200).json({ message: "Inventory fetched successfully", inventory })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const updateInventory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const { bloodGroup, units } = req.body

        const updatedInventory = await prisma.inventory.upsert({
        where: {
            hospitalId_bloodGroup: { hospitalId: hospital.id, bloodGroup }
        },
        update: { units },
        create: { hospitalId: hospital.id, bloodGroup, units }
        })
        // console.log(bloodGroup, units)
        res.status(200).json({ message: "Inventory updated successfully", updatedInventory })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
const getRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const hospital = await prisma.hospital.findUnique({ where: { userId } })

        if (!hospital) {
            res.status(404).json({ message: 'Hospital not found' })
            return
        }

        const requests = await prisma.bloodRequest.findMany({
            where: { hospitalId: hospital.id },
        })

        res.status(200).json({ message: "Requests fetched successfully", requests })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}

const createHospitalProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const { name, address, licenseNo } = req.body

    const hospital = await prisma.hospital.create({
      data: {
        userId,
        name,
        address,
        licenseNo
      }
    })

    res.status(201).json({ message: 'Hospital profile created', hospital })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

export {
    getProfile,
    updateProfile,
    getInventory,
    updateInventory,
    getRequests,   
    createHospitalProfile
}