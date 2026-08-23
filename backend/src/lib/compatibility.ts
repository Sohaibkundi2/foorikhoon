import { BloodGroup } from "../../prisma/generated"

export const COMPATIBLE_DONOR_GROUPS: Record<string, BloodGroup[]> = {
  A_POS:  [BloodGroup.A_POS, BloodGroup.A_NEG],
  A_NEG:  [BloodGroup.A_NEG],
  B_POS:  [BloodGroup.B_POS, BloodGroup.B_NEG],
  B_NEG:  [BloodGroup.B_NEG],
  AB_POS: [BloodGroup.A_POS, BloodGroup.A_NEG, BloodGroup.B_POS, BloodGroup.B_NEG, BloodGroup.AB_POS],
  AB_NEG: [BloodGroup.A_NEG, BloodGroup.B_NEG, BloodGroup.AB_NEG],
  O_POS:  [BloodGroup.O_POS],
  O_NEG:  [BloodGroup.O_NEG],
}