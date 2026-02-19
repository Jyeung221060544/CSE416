import json
import statistics as stats
from collections import Counter

def load_jsonl(path):
    rows = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

def summarize_ensemble(jsonl_path, out_summary_path=None):
    rows = load_jsonl(jsonl_path)
    n = len(rows)

    seats = [r["seats_dem"] for r in rows]
    cuts  = [r["cut_edges"] for r in rows]
    pop_min = [r["pop_min"] for r in rows]
    pop_max = [r["pop_max"] for r in rows]

    seats_dist = dict(sorted(Counter(seats).items()))
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

    print(f"\n== {jsonl_path} ==")
    print("plans:", summary["plans"])
    print("seats_dem distribution:", summary["seats_dem_distribution"])
    ce = summary["cut_edges"]
    print(f"cut_edges: min {ce['min']} median {ce['median']} max {ce['max']}")
    print(f"cut_edges: mean {ce['mean']:.3f}")

    if out_summary_path:
        with open(out_summary_path, "w") as f:
            json.dump(summary, f, indent=2)
        print("Saved summary:", out_summary_path)

    return summary

summarize_ensemble("AL_data/AL_raceblind_stats.jsonl", "AL_data/AL_raceblind_summary.json")
summarize_ensemble("OR_data/OR_raceblind_stats.jsonl", "OR_data/OR_raceblind_summary.json")