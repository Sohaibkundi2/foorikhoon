import prisma from '../lib/prisma'

/**
 * Permanently deletes a user and cascades all related records atomically.
 *
 * Deletion order:
 * 1. If User is a HOSPITAL:
 *    - All Inventory rows for this hospital
 *    - All Match rows linked to any BloodRequest filed by this hospital
 *    - All BloodRequest rows filed by this hospital
 *    - The Hospital row itself
 * 2. If User is a DONOR:
 *    - All Match rows linked to this donor
 *    - The Donor row itself
 * 3. All PasswordResetToken rows for this user
 * 4. The User row itself
 */
export async function deleteUserCascade(userId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch user to identify hospital and/or donor profiles
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        hospital: true,
        donor: true,
      },
    })

    if (!user) {
      return null
    }

    // 2. Cascade hospital dependencies
    if (user.hospital) {
      const hospitalId = user.hospital.id

      // Delete inventory items
      await tx.inventory.deleteMany({
        where: { hospitalId },
      })

      // Delete all matches associated with blood requests of this hospital
      await tx.match.deleteMany({
        where: {
          request: {
            hospitalId,
          },
        },
      })

      // Delete all blood requests filed by this hospital
      await tx.bloodRequest.deleteMany({
        where: { hospitalId },
      })

      // Delete the hospital record
      await tx.hospital.delete({
        where: { id: hospitalId },
      })
    }

    // 3. Cascade donor dependencies
    if (user.donor) {
      const donorId = user.donor.id

      // Delete all matches where this donor was contacted/paired
      await tx.match.deleteMany({
        where: { donorId },
      })

      // Delete the donor record
      await tx.donor.delete({
        where: { id: donorId },
      })
    }

    // 4. Delete password reset tokens
    await tx.passwordResetToken.deleteMany({
      where: { userId },
    })

    // 5. Delete the user
    const deletedUser = await tx.user.delete({
      where: { id: userId },
    })

    return deletedUser
  })
}
