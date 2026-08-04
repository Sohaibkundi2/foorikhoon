"""
Mirrors backend/src/lib/compatibility.ts and distance.ts so the simulation
tests the SAME matching rules that ship in production, not an approximation.
"""

import math

COMPATIBLE_DONOR_GROUPS = {
    "A_POS": ["A_POS", "A_NEG"],
    "A_NEG": ["A_NEG"],
    "B_POS": ["B_POS", "B_NEG"],
    "B_NEG": ["B_NEG"],
    "AB_POS": ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG"],
    "AB_NEG": ["A_NEG", "B_NEG", "AB_NEG"],
    "O_POS": ["O_POS"],
    "O_NEG": ["O_NEG"],
}

RADIUS_TIERS_KM = [10, 25, 50, 100]


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def is_compatible(request_group: str, donor_group: str) -> bool:
    return donor_group in COMPATIBLE_DONOR_GROUPS.get(request_group, [])
