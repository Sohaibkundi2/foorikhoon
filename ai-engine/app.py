
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except Exception:
    # fallback: define a no-op CORS if flask_cors isn't available
    def CORS(app, **kwargs):
        return None

app = Flask(__name__)
CORS(app)


def calculate_score(donor, blood_request):
    score = 0
    
    # 1. blood group match → most important
    if donor['bloodGroup'] == blood_request['bloodGroup']:
        score += 50
    
    if donor['city'] == blood_request['city']: 
        score += 30
    
    if donor['isAvailable']:
        score += 20

    # bonus
    score += donor['commitmentScore'] * 0.5
    
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