# RWDP Simulation Study — How to Run

## Setup (one time)
```bash
pip install scipy numpy
```

## Run
```bash
python3 simulate.py
```

This runs 30 trials each across three donor-supply scenarios (abundant,
moderate, scarce), comparing:
- RWDP (your actual production matching algorithm)
- Random baseline (no scoring)
- Exact-match-only baseline (your old V1 logic)

## Files
- `population.py`    — generates synthetic donors (blood type, location, commitment score)
- `requests.py`       — generates synthetic blood requests (demand pattern, urgency)
- `compatibility.py`  — mirrors your real compatibility matrix + distance logic
- `response_model.py` — models whether a donor accepts, then whether they actually
                         show up (no-show) or complete the donation
- `algorithms.py`     — RWDP + the two baselines being compared
- `simulate.py`       — runs everything, prints results with statistical tests

## What you can change yourself
- `simulate.py`: `N_TRIALS`, `N_REQUESTS`, `SCENARIOS` (donor counts to test)
- `response_model.py`: the weights (`ACCEPT_*`, `SHOWUP_*` constants) — these
  are the modeling assumptions you'll need to explain/justify in your paper
- `population.py`: `BLOOD_TYPE_DISTRIBUTION`, `CITY_CENTERS`
