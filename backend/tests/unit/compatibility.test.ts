import { COMPATIBLE_DONOR_GROUPS } from '../../src/lib/compatibility'
import { BloodGroup } from '../../prisma/generated'

/**
 * The compatible-donor matrix is the single most consequential table in the codebase: it
 * decides which donors are even considered for a request, and the README is explicit that
 * it encodes a *scarcity-management policy* rather than textbook ABO/Rh compatibility.
 * These tests assert that policy, not clinical transfusion rules.
 */

const ALL_GROUPS: BloodGroup[] = [
  BloodGroup.A_POS,
  BloodGroup.A_NEG,
  BloodGroup.B_POS,
  BloodGroup.B_NEG,
  BloodGroup.AB_POS,
  BloodGroup.AB_NEG,
  BloodGroup.O_POS,
  BloodGroup.O_NEG
]

/** The groups the README describes as scarce and therefore reserved. */
const RARE_GROUPS: BloodGroup[] = [BloodGroup.O_NEG, BloodGroup.AB_NEG]

describe('COMPATIBLE_DONOR_GROUPS', () => {
  it('defines a donor list for every blood group in the schema', () => {
    for (const group of ALL_GROUPS) {
      expect(COMPATIBLE_DONOR_GROUPS[group]).toBeDefined()
    }
    // No stray keys either — an unknown key would silently never be consulted, since
    // callers look the matrix up by the request's blood group.
    expect(Object.keys(COMPATIBLE_DONOR_GROUPS).sort()).toEqual([...ALL_GROUPS].sort())
  })

  it('always allows a donor of the exact same blood group as the request', () => {
    for (const group of ALL_GROUPS) {
      expect(COMPATIBLE_DONOR_GROUPS[group]).toContain(group)
    }
  })

  it('never lists a donor group that is not a real BloodGroup', () => {
    for (const group of ALL_GROUPS) {
      for (const donorGroup of COMPATIBLE_DONOR_GROUPS[group]) {
        expect(ALL_GROUPS).toContain(donorGroup)
      }
    }
  })

  it('contains no duplicate donor groups in any list', () => {
    for (const group of ALL_GROUPS) {
      const list = COMPATIBLE_DONOR_GROUPS[group]
      expect(new Set(list).size).toBe(list.length)
    }
  })
})

/**
 * Regression lock on the matrix exactly as it ships today, so an accidental edit is loud.
 *
 * These rows are a snapshot of the data, not an independent statement of policy — the
 * policy itself is asserted in the next describe block. When the two disagree, the policy
 * block is the authority and the data is what changes.
 */
describe('COMPATIBLE_DONOR_GROUPS — current matrix values', () => {
  const cases: [BloodGroup, BloodGroup[]][] = [
    [BloodGroup.A_POS, [BloodGroup.A_POS, BloodGroup.A_NEG]],
    [BloodGroup.A_NEG, [BloodGroup.A_NEG]],
    [BloodGroup.B_POS, [BloodGroup.B_POS, BloodGroup.B_NEG]],
    [BloodGroup.B_NEG, [BloodGroup.B_NEG]],
    [
      BloodGroup.AB_POS,
      [
        BloodGroup.A_POS,
        BloodGroup.A_NEG,
        BloodGroup.B_POS,
        BloodGroup.B_NEG,
        BloodGroup.AB_POS
      ]
    ],
    [BloodGroup.AB_NEG, [BloodGroup.A_NEG, BloodGroup.B_NEG, BloodGroup.AB_NEG]],
    [BloodGroup.O_POS, [BloodGroup.O_POS]],
    [BloodGroup.O_NEG, [BloodGroup.O_NEG]]
  ]

  it.each(cases)('a %s request draws from exactly the documented donor list', (request, expected) => {
    expect(COMPATIBLE_DONOR_GROUPS[request]).toEqual(expected)
  })
})

describe('strict rare-type reservation policy', () => {
  it('reserves O− donors for O− requests only', () => {
    const requestsThatCanDrawONeg = ALL_GROUPS.filter(group =>
      COMPATIBLE_DONOR_GROUPS[group].includes(BloodGroup.O_NEG)
    )
    expect(requestsThatCanDrawONeg).toEqual([BloodGroup.O_NEG])
  })

  it('reserves AB− donors for AB− requests only', () => {
    const requestsThatCanDrawABNeg = ALL_GROUPS.filter(group =>
      COMPATIBLE_DONOR_GROUPS[group].includes(BloodGroup.AB_NEG)
    )
    expect(requestsThatCanDrawABNeg).toEqual([BloodGroup.AB_NEG])
  })

  it('never offers a rare-type donor as a cross-type substitute for another group', () => {
    const violations: string[] = []

    for (const request of ALL_GROUPS) {
      for (const rare of RARE_GROUPS) {
        if (request !== rare && COMPATIBLE_DONOR_GROUPS[request].includes(rare)) {
          violations.push(`${rare} donors are offered to ${request} requests`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('does not implement universal-donor logic — O− is not offered to O+ requests', () => {
    // Guards against someone "fixing" the matrix toward textbook ABO/Rh rules, which
    // would drain the scarcest group first. This is the deliberate deviation the README
    // documents.
    expect(COMPATIBLE_DONOR_GROUPS[BloodGroup.O_POS]).not.toContain(BloodGroup.O_NEG)
    expect(COMPATIBLE_DONOR_GROUPS[BloodGroup.A_POS]).not.toContain(BloodGroup.O_NEG)
    expect(COMPATIBLE_DONOR_GROUPS[BloodGroup.AB_POS]).not.toContain(BloodGroup.O_NEG)
  })
})
