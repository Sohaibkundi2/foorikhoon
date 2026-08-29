"""
Behavioural audit of the ForiKhoon AI engine.

Loads ai-engine/app.py and drives the real route handlers through Flask's test
client. Both endpoints are pure functions of the POST body -- no server, no
database, no network -- so this exercises exactly the logic that is deployed.

    python ai-engine/tests/test_logic.py

Every check prints PASS or FAIL. A FAIL is a statement about the engine, not
about this file.
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
APP_PY = os.path.join(HERE, os.pardir, "app.py")

_spec = importlib.util.spec_from_file_location("forikhoon_ai_engine", APP_PY)
engine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(engine)

app = engine.app
# Deliberately NOT app.config['TESTING'] = True: that re-raises handler
# exceptions, and part of what is under test is what a caller actually receives
# when the payload is malformed.
client = app.test_client()


# ForiKhoon matching POLICY -- which donor groups may be offered for each request.
#
# This is the platform's own matrix, and it is intentionally narrower than clinical
# red-blood-cell compatibility: O_NEG and AB_NEG are never offered as cross-type
# donors, only ever to a request of their own group. An earlier revision of this file
# asserted clinical universal-donor rules and therefore failed against correct code;
# the policy is the reference now.
#
# This table is written out longhand rather than read from engine.COMPATIBLE_DONORS
# on purpose. Comparing the module against itself would always pass and prove
# nothing -- spelling it out means any future edit to the engine's matrix fails here
# and has to be an explicit decision, in both this file and
# backend/src/lib/compatibility.ts, which holds the same matrix as a hard pre-filter.
POLICY = {
    "A_POS":  {"A_POS", "A_NEG"},
    "A_NEG":  {"A_NEG"},
    "B_POS":  {"B_POS", "B_NEG"},
    "B_NEG":  {"B_NEG"},
    "AB_POS": {"A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS"},
    "AB_NEG": {"A_NEG", "B_NEG", "AB_NEG"},
    "O_POS":  {"O_POS"},
    "O_NEG":  {"O_NEG"},
}
GROUPS = list(POLICY)

_results = []


def check(name, ok, detail=""):
    _results.append((name, ok))
    print(("  PASS  " if ok else "  FAIL  ") + name)
    if detail and not ok:
        for line in str(detail).splitlines():
            print("           " + line)


def section(title):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


def donor(did, group, distance=0.0, available=True, commitment=0):
    return {
        "id": did,
        "bloodGroup": group,
        "distanceKm": distance,
        "isAvailable": available,
        "commitmentScore": commitment,
    }


def match(donors, recipient):
    r = client.post("/ai/match", json={"donors": donors,
                                       "request": {"bloodGroup": recipient}})
    return r.status_code, r.get_json(silent=True)


def predict(stats):
    r = client.post("/ai/predict", json={"bloodStats": stats})
    return r.status_code, r.get_json(silent=True)


def compat_credit(recipient, donor_group):
    """
    The compatibility component of the score, isolated.

    At distanceKm=0 the proximity term is a full 30 and availability adds 20,
    with commitmentScore=0 contributing nothing -- so score - 50 is whatever
    calculate_score awarded for blood-group compatibility alone. Returns None if
    the donor was filtered out before scoring.
    """
    _, body = match([donor("probe", donor_group)], recipient)
    if not body or not body.get("matches"):
        return None
    return body["matches"][0]["score"] - 50.0


# --------------------------------------------------------------------------
section("1. COMPATIBLE_DONORS matches the documented platform policy")

for recipient in GROUPS:
    listed = set(engine.COMPATIBLE_DONORS.get(recipient, []))
    expected = POLICY[recipient]
    missing = sorted(expected - listed)
    extra = sorted(listed - expected)
    detail = []
    if missing:
        detail.append("policy allows but table omits: " + ", ".join(missing))
    if extra:
        detail.append("table allows but policy does not: " + ", ".join(extra))
    detail.append("if this change was deliberate, update POLICY here AND")
    detail.append("backend/src/lib/compatibility.ts to match.")
    check(f"{recipient} donor list equals policy", not missing and not extra,
          "\n".join(detail))


# --------------------------------------------------------------------------
section("2. SAFETY -- blood group is a hard gate, not a scoring bonus")

for recipient in GROUPS:
    for bad in sorted(g for g in GROUPS if g not in POLICY[recipient]):
        _, body = match([donor("unsafe", bad)], recipient)
        offered = [m["donorId"] for m in (body or {}).get("matches", [])]
        ok = "unsafe" not in offered
        score = body["matches"][0]["score"] if offered else None
        check(f"{recipient} request rejects a {bad} donor", ok,
              f"donor was returned with score {score}. Compatibility contributes 0,\n"
              f"but proximity 30 + availability 20 clear the score > 30 gate on their\n"
              f"own -- so the group must be filtered before scoring, not by threshold.")

# A distant, incompatible, but highly committed donor must also be rejected.
_, body = match([donor("far-unsafe", "A_POS", distance=100.0, commitment=22)], "O_NEG")
offered = [m["donorId"] for m in (body or {}).get("matches", [])]
check("O_NEG request rejects a 100km-away incompatible donor",
      "far-unsafe" not in offered,
      "score = 0 compatibility + 0 proximity + 20 available + 11 commitment = 31 > 30")

# The gate must not be so aggressive that it drops a legitimate worst-case donor:
# compatible but far away, unavailable, and with no commitment history.
_, body = match([donor("weakest", "A_NEG", distance=100.0, available=False)], "A_POS")
offered = [m["donorId"] for m in (body or {}).get("matches", [])]
check("A_POS request still offers a compatible far/unavailable donor",
      "weakest" in offered,
      "35 compatibility + 0 proximity + 0 availability = 35, which must clear the gate")


# --------------------------------------------------------------------------
section("3. SCORING -- compatibility credit for every policy-permitted pair")

for recipient in GROUPS:
    for dg in sorted(POLICY[recipient]):
        credit = compat_credit(recipient, dg)
        expected = 50.0 if dg == recipient else 35.0
        ok = credit == expected
        check(f"{recipient} <- {dg}: credit {expected:g}", ok,
              f"got {credit}; this pair is permitted by policy so it must be scored")


# --------------------------------------------------------------------------
section("4. RANKING")

# For an O_NEG request only an O_NEG donor is permitted. Give the excluded donor a
# commitment score so it would outrank the valid one if it were scored at all.
_, body = match([
    donor("excluded-A_POS", "A_POS", commitment=20),
    donor("valid-O_NEG", "O_NEG", commitment=0),
], "O_NEG")
order = [m["donorId"] for m in (body or {}).get("matches", [])]
check("O_NEG request returns only the permitted donor",
      order == ["valid-O_NEG"],
      f"order was {order}")

# Two donors permitted for the same request, neither an exact type match, must be
# credited alike -- neither group is preferred over the other.
credit_a = compat_credit("AB_POS", "A_NEG")
credit_b = compat_credit("AB_POS", "B_NEG")
check("AB_POS request credits A_NEG and B_NEG donors equally",
      credit_a == credit_b,
      f"A_NEG donor got {credit_a}, B_NEG donor got {credit_b}")

# An exact type match outranks a merely-permitted one, all else equal.
_, body = match([
    donor("compatible", "A_NEG"),
    donor("exact", "AB_POS"),
], "AB_POS")
order = [m["donorId"] for m in (body or {}).get("matches", [])]
check("AB_POS request ranks an exact-type donor above a cross-type donor",
      order[:1] == ["exact"],
      f"order was {order} (50 credit vs 35)")

# Pins the policy itself: O_NEG is withheld from non-O_NEG requests by design.
credit_o = compat_credit("A_POS", "O_NEG")
check("A_POS request withholds an O_NEG donor (deliberate policy)",
      credit_o is None,
      f"an O_NEG donor was offered with credit {credit_o}; O_NEG is reserved for "
      f"O_NEG requests")


# --------------------------------------------------------------------------
section("5. SHORTAGE PREDICTION -- /ai/predict")

_, body = predict([{"bloodGroup": "A_NEG", "requestCount": 0, "donorCount": 0}])
p = body["predictions"][0]
check("0 requests / 0 donors is not reported CRITICAL",
      p["risk"] != "CRITICAL",
      f"got risk={p['risk']} ratio={p['ratio']}. A group nobody has asked for must "
      f"not raise an alarm;\notherwise every group reads CRITICAL and the signal "
      f"carries no information.")

_, body = predict([{"bloodGroup": "A_NEG", "requestCount": 1, "donorCount": 0}])
p = body["predictions"][0]
check("1 request / 0 donors is CRITICAL",
      p["risk"] == "CRITICAL",
      f"got risk={p['risk']} ratio={p['ratio']}; an unfillable request is critical")

_, body = predict([
    {"bloodGroup": "O_NEG", "requestCount": 12, "donorCount": 3},   # ratio 4.0
    {"bloodGroup": "A_POS", "requestCount": 50, "donorCount": 0},   # far worse
])
order = [x["bloodGroup"] for x in body["predictions"]]
check("50 unmet requests outranks 12 requests against 3 donors",
      order[0] == "A_POS",
      f"order was {order}. The landing page shows only the first three, so a group "
      f"with no donors\nat all must not sort below one that has some.")

_, body = predict([
    {"bloodGroup": "A_POS", "requestCount": 1,  "donorCount": 0},
    {"bloodGroup": "B_POS", "requestCount": 99, "donorCount": 0},
])
ratios = {x["bloodGroup"]: x["ratio"] for x in body["predictions"]}
check("99 unmet requests scores worse than 1 unmet request",
      ratios["B_POS"] > ratios["A_POS"],
      f"both collapsed to the same ratio: {ratios}")

# Severity must be monotonic across a run of zero-donor groups, not flat.
_, body = predict([
    {"bloodGroup": "A_POS",  "requestCount": 2,  "donorCount": 0},
    {"bloodGroup": "B_POS",  "requestCount": 40, "donorCount": 0},
    {"bloodGroup": "AB_POS", "requestCount": 7,  "donorCount": 0},
])
order = [x["bloodGroup"] for x in body["predictions"]]
check("zero-donor groups are ordered by unmet demand",
      order == ["B_POS", "AB_POS", "A_POS"],
      f"order was {order}, expected B_POS (40), AB_POS (7), A_POS (2)")

for req, don, expected in [
    (8, 10, "CRITICAL"), (7, 10, "HIGH"), (5, 10, "HIGH"),
    (4, 10, "MODERATE"), (3, 10, "MODERATE"), (2, 10, "LOW"), (0, 10, "LOW"),
]:
    _, body = predict([{"bloodGroup": "A_POS", "requestCount": req, "donorCount": don}])
    got = body["predictions"][0]["risk"]
    check(f"{req} requests / {don} donors (ratio {req / don:g}) -> {expected}",
          got == expected, f"got {got}")


# --------------------------------------------------------------------------
section("6. MALFORMED INPUT -- 400 with a message, never a 500")


def probe(label, path, expect, **kwargs):
    try:
        r = client.post(path, **kwargs)
        code = r.status_code
        payload = r.get_json(silent=True) or {}
    except Exception as exc:                      # noqa: BLE001
        check(label, False, f"handler raised {type(exc).__name__}: {exc}")
        return
    ok = code == expect and ("error" in payload if expect == 400 else True)
    check(f"{label} -> {expect}", ok,
          f"got HTTP {code} {payload}; a caller cannot tell a bad payload from an "
          f"engine fault")


probe("POST /ai/predict with no bloodStats key", "/ai/predict", 400, json={})
probe("POST /ai/predict with a stat missing its counts", "/ai/predict", 400,
      json={"bloodStats": [{"bloodGroup": "A_POS"}]})
probe("POST /ai/predict with an unknown blood group", "/ai/predict", 400,
      json={"bloodStats": [{"bloodGroup": "NOT_A_GROUP",
                            "requestCount": 5, "donorCount": 1}]})
probe("POST /ai/predict with a negative count", "/ai/predict", 400,
      json={"bloodStats": [{"bloodGroup": "A_POS",
                            "requestCount": -3, "donorCount": 1}]})
probe("POST /ai/predict with bloodStats not a list", "/ai/predict", 400,
      json={"bloodStats": {"bloodGroup": "A_POS"}})

probe("POST /ai/match with no donors key", "/ai/match", 400,
      json={"request": {"bloodGroup": "A_POS"}})
probe("POST /ai/match with no request key", "/ai/match", 400,
      json={"donors": []})
probe("POST /ai/match with a donor missing isAvailable", "/ai/match", 400,
      json={"donors": [{"id": "x", "bloodGroup": "A_POS", "commitmentScore": 0}],
            "request": {"bloodGroup": "A_POS"}})
probe("POST /ai/match with a donor missing id", "/ai/match", 400,
      json={"donors": [{"bloodGroup": "A_POS", "isAvailable": True,
                        "commitmentScore": 0}],
            "request": {"bloodGroup": "A_POS"}})
probe("POST /ai/match with an unknown request blood group", "/ai/match", 400,
      json={"donors": [], "request": {"bloodGroup": "NOT_A_GROUP"}})
probe("POST /ai/match with an unknown donor blood group", "/ai/match", 400,
      json={"donors": [donor("x", "NOT_A_GROUP")],
            "request": {"bloodGroup": "A_POS"}})
probe("POST /ai/match with a non-object body", "/ai/match", 400, json=[1, 2, 3])

# An empty donor list is a legitimate request, not an error.
status, body = match([], "A_POS")
check("POST /ai/match with an empty donor list -> 200 and no matches",
      status == 200 and body == {"matches": []},
      f"got HTTP {status} {body}")

# A donor with no distanceKm at all is legitimate -- it scores no proximity credit.
status, body = client.post("/ai/match", json={
    "donors": [{"id": "nodist", "bloodGroup": "A_POS",
                "isAvailable": True, "commitmentScore": 0}],
    "request": {"bloodGroup": "A_POS"}
}).status_code, None
check("POST /ai/match with a donor missing distanceKm -> 200",
      status == 200, f"got HTTP {status}")


# --------------------------------------------------------------------------
passed = sum(1 for _, ok in _results if ok)
failed = len(_results) - passed
print("\n" + "=" * 78)
print(f"{len(_results)} checks: {passed} passed, {failed} failed")
print("=" * 78)
