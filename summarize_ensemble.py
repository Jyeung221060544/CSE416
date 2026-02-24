"""
summarize_ensemble.py
=====================
Reads a JSONL file of per-step ReCom Markov chain statistics and computes
aggregate summary statistics for the ensemble, then optionally writes the
summary to a JSON file.

Summary statistics produced
----------------------------
- plans           : Total number of plans (steps) in the ensemble.
- seats_dem_distribution : Frequency distribution of Democratic seat counts.
- cut_edges       : min / median / max / mean across all plans.
- pop_min         : min / median / max of the smallest district population
                    across all plans.
- pop_max         : min / median / max of the largest district population
                    across all plans.

Module-level script section runs the summary for Alabama and Oregon.

Dependencies: json, statistics, collections
"""

import json
import statistics as stats
from collections import Counter


def load_jsonl(path):
    """
    Read a JSONL (newline-delimited JSON) file into a list of dicts.
    Blank lines are skipped.

    Parameters
    ----------
    path : str
        Path to the JSONL file.

    Returns
    -------
    list[dict]
        Parsed JSON objects, one per non-blank line.
    """
    # Step 0: Open file and parse each non-empty line
    rows = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def summarize_ensemble(jsonl_path, out_summary_path=None):
    """
    Compute summary statistics for a ReCom ensemble JSONL file and optionally
    save the result to a JSON file.

    Parameters
    ----------
    jsonl_path       : str       Path to the input JSONL stats file.
    out_summary_path : str|None  If provided, the summary dict is written to
                                 this path as formatted JSON.

    Returns
    -------
    dict
        Summary dict containing:
        - "plans"                    : int
        - "seats_dem_distribution"   : dict[int, int]
        - "cut_edges"                : dict with min/median/max/mean
        - "pop_min"                  : dict with min/median/max
        - "pop_max"                  : dict with min/median/max
    """
    # Step 0: Load all plan records from the JSONL file
    rows = load_jsonl(jsonl_path)
    n = len(rows)

    # Step 1: Extract per-plan series
    seats = [r["seats_dem"] for r in rows]
    cuts  = [r["cut_edges"] for r in rows]
    pop_min = [r["pop_min"] for r in rows]
    pop_max = [r["pop_max"] for r in rows]

    # Step 2: Build the frequency distribution of Democratic seats
    seats_dist = dict(sorted(Counter(seats).items()))

    # Step 3: Assemble the summary dict
    summary = {
        "plans": n,
        "seats_dem_distribution": seats_dist,
        "cut_edges": {
            "min": int(min(cuts)),
            "median": float(stats.median(cuts)),
            "max": int(max(cuts)),
            "mean": float(stats.mean(cuts)),
        },
        "pop_min": {
            "min": int(min(pop_min)),
            "median": float(stats.median(pop_min)),
            "max": int(max(pop_min)),
        },
        "pop_max": {
            "min": int(min(pop_max)),
            "median": float(stats.median(pop_max)),
            "max": int(max(pop_max)),
        },
    }

    # Step 4: Print summary to console
    print(f"\n== {jsonl_path} ==")
    print("plans:", summary["plans"])
    print("seats_dem distribution:", summary["seats_dem_distribution"])
    ce = summary["cut_edges"]
    print(f"cut_edges: min {ce['min']} median {ce['median']} max {ce['max']}")
    print(f"cut_edges: mean {ce['mean']:.3f}")

    # Step 5: Write to JSON file if a path was provided
    if out_summary_path:
        with open(out_summary_path, "w") as f:
            json.dump(summary, f, indent=2)
        print("Saved summary:", out_summary_path)

    return summary


# ── Script entry ──────────────────────────────────────────────────────────

# Step 0: Summarize Alabama race-blind ensemble
summarize_ensemble("AL_data/AL_raceblind_stats.jsonl", "AL_data/AL_raceblind_summary.json")

# Step 1: Summarize Oregon race-blind ensemble
summarize_ensemble("OR_data/OR_raceblind_stats.jsonl", "OR_data/OR_raceblind_summary.json")
