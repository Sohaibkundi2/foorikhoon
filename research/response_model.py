"""
Response/outcome model.

This is the most important assumption in the whole study, and the one an
examiner will scrutinize hardest. It should be stated explicitly as a
MODELING ASSUMPTION in the paper, not presented as empirical fact, unless
literature is later found/cited to justify the exact weights.

Split into TWO stages, mirroring a real distinction the production system
now enforces (commitment score only rewards actual completion, not
acceptance):

  1. P(donor ACCEPTS the match | matched)
     - driven mostly by distance (convenience) and urgency (altruism)
     - commitment score has only a small influence here, since agreeing
       to help is a low-cost signal and not strongly predicted by past
       reliability

  2. P(donor actually SHOWS UP / completes | accepted)
     - driven mostly by commitment score (this is precisely what
       commitment score is supposed to predict) and distance (a donor
       who accepted from far away is more likely to flake than one
       nearby)
     - a donor who accepts but doesn't show up is a NO-SHOW, which in
       production costs -10 commitment and forces an escalation --
       modeling it explicitly here lets the simulation measure how much
       RWDP's reliability-weighting actually reduces no-shows, which is
       the core claim behind the RWDP research contribution

Both stages return probabilities in [0, 1] using simple, named, adjustable
weights (not a black box) so the model can be interrogated and refined
later, and so a reviewer can trace exactly why a number came out the way
it did.
"""

import math

# ---- Stage 1: acceptance ---------------------------------------------------
ACCEPT_DISTANCE_DECAY_KM = 40.0
ACCEPT_URGENCY_BONUS = {"ROUTINE": 0.0, "URGENT": 0.05, "CRITICAL": 0.10}
ACCEPT_BASE_RATE = 0.55
ACCEPT_COMMITMENT_WEIGHT = 0.10   # small influence -- saying yes is cheap
ACCEPT_NOISE_STD = 0.05

# ---- Stage 2: follow-through (show up / complete, given accepted) ---------
SHOWUP_BASE_RATE = 0.80          # most people who say yes do follow through
SHOWUP_COMMITMENT_WEIGHT = 0.45  # commitment score matters MUCH more here
SHOWUP_DISTANCE_DECAY_KM = 60.0  # weaker distance penalty than acceptance
SHOWUP_NOISE_STD = 0.05


def accept_probability(distance_km: float, commitment_score: float,
                        urgency: str, rng) -> float:
    distance_factor = math.exp(-distance_km / ACCEPT_DISTANCE_DECAY_KM)
    commitment_factor = (commitment_score / 100.0 - 0.5) * ACCEPT_COMMITMENT_WEIGHT
    urgency_factor = ACCEPT_URGENCY_BONUS.get(urgency, 0.0)
    noise = rng.gauss(0, ACCEPT_NOISE_STD)

    p = ACCEPT_BASE_RATE * distance_factor + commitment_factor + urgency_factor + noise
    return max(0.0, min(1.0, p))


def showup_probability(distance_km: float, commitment_score: float, rng) -> float:
    distance_factor = math.exp(-distance_km / SHOWUP_DISTANCE_DECAY_KM)
    commitment_factor = (commitment_score / 100.0 - 0.5) * SHOWUP_COMMITMENT_WEIGHT
    noise = rng.gauss(0, SHOWUP_NOISE_STD)

    p = SHOWUP_BASE_RATE * distance_factor + commitment_factor + noise
    return max(0.0, min(1.0, p))


def donor_outcome(distance_km: float, commitment_score: float,
                   urgency: str, rng) -> str:
    """
    Returns one of: 'DECLINED', 'NO_SHOW', 'COMPLETED'.

    A donor first decides whether to accept; if they accept, a second,
    independent draw decides whether they actually follow through.
    """
    if not (rng.random() < accept_probability(distance_km, commitment_score, urgency, rng)):
        return "DECLINED"

    if rng.random() < showup_probability(distance_km, commitment_score, rng):
        return "COMPLETED"

    return "NO_SHOW"
