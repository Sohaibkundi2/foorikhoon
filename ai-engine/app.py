
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except Exception:
    # fallback: define a no-op CORS if flask_cors isn't available
    def CORS(app, **kwargs):
        return None

app = Flask(__name__)
CORS(app)


# Recipient blood group -> donor blood groups that can safely donate to them
COMPATIBLE_DONORS = {
    'A_POS':  ['A_POS', 'A_NEG', 'O_POS', 'O_NEG'],
    'A_NEG':  ['A_NEG', 'O_NEG'],
    'B_POS':  ['B_POS', 'B_NEG', 'O_POS', 'O_NEG'],
    'B_NEG':  ['B_NEG', 'O_NEG'],
    'AB_POS': ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'],  # universal recipient
    'AB_NEG': ['A_NEG', 'B_NEG', 'AB_NEG', 'O_NEG'],
    'O_POS':  ['O_POS', 'O_NEG'],
    'O_NEG':  ['O_NEG'],  # universal donor, but only receives from O_NEG
}

RARE_DONOR_TYPES = {'O_NEG', 'AB_NEG'}


def calculate_score(donor, blood_request):
    score = 0
    requested_group = blood_request['bloodGroup']
    is_emergency = blood_request.get('urgency') in ('CRITICAL')

    if donor['bloodGroup'] == requested_group:
        score += 50
    elif donor['bloodGroup'] in COMPATIBLE_DONORS.get(requested_group, []):
        score += 35   # compatible but not exact type — ranked slightly lower

    if donor['city'] == blood_request['city']:
        score += 30

    if donor['isAvailable']:
        score += 20

    score += donor['commitmentScore'] * 0.5

    # Reservation layer: don't burn rare donors on non-emergency requests
    # they aren't an exact match for
    if (donor['bloodGroup'] in RARE_DONOR_TYPES
            and donor['bloodGroup'] != requested_group
            and not is_emergency):
        score -= 25

    return score



@app.route('/')
def index():
    return jsonify({ 'message': 'ForiKhoon AI Engine running' })


@app.route('/ai/match', methods=['POST'])
def match():
    data = request.json
    donors = data['donors']
    blood_request = data['request']
    
    matches = []
    
    for donor in donors:
        score = calculate_score(donor, blood_request)
        
        if score > 30:
            matches.append({
                'donorId': donor['id'],
                'score': score
            })
    
    # sort by score descending
    matches.sort(key=lambda x: x['score'], reverse=True)
    
    return jsonify({ 'matches': matches })


@app.route('/ai/predict', methods=['POST'])
def predict():
    data = request.json
    blood_stats = data['bloodStats']  # list of { bloodGroup, requestCount, donorCount }
    
    predictions = []
    
    for stat in blood_stats:
        blood_group = stat['bloodGroup']
        requests_count = stat['requestCount']
        donors_count = stat['donorCount']
        
        # shortage ratio
        if donors_count == 0:
            ratio = 1.0  # no donors at all = critical
        else:
            ratio = requests_count / donors_count
        
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