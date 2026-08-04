"""
RWDP (production algorithm) vs baseline matching strategies.

Both algorithms share the same underlying donor pool, compatibility rules,
and outcome model -- the only thing that differs is HOW a donor is
selected/prioritized and escalated to. This isolates the effect of the
matching strategy itself, which is the actual research question.

Donor commitment scores are now updated DURING the simulation (not static),
mirroring production exactly: DECLINED -> -5, NO_SHOW -> -10,
COMPLETED -> +10, clamped to [0, 100]. This matters for the research
question itself -- RWDP's core claim is that weighting by commitment
score improves reliability over time, which can only show up if scores
actually evolve as donors behave (or misbehave) repeatedly across many
requests in a trial.
"""

import random
from dataclasses import dataclass
from typing import List, Optional

from compatibility import is_compatible, haversine_km, RADIUS_TIERS_KM
from response_model import donor_outcome

MAX_ATTEMPTS_PER_REQUEST = 8  # cap on donors tried before declaring "unfulfilled"

DECLINE_PENALTY = 5
NO_SHOW_PENALTY = 10
COMPLETE_BONUS = 10


@dataclass
class MatchOutcome:
    request_id: int
    fulfilled: bool          # True only if a donor actually COMPLETED
    attempts: int
    donors_contacted: List[int]
    no_shows: int
    final_radius_km: Optional[float]


def _apply_commitment_change(donor, delta):
    donor.commitment_score = max(0.0, min(100.0, donor.commitment_score + delta))


def _candidates_within_radius(donors, request, radius_km, excluded_ids):
    out = []
    for d in donors:
        if d.id in excluded_ids or not d.available:
            continue
        if not is_compatible(request.blood_group, d.blood_group):
            continue
        dist = haversine_km(request.latitude, request.longitude, d.latitude, d.longitude)
        if dist <= radius_km:
            out.append((d, dist))
    return out


def _rwdp_score(donor, distance_km, request_group):
    exact = donor.blood_group == request_group
    score = 50 if exact else 35
    proximity = max(0.0, 30 * (1 - distance_km / 100.0))
    score += proximity
    score += 20  # availability already filtered, so always eligible here
    score += donor.commitment_score * 0.5
    return score


def _try_donor(donor, dist, request, rng) -> str:
    """Runs one donor through the outcome model and applies the matching
    commitment-score change, mirroring production exactly."""
    donor.times_matched += 1
    outcome = donor_outcome(dist, donor.commitment_score, request.urgency, rng)

    if outcome == "DECLINED":
        _apply_commitment_change(donor, -DECLINE_PENALTY)
    elif outcome == "NO_SHOW":
        _apply_commitment_change(donor, -NO_SHOW_PENALTY)
        donor.times_responded += 1  # they did respond (accepted), just didn't show
    elif outcome == "COMPLETED":
        _apply_commitment_change(donor, +COMPLETE_BONUS)
        donor.times_responded += 1
        donor.times_donated += 1

    return outcome


def run_rwdp(donors, request, rng: random.Random) -> MatchOutcome:
    excluded = set()
    attempts = 0
    contacted = []
    no_shows = 0
    final_radius = None

    for radius in RADIUS_TIERS_KM:
        candidates = _candidates_within_radius(donors, request, radius, excluded)
        if not candidates:
            continue
        scored = sorted(
            candidates,
            key=lambda pair: _rwdp_score(pair[0], pair[1], request.blood_group),
            reverse=True,
        )
        for donor, dist in scored:
            if attempts >= MAX_ATTEMPTS_PER_REQUEST:
                return MatchOutcome(request.id, False, attempts, contacted, no_shows, final_radius)
            attempts += 1
            contacted.append(donor.id)
            excluded.add(donor.id)
            final_radius = radius

            outcome = _try_donor(donor, dist, request, rng)
            if outcome == "COMPLETED":
                return MatchOutcome(request.id, True, attempts, contacted, no_shows, final_radius)
            if outcome == "NO_SHOW":
                no_shows += 1
            # DECLINED or NO_SHOW -> escalate to next candidate, same as production
        # tier exhausted with no completion -> widen radius

    return MatchOutcome(request.id, False, attempts, contacted, no_shows, final_radius)


def run_baseline_random(donors, request, rng: random.Random,
                         max_radius_km: float = 100.0) -> MatchOutcome:
    """
    Baseline: among all compatible, available donors within a fixed max
    radius, contact in RANDOM order (no scoring, no tiered escalation)
    until one completes or attempts are exhausted.
    """
    candidates = _candidates_within_radius(donors, request, max_radius_km, set())
    rng.shuffle(candidates)

    attempts = 0
    contacted = []
    no_shows = 0
    excluded = set()

    for donor, dist in candidates:
        if attempts >= MAX_ATTEMPTS_PER_REQUEST:
            break
        if donor.id in excluded:
            continue
        attempts += 1
        contacted.append(donor.id)
        excluded.add(donor.id)

        outcome = _try_donor(donor, dist, request, rng)
        if outcome == "COMPLETED":
            return MatchOutcome(request.id, True, attempts, contacted, no_shows, max_radius_km)
        if outcome == "NO_SHOW":
            no_shows += 1

    return MatchOutcome(request.id, False, attempts, contacted, no_shows,
                         max_radius_km if candidates else None)


def run_baseline_exact_match_only(donors, request, rng: random.Random,
                                   max_radius_km: float = 100.0) -> MatchOutcome:
    """
    Baseline mirroring the OLD V1 logic: exact blood-type match only
    (no compatibility matrix), nearest-first, no escalation tiers.
    """
    candidates = []
    for d in donors:
        if not d.available:
            continue
        if d.blood_group != request.blood_group:
            continue
        dist = haversine_km(request.latitude, request.longitude, d.latitude, d.longitude)
        if dist <= max_radius_km:
            candidates.append((d, dist))

    candidates.sort(key=lambda pair: pair[1])  # nearest first

    attempts = 0
    contacted = []
    no_shows = 0

    for donor, dist in candidates:
        if attempts >= MAX_ATTEMPTS_PER_REQUEST:
            break
        attempts += 1
        contacted.append(donor.id)

        outcome = _try_donor(donor, dist, request, rng)
        if outcome == "COMPLETED":
            return MatchOutcome(request.id, True, attempts, contacted, no_shows, max_radius_km)
        if outcome == "NO_SHOW":
            no_shows += 1

    return MatchOutcome(request.id, False, attempts, contacted, no_shows,
                         max_radius_km if candidates else None)
