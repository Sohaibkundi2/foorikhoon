"""
Synthetic blood request stream generator.

Requests are drawn from a demand distribution that differs from the donor
supply distribution -- O_POS and B_POS are requested disproportionately
often relative to population share (reflecting real hospital demand
patterns), while rare types (O_NEG, AB_NEG) are requested less often in
absolute terms but are clinically critical when they occur.
"""

import random
from dataclasses import dataclass
from typing import List, Tuple

from population import CITY_CENTERS, _jitter_location

# Relative demand weighting (not required to sum to 1 -- normalized internally).
# Derived as a simple adjustment on top of population share to reflect that
# O_POS is the most commonly requested type in real hospital transfusion data.
REQUEST_DEMAND_WEIGHTS = {
    "O_POS": 0.40,
    "A_POS": 0.22,
    "B_POS": 0.18,
    "AB_POS": 0.03,
    "O_NEG": 0.08,
    "A_NEG": 0.04,
    "B_NEG": 0.03,
    "AB_NEG": 0.02,
}

URGENCY_LEVELS = ["ROUTINE", "URGENT", "CRITICAL"]
URGENCY_WEIGHTS = [0.55, 0.30, 0.15]


@dataclass
class BloodRequest:
    id: int
    blood_group: str
    urgency: str
    hospital_city: str
    latitude: float
    longitude: float
    timestamp: int  # simulated tick, for ordering only


def _sample_weighted(rng: random.Random, weights: dict) -> str:
    total = sum(weights.values())
    r = rng.random() * total
    cumulative = 0.0
    for key, w in weights.items():
        cumulative += w
        if r <= cumulative:
            return key
    return list(weights.keys())[-1]


def generate_requests(n: int, seed: int = 99) -> List[BloodRequest]:
    rng = random.Random(seed)
    cities = list(CITY_CENTERS.keys())
    requests = []

    for i in range(n):
        blood_group = _sample_weighted(rng, REQUEST_DEMAND_WEIGHTS)
        urgency = rng.choices(URGENCY_LEVELS, weights=URGENCY_WEIGHTS, k=1)[0]
        city = rng.choice(cities)
        lat, lng = _jitter_location(CITY_CENTERS[city], rng, max_km=8.0)

        requests.append(BloodRequest(
            id=i,
            blood_group=blood_group,
            urgency=urgency,
            hospital_city=city,
            latitude=lat,
            longitude=lng,
            timestamp=i,
        ))

    return requests
