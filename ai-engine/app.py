from flask import Flask, jsonify, request

app = Flask(__name__)


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

if __name__ == '__main__':
    app.run(port=5001, debug=True)