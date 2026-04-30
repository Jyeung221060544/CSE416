"""
generate_effectiveness_json.py
==============================
Build AL-effectiveness.json and OR-effectiveness.json from actual
seawulf ensemble output (plans_final.jsonl).

Usage:
    python analytics/generate_effectiveness_json.py

Writes:
    AL-real-data/AL-effectiveness.json
    OR-real-data/OR-effectiveness.json
"""

import json
import math
import os
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "cse416_seawulf_results"


# ── helpers ──────────────────────────────────────────────────────────────────

def load_plans(path):
    """Yield parsed plan records from a plans_final.jsonl file."""
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def eff_histogram(plans_path):
    """Return {numEffective: count} dict from a plans JSONL."""
    hist = defaultdict(int)
    for rec in load_plans(plans_path):
        if "eff_districts" in rec:
            hist[rec["eff_districts"]] += 1
    return dict(sorted(hist.items()))


def boxwhisker_stats(hist):
    """
    Compute min/q1/median/mean/q3/max from a {value: frequency} histogram.
    Uses standard nearest-rank percentiles.
    """
    expanded = []
    for val, freq in sorted(hist.items()):
        expanded.extend([val] * freq)
    if not expanded:
        return {"min": 0, "q1": 0, "median": 0, "mean": 0.0, "q3": 0, "max": 0}
    n = len(expanded)
    mean = round(sum(expanded) / n, 2)
    return {
        "min": expanded[0],
        "q1": expanded[max(0, n // 4 - 1)],
        "median": expanded[n // 2],
        "mean": mean,
        "q3": expanded[min(n - 1, 3 * n // 4)],
        "max": expanded[-1],
    }


def pct_satisfying(hist, threshold):
    """
    Fraction of plans in hist where eff_districts >= threshold.
    Returns a float rounded to 4 decimal places.
    """
    total = sum(hist.values())
    if total == 0:
        return 0.0
    satisfying = sum(freq for val, freq in hist.items() if val >= threshold)
    return round(satisfying / total, 4)


def minority_proportional_seats(graph_path, group_col, num_districts):
    """
    Compute floor/round proportional seat count from node attributes.
    Returns (pct, proportional_seats_rounded).
    """
    with open(graph_path, encoding="utf-8") as f:
        g = json.load(f)
    nodes = g.get("nodes", [])
    total_vap = sum(n.get("VAP", 0) for n in nodes)
    minority_vap = sum(n.get(group_col, 0) for n in nodes)
    if total_vap == 0:
        return 0.0, 0
    pct = minority_vap / total_vap
    proportional = round(pct * num_districts)
    return pct, proportional


# ── per-state builder ─────────────────────────────────────────────────────────

def build_effectiveness(
    state_id,
    num_districts,
    group_label,
    group_col,
    enacted_effective,
    rb_plans_path,
    vra_plans_path,
    graph_path,
):
    rb_hist = eff_histogram(rb_plans_path)
    vra_hist = eff_histogram(vra_plans_path)

    rb_total = sum(rb_hist.values())
    vra_total = sum(vra_hist.values())

    rb_stats = boxwhisker_stats(rb_hist)
    vra_stats = boxwhisker_stats(vra_hist)

    _pct, proportional_seats = minority_proportional_seats(
        graph_path, group_col, num_districts
    )
    proportional_seats = max(proportional_seats, 1)

    # satisfies-enacted: eff >= enacted_effective
    # satisfies-proportionality: eff >= proportional_seats
    # satisfies-both: eff >= max(enacted_effective, proportional_seats)
    both_thr = max(enacted_effective, proportional_seats)

    def histogram_entries(hist):
        return [
            {"numEffective": k, "frequency": v}
            for k, v in sorted(hist.items())
        ]

    return {
        "stateId": state_id,
        "numDistricts": num_districts,
        "totalPlans": max(rb_total, vra_total),
        "feasibleGroups": [group_label],
        "effectivenessHistogram": {
            "enactedEffectiveByGroup": {group_label: enacted_effective},
            "ensembles": [
                {
                    "ensembleType": "race-blind",
                    "groupCounts": {group_label: histogram_entries(rb_hist)},
                },
                {
                    "ensembleType": "vra-constrained",
                    "groupCounts": {group_label: histogram_entries(vra_hist)},
                },
            ],
        },
        "effectivenessBoxWhisker": {
            "enactedPlan": {group_label: enacted_effective},
            "ensembles": [
                {
                    "ensembleType": "race-blind",
                    "groupStats": {group_label: rb_stats},
                },
                {
                    "ensembleType": "vra-constrained",
                    "groupStats": {group_label: vra_stats},
                },
            ],
        },
        "vraImpactThreshold": {
            group_label: {
                "rows": [
                    {
                        "id": "satisfies-enacted",
                        "label": "Satisfies Enacted Effectiveness",
                        "raceBlindPct": pct_satisfying(rb_hist, enacted_effective),
                        "vraConstrainedPct": pct_satisfying(vra_hist, enacted_effective),
                    },
                    {
                        "id": "satisfies-proportionality",
                        "label": "Satisfies Rough Proportionality",
                        "raceBlindPct": pct_satisfying(rb_hist, proportional_seats),
                        "vraConstrainedPct": pct_satisfying(vra_hist, proportional_seats),
                    },
                    {
                        "id": "satisfies-both",
                        "label": "Satisfies Both Conditions",
                        "raceBlindPct": pct_satisfying(rb_hist, both_thr),
                        "vraConstrainedPct": pct_satisfying(vra_hist, both_thr),
                    },
                ]
            }
        },
    }


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    states = [
        {
            "state_id": "AL",
            "num_districts": 7,
            "group_label": "black",
            "group_col": "NH_BLACK_ALONE_VAP",
            "enacted_effective": 2,
            "rb_plans": RESULTS / "AL_output_raceblind" / "plans_final.jsonl",
            "vra_plans": RESULTS / "AL_output_vra" / "plans_final.jsonl",
            "graph": ROOT / "seawulf_runs" / "AL" / "input" / "AL_graph.json",
            "outfile": ROOT / "AL-real-data" / "AL-effectiveness.json",
        },
        {
            "state_id": "OR",
            "num_districts": 6,
            "group_label": "latino",
            "group_col": "LATINO_VAP",
            "enacted_effective": 1,
            "rb_plans": RESULTS / "OR_output_raceblind" / "plans_final.jsonl",
            "vra_plans": RESULTS / "OR_output_vra" / "plans_final.jsonl",
            "graph": ROOT / "seawulf_runs" / "OR" / "input" / "OR_graph.json",
            "outfile": ROOT / "OR-real-data" / "OR-effectiveness.json",
        },
    ]

    for s in states:
        print(f"Building {s['state_id']} effectiveness JSON …")
        data = build_effectiveness(
            state_id=s["state_id"],
            num_districts=s["num_districts"],
            group_label=s["group_label"],
            group_col=s["group_col"],
            enacted_effective=s["enacted_effective"],
            rb_plans_path=s["rb_plans"],
            vra_plans_path=s["vra_plans"],
            graph_path=s["graph"],
        )
        with open(s["outfile"], "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"  Wrote: {s['outfile']}")

    print("Done.")


if __name__ == "__main__":
    main()
