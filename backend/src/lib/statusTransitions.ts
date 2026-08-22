import { MatchStatus, RequestStatus } from '../../prisma/generated'

/**
 * Legal status transitions, centralised so every write site enforces the same rules.
 *
 * Why this exists: `status` / `newStatus` arrive in request bodies and were previously
 * written straight to the database. That let a client move a record to any state at any
 * time — re-declining an accepted match, un-fulfilling a completed request, or jumping
 * a match from PENDING directly to COMPLETED to mint a hero certificate without a
 * hospital ever confirming the donation. Because the commitment score that RWDP ranks
 * donors by only moves on confirmed outcomes, a forged transition doesn't just corrupt
 * one row, it poisons the matching signal for every future request.
 *
 * These live in one module for the same reason donor eligibility lives in
 * `donorMatching.ts`: there are six separate call sites, and duplicated rules drift.
 *
 * The `Record<...>` annotations are load-bearing. If someone adds a value to either
 * enum in the schema and doesn't add it here, this file stops compiling — which is
 * exactly the reminder you want, rather than a silently unreachable state.
 */

/** PENDING is where a match starts; DECLINED, NO_SHOW and COMPLETED are terminal. */
export const MATCH_TRANSITIONS: Record<MatchStatus, readonly MatchStatus[]> = {
  PENDING: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['COMPLETED', 'NO_SHOW'],
  DECLINED: [],
  NO_SHOW: [],
  COMPLETED: []
}

/**
 * MATCHED can go back to PENDING: that is the escalation path, used when the matched
 * donor declines or no-shows and the request is returned to the pool for re-matching.
 * FULFILLED and EXPIRED are terminal.
 *
 * DEVIATION FROM SPEC — MATCHED -> EXPIRED. The spec for this map listed MATCHED as going
 * only to PENDING and FULFILLED. Adding EXPIRED, because both clients already render a
 * Cancel button on MATCHED requests (`frontend/src/app/hospital/requests/page.tsx:253`,
 * and via `canAct` at `mobile/app/hospital/requests.tsx:185`) and it sends
 * `newStatus: 'EXPIRED'`. Omitting it would 400 that button. The flow is legitimate and
 * clinically necessary — a patient can be transferred, sourced blood elsewhere, or die
 * after a donor has accepted, and the hospital must still be able to close the request.
 * Note this is only reachable through the hospital's own ownership-checked endpoint. The
 * expiry cron must NOT pick it up: adding EXPIRED here makes MATCHED a legal predecessor,
 * so a job deriving its filter from `requestStatesLeadingTo('EXPIRED')` would begin
 * auto-expiring requests that already have a donor en route. `jobs/expiry.job.ts`
 * therefore pins `status: 'PENDING'` explicitly — its rule is deliberately narrower than
 * this map. If you add another timer that expires requests, do the same.
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  PENDING: ['MATCHED', 'EXPIRED'],
  MATCHED: ['PENDING', 'FULFILLED', 'EXPIRED'],
  FULFILLED: [],
  EXPIRED: []
}

/** Narrows an untrusted request-body value to a real MatchStatus. */
export const isMatchStatus = (value: unknown): value is MatchStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(MATCH_TRANSITIONS, value)

/** Narrows an untrusted request-body value to a real RequestStatus. */
export const isRequestStatus = (value: unknown): value is RequestStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REQUEST_TRANSITIONS, value)

export const canTransitionMatch = (from: MatchStatus, to: MatchStatus): boolean =>
  MATCH_TRANSITIONS[from].includes(to)

export const canTransitionRequest = (from: RequestStatus, to: RequestStatus): boolean =>
  REQUEST_TRANSITIONS[from].includes(to)

/**
 * The states a request can legally move to `to` from — derived from the map above, so it
 * cannot drift from it.
 *
 * Use this for the server's own idempotent writes, as the `status` filter of an
 * `updateMany`. Expressing the rule as a WHERE clause makes the check atomic: with a
 * read-then-write, two donors accepting the same request at the same moment can both pass
 * a `canTransitionRequest` check before either writes. Passing it to the database instead
 * means the second update simply matches zero rows.
 */
export const requestStatesLeadingTo = (to: RequestStatus): RequestStatus[] =>
  (Object.keys(REQUEST_TRANSITIONS) as RequestStatus[])
    .filter((from) => REQUEST_TRANSITIONS[from].includes(to))

/**
 * Shared wording for the 400 returned on an illegal transition. Naming the current state
 * matters: the usual cause is a stale client acting on a record someone else already
 * moved, and "from X to Y" tells the caller to refetch rather than retry.
 */
export const illegalTransitionMessage = (
  entity: 'match' | 'request',
  from: string,
  to: string
): string => {
  const allowed =
    entity === 'match'
      ? MATCH_TRANSITIONS[from as MatchStatus]
      : REQUEST_TRANSITIONS[from as RequestStatus]

  if (!allowed || allowed.length === 0) {
    return `This ${entity} is already ${from} and cannot be changed further.`
  }
  return `Cannot change ${entity} status from ${from} to ${to}. Allowed from ${from}: ${allowed.join(', ')}.`
}
