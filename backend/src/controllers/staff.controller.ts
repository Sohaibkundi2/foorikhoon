import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { geocodeAddress } from '../lib/geocode'

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  islamabad: { latitude: 33.6844, longitude: 73.0479 },
  rawalpindi: { latitude: 33.5651, longitude: 73.0169 },
  lahore: { latitude: 31.5204, longitude: 74.3587 },
  karachi: { latitude: 24.8607, longitude: 67.0011 },
  peshawar: { latitude: 34.0151, longitude: 71.5249 },
  quetta: { latitude: 30.1798, longitude: 66.9750 },
  multan: { latitude: 30.1575, longitude: 71.5249 },
  faisalabad: { latitude: 31.4504, longitude: 73.1350 },
  sialkot: { latitude: 32.4945, longitude: 74.5229 },
  gujranwala: { latitude: 32.1877, longitude: 74.1945 },
  hyderabad: { latitude: 25.3960, longitude: 68.3578 },
}

const VALID_BLOOD_GROUPS = [
  'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'
]

function fuzzCoordinates(lat: number, lon: number) {
  const FUZZ_PRECISION = 2
  return {
    latitude: parseFloat(lat.toFixed(FUZZ_PRECISION)),
    longitude: parseFloat(lon.toFixed(FUZZ_PRECISION)),
  }
}

export const registerWalkinDonor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId },
      include: {
        createdByHospital: true,
        createdByAdmin: true,
      }
    })

    if (!staff) {
      return res.status(403).json({ message: 'Staff profile not found or unauthorized' })
    }

    const { name, phone, bloodGroup, city, area, email, password, shareContactInfo } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Donor name is required' })
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ message: 'Donor phone number is required' })
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ message: 'City is required' })
    }

    if (!bloodGroup || !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: 'A valid blood group is required' })
    }

    const trimmedCity = city.trim()
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const trimmedArea = area && typeof area === 'string' && area.trim() ? area.trim() : trimmedCity

    let userEmail: string
    if (email && typeof email === 'string' && email.trim()) {
      userEmail = email.trim().toLowerCase()
      const existingUser = await prisma.user.findUnique({ where: { email: userEmail } })
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' })
      }
    } else {
      const randomSuffix = crypto.randomBytes(4).toString('hex')
      const sanitizedPhone = trimmedPhone.replace(/[^0-9]/g, '').slice(-8) || 'donor'
      userEmail = `walkin.${sanitizedPhone}.${randomSuffix}@forikhoon.local`
    }

    let coords: { latitude: number; longitude: number } | null = null
    try {
      coords = await geocodeAddress(`${trimmedArea}, ${trimmedCity}`)
      if (!coords) {
        coords = await geocodeAddress(trimmedCity)
      }
    } catch (geoErr) {
      console.warn('Geocoding warning for walk-in donor:', geoErr)
    }

    if (!coords) {
      const cityKey = trimmedCity.toLowerCase()
      coords = CITY_COORDINATES[cityKey] || { latitude: 30.3753, longitude: 69.3451 }
    }

    const fuzzed = fuzzCoordinates(coords.latitude, coords.longitude)

    const rawPassword = password && typeof password === 'string' && password.trim().length >= 6
      ? password.trim()
      : 'FK-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(rawPassword, salt)

    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: userEmail,
        phone: trimmedPhone,
        city: trimmedCity,
        password: hash,
        role: 'DONOR',
      }
    })

    const newDonor = await prisma.donor.create({
      data: {
        userId: newUser.id,
        bloodGroup,
        area: trimmedArea,
        latitude: fuzzed.latitude,
        longitude: fuzzed.longitude,
        shareContactInfo: shareContactInfo === true,
        isAvailable: true,
        commitmentScore: 10,
      }
    })

    const registration = await prisma.staffDonorRegistration.create({
      data: {
        staffId: staff.id,
        donorId: newDonor.id,
      }
    })

    res.status(201).json({
      message: 'Walk-in donor registered successfully',
      donor: {
        id: newDonor.id,
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        city: newUser.city,
        area: newDonor.area,
        bloodGroup: newDonor.bloodGroup,
        commitmentScore: newDonor.commitmentScore,
        registeredAt: registration.registeredAt,
        tempPassword: rawPassword,
      }
    })
  } catch (error) {
    console.error('Register walk-in donor error:', error)
    res.status(500).json({ message: 'Internal server error while registering donor' })
  }
}

export const getStaffDonors = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId }
    })

    if (!staff) {
      return res.status(403).json({ message: 'Staff profile not found or unauthorized' })
    }

    const registrations = await prisma.staffDonorRegistration.findMany({
      where: { staffId: staff.id },
      include: {
        donor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
              }
            }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    })

    const donors = registrations.map(reg => ({
      registrationId: reg.id,
      registeredAt: reg.registeredAt,
      donorId: reg.donor.id,
      userId: reg.donor.user.id,
      name: reg.donor.user.name,
      email: reg.donor.user.email,
      phone: reg.donor.user.phone,
      city: reg.donor.user.city,
      area: reg.donor.area,
      bloodGroup: reg.donor.bloodGroup,
      commitmentScore: reg.donor.commitmentScore,
      isAvailable: reg.donor.isAvailable,
      lastDonated: reg.donor.lastDonated,
    }))

    res.status(200).json({ donors })
  } catch (error) {
    console.error('Get staff donors error:', error)
    res.status(500).json({ message: 'Internal server error while fetching registered donors' })
  }
}

export const getStaffProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const staff = await prisma.staff.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            role: true,
            createdAt: true,
          }
        },
        createdByHospital: {
          select: {
            id: true,
            name: true,
            licenseNo: true,
            address: true,
          }
        },
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' })
    }

    res.status(200).json({
      staff: {
        id: staff.id,
        user: staff.user,
        createdByHospital: staff.createdByHospital,
        createdByAdmin: staff.createdByAdmin,
        provenanceType: staff.createdByHospitalId ? 'HOSPITAL' : 'ADMIN',
        totalDonorsRegistered: staff._count.registrations,
        createdAt: staff.createdAt,
      }
    })
  } catch (error) {
    console.error('Get staff profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
