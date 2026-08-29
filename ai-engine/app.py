
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except Exception:
    # fallback: define a no-op CORS if flask_cors isn't available
    def CORS(app, **kwargs):
        return None

app = Flask(__name__)
CORS(app)


COMPATIBLE_DONORS = {
    'A_POS':  ['A_POS', 'A_NEG'],
    'A_NEG':  ['A_NEG'],
    'B_POS':  ['B_POS', 'B_NEG'],
    'B_NEG':  ['B_NEG'],
    'AB_POS': ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS'],
    'AB_NEG': ['A_NEG', 'B_NEG', 'AB_NEG'],
    'O_POS':  ['O_POS'],
    'O_NEG':  ['O_NEG'],
}

VALID_BLOOD_GROUPS = frozenset(COMPATIBLE_DONORS)

MAX_RADIUS_KM = 100
MIN_MATCH_SCORE = 30


class ValidationError(Exception):
    """A malformed payload. Surfaced to the caller as HTTP 400, never as a 500."""

    def __init__(self, message):
        super().__init__(message)
        self.message = message


@app.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({'error': err.message}), 400


def _json_object():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ValidationError('Request body must be a JSON object')
    return body


def _require(container, key, where):
    if key not in container or container[key] is None:
        raise ValidationError("%s is missing required field '%s'" % (where, key))
    return container[key]


def _check_blood_group(value, where):
    if value not in VALID_BLOOD_GROUPS:
        raise ValidationError(
            '%s has unknown bloodGroup %r; expected one of %s'
            % (where, value, ', '.join(sorted(VALID_BLOOD_GROUPS)))
        )
    return value


def _check_number(value, where, key):
    # bool is a subclass of int in Python, so `True` would otherwise sail through
    # as the number 1 and quietly corrupt a count.
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(
            "%s field '%s' must be a number, got %s"
            % (where, key, type(value).__name__)
        )
    if value < 0:
        raise ValidationError("%s field '%s' must not be negative" % (where, key))
    return value


def validate_match_payload(body):
    """Return (donors, blood_request) or raise ValidationError."""
    donors = _require(body, 'donors', 'Request body')
    if not isinstance(donors, list):
        raise ValidationError("'donors' must be a list")

    blood_request = _require(body, 'request', 'Request body')
    if not isinstance(blood_request, dict):
        raise ValidationError("'request' must be a JSON object")
    _check_blood_group(_require(blood_request, 'bloodGroup', "'request'"), "'request'")

    for index, donor in enumerate(donors):
        where = 'donors[%d]' % index
        if not isinstance(donor, dict):
            raise ValidationError('%s must be a JSON object' % where)
        _require(donor, 'id', where)
        _check_blood_group(_require(donor, 'bloodGroup', where), where)

        available = _require(donor, 'isAvailable', where)
        if not isinstance(available, bool):
            raise ValidationError("%s field 'isAvailable' must be true or false" % where)

        _check_number(_require(donor, 'commitmentScore', where), where, 'commitmentScore')

        # distanceKm is optional: an absent distance is treated as the far edge of
        # the search radius, which scores no proximity credit.
        if donor.get('distanceKm') is not None:
            _check_number(donor['distanceKm'], where, 'distanceKm')

    return donors, blood_request


def validate_predict_payload(body):
    """Return the bloodStats list or raise ValidationError."""
    blood_stats = _require(body, 'bloodStats', 'Request body')
    if not isinstance(blood_stats, list):
        raise ValidationError("'bloodStats' must be a list")

    for index, stat in enumerate(blood_stats):
        where = 'bloodStats[%d]' % index
        if not isinstance(stat, dict):
            raise ValidationError('%s must be a JSON object' % where)
        _check_blood_group(_require(stat, 'bloodGroup', where), where)
        _check_number(_require(stat, 'requestCount', where), where, 'requestCount')
        _check_number(_require(stat, 'donorCount', where), where, 'donorCount')

    return blood_stats


def is_compatible(donor_group, requested_group):
    return donor_group in COMPATIBLE_DONORS.get(requested_group, ())


def calculate_score(donor, blood_request):
    score = 0
    requested_group = blood_request['bloodGroup']

    if donor['bloodGroup'] == requested_group:
        score += 50
    elif donor['bloodGroup'] in COMPATIBLE_DONORS.get(requested_group, []):
        score += 35

    distance = donor.get('distanceKm')
    if distance is None:
        distance = MAX_RADIUS_KM
    proximity_score = max(0, 30 * (1 - distance / MAX_RADIUS_KM))
    score += proximity_score

    if donor['isAvailable']:
        score += 20

    score += donor['commitmentScore'] * 0.5

    return score



@app.route('/')
def index():
    return jsonify({ 'message': 'ForiKhoon AI Engine running' })


@app.route('/ai/match', methods=['POST'])
def match():
    donors, blood_request = validate_match_payload(_json_object())
    requested_group = blood_request['bloodGroup']

    matches = []

    for donor in donors:

        if not is_compatible(donor['bloodGroup'], requested_group):
            continue

        score = calculate_score(donor, blood_request)

        if score > MIN_MATCH_SCORE:
            matches.append({
                'donorId': donor['id'],
                'score': score
            })

    # sort by score descending
    matches.sort(key=lambda x: x['score'], reverse=True)

    return jsonify({ 'matches': matches })


@app.route('/ai/predict', methods=['POST'])
def predict():
    blood_stats = validate_predict_payload(_json_object())

    predictions = []

    for stat in blood_stats:
        blood_group = stat['bloodGroup']
        requests_count = stat['requestCount']
        donors_count = stat['donorCount']

        ratio = requests_count / max(donors_count, 1)

        if ratio >= 0.8:
            risk = 'CRITICAL'
        elif ratio >= 0.5:
            risk = 'HIGH'
        elif ratio >= 0.3:
            risk = 'MODERATE'
        else:
            risk = 'LOW'
        
        predictions.append({
            'bloodGroup': blood_group,
            'requestCount': requests_count,
            'donorCount': donors_count,
            'ratio': round(ratio, 2),
            'risk': risk
        })
    
    # sort by ratio descending — highest risk first
    predictions.sort(key=lambda x: x['ratio'], reverse=True)
    
    return jsonify({ 'predictions': predictions })

if __name__ == '__main__':
    app.run(port=5001, debug=True)