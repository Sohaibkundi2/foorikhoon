import {
  MATCH_TRANSITIONS,
  REQUEST_TRANSITIONS,
  canTransitionMatch,
  canTransitionRequest,
  isMatchStatus,
  isRequestStatus,
  requestStatesLeadingTo,
  illegalTransitionMessage
} from '../../src/lib/statusTransitions'
import { MatchStatus, RequestStatus } from '../../prisma/generated'

const ALL_MATCH_STATUSES: MatchStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'NO_SHOW', 'COMPLETED']
const ALL_REQUEST_STATUSES: RequestStatus[] = ['PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED']

describe('match status transitions', () => {
  /**
   * Exhaustive over all 5x5 pairs, derived from the map itself. Enumerating every pair
   * means a state added to the enum without a rule cannot slip through untested.
   */
  const matchPairs: [MatchStatus, MatchStatus, boolean][] = ALL_MATCH_STATUSES.flatMap(from =>
    ALL_MATCH_STATUSES.map(to => [from, to, MATCH_TRANSITIONS[from].includes(to)] as [MatchStatus, MatchStatus, boolean])
  )

  it.each(matchPairs)('%s -> %s is allowed: %s', (from, to, expected) => {
    expect(canTransitionMatch(from, to)).toBe(expected)
  })

  it('lets a notified donor accept or decline', () => {
    expect(canTransitionMatch('PENDING', 'ACCEPTED')).toBe(true)
    expect(canTransitionMatch('PENDING', 'DECLINED')).toBe(true)
  })

  it('lets a hospital confirm a donation or report a no-show on an accepted match', () => {
    expect(canTransitionMatch('ACCEPTED', 'COMPLETED')).toBe(true)
    expect(canTransitionMatch('ACCEPTED', 'NO_SHOW')).toBe(true)
  })

  it('rejects jumping a match straight from PENDING to COMPLETED', () => {
    // This is the certificate-forging path: COMPLETED mints a hero certificate and a +10
    // commitment score, so it must only ever be reachable via hospital confirmation.
    expect(canTransitionMatch('PENDING', 'COMPLETED')).toBe(false)
  })

  it('rejects marking an unanswered match as a no-show', () => {
    expect(canTransitionMatch('PENDING', 'NO_SHOW')).toBe(false)
  })

  it('treats DECLINED, NO_SHOW and COMPLETED as terminal', () => {
    for (const terminal of ['DECLINED', 'NO_SHOW', 'COMPLETED'] as MatchStatus[]) {
      expect(MATCH_TRANSITIONS[terminal]).toEqual([])
      for (const to of ALL_MATCH_STATUSES) {
        expect(canTransitionMatch(terminal, to)).toBe(false)
      }
    }
  })

  it('rejects re-entering a state a match is already in', () => {
    for (const status of ALL_MATCH_STATUSES) {
      expect(canTransitionMatch(status, status)).toBe(false)
    }
  })
})

describe('request status transitions', () => {
  const requestPairs: [RequestStatus, RequestStatus, boolean][] = ALL_REQUEST_STATUSES.flatMap(from =>
    ALL_REQUEST_STATUSES.map(
      to => [from, to, REQUEST_TRANSITIONS[from].includes(to)] as [RequestStatus, RequestStatus, boolean]
    )
  )

  it.each(requestPairs)('%s -> %s is allowed: %s', (from, to, expected) => {
    expect(canTransitionRequest(from, to)).toBe(expected)
  })

  it('lets a pending request be matched or expired', () => {
    expect(canTransitionRequest('PENDING', 'MATCHED')).toBe(true)
    expect(canTransitionRequest('PENDING', 'EXPIRED')).toBe(true)
  })

  it('returns a matched request to the pool when its donor falls through', () => {
    expect(canTransitionRequest('MATCHED', 'PENDING')).toBe(true)
  })

  it('lets a hospital cancel a request that already has a donor en route', () => {
    // Deliberately allowed, and documented as a spec deviation in statusTransitions.ts:
    // both clients render a Cancel button on MATCHED requests. A patient can be
    // transferred or sourced blood elsewhere after a donor accepted, and the hospital
    // must still be able to close the request.
    expect(canTransitionRequest('MATCHED', 'EXPIRED')).toBe(true)
  })

  it('rejects fulfilling a request that no donor has accepted', () => {
    expect(canTransitionRequest('PENDING', 'FULFILLED')).toBe(false)
  })

  it('treats FULFILLED and EXPIRED as terminal', () => {
    for (const terminal of ['FULFILLED', 'EXPIRED'] as RequestStatus[]) {
      expect(REQUEST_TRANSITIONS[terminal]).toEqual([])
      for (const to of ALL_REQUEST_STATUSES) {
        expect(canTransitionRequest(terminal, to)).toBe(false)
      }
    }
  })

  it('rejects reopening a fulfilled request', () => {
    expect(canTransitionRequest('FULFILLED', 'PENDING')).toBe(false)
    expect(canTransitionRequest('FULFILLED', 'MATCHED')).toBe(false)
  })
})

describe('status narrowing from untrusted input', () => {
  it('accepts every real status value', () => {
    for (const status of ALL_MATCH_STATUSES) expect(isMatchStatus(status)).toBe(true)
    for (const status of ALL_REQUEST_STATUSES) expect(isRequestStatus(status)).toBe(true)
  })

  it('rejects wrong-case and unknown strings', () => {
    expect(isMatchStatus('pending')).toBe(false)
    expect(isMatchStatus('ACCEPTED ')).toBe(false)
    expect(isMatchStatus('SUPER_ACCEPTED')).toBe(false)
    expect(isRequestStatus('fulfilled')).toBe(false)
    expect(isRequestStatus('')).toBe(false)
  })

  it('rejects non-string input from a request body', () => {
    for (const value of [null, undefined, 42, true, {}, [], ['PENDING']]) {
      expect(isMatchStatus(value)).toBe(false)
      expect(isRequestStatus(value)).toBe(false)
    }
  })

  it('rejects inherited Object prototype keys', () => {
    // The guards use hasOwnProperty rather than `in`/truthiness precisely so a body of
    // { status: "constructor" } cannot pass validation and then index the map to garbage.
    for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(isMatchStatus(key)).toBe(false)
      expect(isRequestStatus(key)).toBe(false)
    }
  })
})

describe('requestStatesLeadingTo', () => {
  it('derives the legal predecessors of each request state from the map', () => {
    expect(requestStatesLeadingTo('MATCHED')).toEqual(['PENDING'])
    expect(requestStatesLeadingTo('PENDING')).toEqual(['MATCHED'])
    expect(requestStatesLeadingTo('FULFILLED')).toEqual(['MATCHED'])
    expect(requestStatesLeadingTo('EXPIRED').sort()).toEqual(['MATCHED', 'PENDING'])
  })

  it('stays consistent with REQUEST_TRANSITIONS for every state', () => {
    for (const to of ALL_REQUEST_STATUSES) {
      for (const from of requestStatesLeadingTo(to)) {
        expect(canTransitionRequest(from, to)).toBe(true)
      }
      const excluded = ALL_REQUEST_STATUSES.filter(s => !requestStatesLeadingTo(to).includes(s))
      for (const from of excluded) {
        expect(canTransitionRequest(from, to)).toBe(false)
      }
    }
  })
})

describe('illegalTransitionMessage', () => {
  it('says a record is already terminal when nothing further is allowed', () => {
    expect(illegalTransitionMessage('match', 'COMPLETED', 'ACCEPTED')).toBe(
      'This match is already COMPLETED and cannot be changed further.'
    )
    expect(illegalTransitionMessage('request', 'EXPIRED', 'PENDING')).toBe(
      'This request is already EXPIRED and cannot be changed further.'
    )
  })

  it('names the current state and the allowed targets so a stale client can refetch', () => {
    expect(illegalTransitionMessage('match', 'PENDING', 'COMPLETED')).toBe(
      'Cannot change match status from PENDING to COMPLETED. Allowed from PENDING: ACCEPTED, DECLINED.'
    )
    expect(illegalTransitionMessage('request', 'PENDING', 'FULFILLED')).toBe(
      'Cannot change request status from PENDING to FULFILLED. Allowed from PENDING: MATCHED, EXPIRED.'
    )
  })
})
