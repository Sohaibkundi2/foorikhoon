"""
Synthetic donor population generator for the RWDP simulation study.

Generates a realistic donor population for Pakistan-context blood donation
matching, with blood-type distribution, geographic clustering around cities,
commitment history, and availability.
"""

import random
import math
from dataclasses import dataclass, field
from typing import List, Tuple

# Approximate blood-type distribution for Pakistan (commonly cited figures,
# similar to South Asian population studies). These should be replaced with
# a cited source in the final paper if a more precise figure is found.
BLOOD_TYPE_DISTRIBUTION = {
    "O_POS": 0.350,
    "A_POS": 0.290,
    "B_POS": 0.215,
    "AB_POS": 0.055,
    "O_NEG": 0.045,
    "A_NEG": 0.030,
    "B_NEG": 0.010,
    "AB_NEG": 0.005,
}

# City centers used to cluster synthetic donors/hospitals (approx lat/lng).
CITY_CENTERS = {
    "Peshawar": (34.0151, 71.5249),
    "D.I. Khan": (31.8313, 70.9021),
    "Lahore": (31.5497, 74.3436),
    "Karachi": (24.8607, 67.0011),
}


@dataclass
class Donor:
    id: int
    blood_group: str
    city: str
    latitude: float
    longitude: float
    commitment_score: float  # 0-100, mirrors production commitment score
    available: bool
    times_matched: int = 0
    times_responded: int = 0
    times_donated: int = 0


def _sample_blood_group(rng: random.Random) -> str:
    r = rng.random()
    cumulative = 0.0
    for group, p in BLOOD_TYPE_DISTRIBUTION.items():
        cumulative += p
        if r <= cumulative:
            return group
    return "O_POS"  # fallback for float rounding edge case


def _jitter_location(center: Tuple[float, float], rng: random.Random,
                      max_km: float = 15.0) -> Tuple[float, float]:
    """Scatter a point randomly within max_km of a city center."""
    lat0, lng0 = center
    # random distance (biased toward center via sqrt) and bearing
    distance_km = max_km * math.sqrt(rng.random())
    bearing = rng.random() * 2 * math.pi
    # ~111.32 km per degree latitude
    dlat = (distance_km * math.cos(bearing)) / 111.32
    dlng = (distance_km * math.sin(bearing)) / (111.32 * math.cos(math.radians(lat0)))
    return lat0 + dlat, lng0 + dlng


def generate_donors(n: int, seed: int = 42) -> List[Donor]:
    """
    Generate n synthetic donors.

    Commitment score is drawn from a distribution skewed toward the middle
    (most donors are moderately reliable; few are perfect or unreliable),
    using a Beta distribution scaled to 0-100.
    Availability: ~70% of donors available at any given simulated moment,
    matching the idea that donors are not always eligible (recent donation,
    travel, illness, etc).
    """
    rng = random.Random(seed)
    donors = []
    cities = list(CITY_CENTERS.keys())

    for i in range(n):
        blood_group = _sample_blood_group(rng)
        city = rng.choice(cities)
        lat, lng = _jitter_location(CITY_CENTERS[city], rng)

        # Beta(4,2) skews right (toward higher commitment) but keeps spread
        commitment_score = rng.betavariate(4, 2) * 100
        available = rng.random() < 0.70

        donors.append(Donor(
            id=i,
            blood_group=blood_group,
            city=city,
            latitude=lat,
            longitude=lng,
            commitment_score=round(commitment_score, 2),
            available=available,
        ))

    return donors
