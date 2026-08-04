"""
Runs the RWDP vs baseline comparison over many trials, across multiple
donor-supply scenarios (abundant / moderate / scarce), comparing RWDP
against two baselines: pure random selection and the old exact-match-only
(V1) logic.

Each trial:
  1. Generates a fresh synthetic donor population and request stream
     (same population/requests reused across all 3 algorithms for a
     fair, paired comparison -- differences are due to the algorithm,
     not random population variation).
  2. Runs each algorithm over the full request stream, sequentially,
     against its OWN independent copy of the donor pool (so donor
     state -- including commitment score, which now evolves during
     the trial -- doesn't leak between algorithms being compared).
  3. Records per-trial aggregate metrics for each algorithm.

Run with: python3 simulate.py
"""

import copy
import random
import statistics
from scipy import stats as scipy_stats

from population import generate_donors
from requests import generate_requests
from algorithms import run_rwdp, run_baseline_random, run_baseline_exact_match_only

N_TRIALS = 30
N_REQUESTS = 300

# Donor-supply scenarios: (label, donor count). Abundant is the original
# setup, which showed a ceiling effect on fulfillment rate (RWDP and random
# looked statistically similar because almost every request was fulfillable
# regardless of ordering). Moderate and scarce test whether RWDP's advantage
# becomes visible once supply is tighter and donor SELECTION actually matters.
SCENARIOS = [
    ("abundant", 800),
    ("moderate", 300),
    ("scarce", 150),
]

ALGORITHMS = [
    ("RWDP", run_rwdp),
    ("Random Baseline", run_baseline_random),
    ("Exact-Match-Only Baseline", run_baseline_exact_match_only),
]


def run_trial(trial_seed: int, n_donors: int):
    donors_master = generate_donors(n_donors, seed=trial_seed)
    requests = generate_requests(N_REQUESTS, seed=trial_seed + 10_000)

    results = {}
    for algo_name, algo_fn in ALGORITHMS:
        donors = copy.deepcopy(donors_master)
        rng = random.Random(trial_seed + hash(algo_name) % 10_000)

        fulfilled = 0
        total_attempts = 0
        total_contacted = 0
        total_no_shows = 0

        for req in requests:
            outcome = algo_fn(donors, req, rng)
            if outcome.fulfilled:
                fulfilled += 1
            total_attempts += outcome.attempts
            total_contacted += len(outcome.donors_contacted)
            total_no_shows += outcome.no_shows

        max_donor_load = max((d.times_matched for d in donors), default=0)
        donors_used_at_all = sum(1 for d in donors if d.times_matched > 0)

        results[algo_name] = {
            "fulfillment_rate": fulfilled / N_REQUESTS,
            "avg_attempts_per_request": total_attempts / N_REQUESTS,
            "avg_donors_contacted_per_request": total_contacted / N_REQUESTS,
            "no_show_rate": total_no_shows / max(total_attempts, 1),
            "max_donor_load": max_donor_load,
            "unique_donors_used": donors_used_at_all,
        }

    return results


def run_scenario(label: str, n_donors: int):
    all_results = {name: [] for name, _ in ALGORITHMS}

    for trial in range(N_TRIALS):
        trial_result = run_trial(trial_seed=trial, n_donors=n_donors)
        for algo_name, metrics in trial_result.items():
            all_results[algo_name].append(metrics)

    print(f"\n=== Scenario: {label.upper()} ({n_donors} donors, "
          f"{N_REQUESTS} requests/trial, {N_TRIALS} trials) ===\n")

    summary = {}
    for algo_name, trials in all_results.items():
        fulfillment_rates = [t["fulfillment_rate"] for t in trials]
        avg_attempts = [t["avg_attempts_per_request"] for t in trials]
        no_show_rates = [t["no_show_rate"] for t in trials]
        max_loads = [t["max_donor_load"] for t in trials]

        summary[algo_name] = {
            "fulfillment_rates": fulfillment_rates,
            "mean_fulfillment": statistics.mean(fulfillment_rates),
            "stdev_fulfillment": statistics.stdev(fulfillment_rates),
            "mean_attempts": statistics.mean(avg_attempts),
            "mean_no_show_rate": statistics.mean(no_show_rates),
            "mean_max_donor_load": statistics.mean(max_loads),
        }

        s = summary[algo_name]
        print(f"{algo_name}:")
        print(f"  Fulfillment rate:      {s['mean_fulfillment']*100:.2f}% "
              f"(std {s['stdev_fulfillment']*100:.2f})")
        print(f"  Avg attempts/request:  {s['mean_attempts']:.2f}")
        print(f"  No-show rate:          {s['mean_no_show_rate']*100:.2f}% of contacted donors")
        print(f"  Avg max donor load:    {s['mean_max_donor_load']:.1f}")
        print()

    rwdp_rates = summary["RWDP"]["fulfillment_rates"]
    for baseline_name in ["Random Baseline", "Exact-Match-Only Baseline"]:
        baseline_rates = summary[baseline_name]["fulfillment_rates"]
        t_stat, p_value = scipy_stats.ttest_rel(rwdp_rates, baseline_rates)
        diff = summary["RWDP"]["mean_fulfillment"] - summary[baseline_name]["mean_fulfillment"]
        sig = "significant at p<0.05" if p_value < 0.05 else "NOT significant at p<0.05"
        print(f"RWDP vs {baseline_name}:")
        print(f"  Mean fulfillment-rate improvement: {diff*100:+.2f} percentage points")
        print(f"  Paired t-test: t={t_stat:.3f}, p={p_value:.6f} ({sig})")
        print()

    return summary


def main():
    all_summaries = {}
    for label, n_donors in SCENARIOS:
        all_summaries[label] = run_scenario(label, n_donors)
    return all_summaries


if __name__ == "__main__":
    main()
