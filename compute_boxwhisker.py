import json
from pathlib import Path

import geopandas as gpd
import numpy as np


ROOT = Path(__file__).resolve().parent

# Configure all jobs here so the script only needs to be run once.
JOBS = [
    {
        "state": "AL",
        "ensemble": "vra",
        "group_key": "NH_BLACK_ALONE_VAP",
        "raw": ROOT / "cse416_seawulf_results" / "AL_output_vra" / "boxwhisker_raw_final.jsonl",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "out": ROOT / "AL_data" / "AL_boxwhisker_vra_black.json",
    },
    {
        "state": "OR",
        "ensemble": "vra",
        "group_key": "LATINO_VAP",
        "raw": ROOT / "cse416_seawulf_results" / "OR_output_vra" / "boxwhisker_raw_final.jsonl",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "out": ROOT / "OR_data" / "OR_boxwhisker_vra_latino.json",
    },
    {
        "state": "AL",
        "ensemble": "raceblind",
        "plans": ROOT / "cse416_seawulf_results" / "AL_output_raceblind" / "plans_final.jsonl",
        "out": ROOT / "AL_data" / "AL_boxwhisker_raceblind.json",
    },
    {
        "state": "OR",
        "ensemble": "raceblind",
        "plans": ROOT / "cse416_seawulf_results" / "OR_output_raceblind" / "plans_final.jsonl",
        "out": ROOT / "OR_data" / "OR_boxwhisker_raceblind.json",
    },
]


def quantile_stats(values):
    arr = np.array(values, dtype=float)
    return {
        "min": float(np.min(arr)),
        "q1": float(np.quantile(arr, 0.25)),
        "median": float(np.quantile(arr, 0.50)),
        "q3": float(np.quantile(arr, 0.75)),
        "max": float(np.max(arr)),
    }


def load_boxwhisker_raw(raw_path: Path):
    """
    Expected JSONL line format:
    {
      "step": 0,
      "group_key": "NH_BLACK_ALONE_VAP",
      "threshold": 0.5,
      "district_pcts_sorted": [0.01, 0.05, ...]
    }
    """
    plans = []

    with raw_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            plans.append(json.loads(line))

    if not plans:
        raise ValueError(f"No usable rows found in {raw_path}")

    return plans


def compute_boxwhisker_from_raw(plans):
    """
    Builds box/whisker stats by district rank.
    District rank means the sorted district minority percentages in each plan.
    """
    num_ranks = len(plans[0]["district_pcts_sorted"])
    per_rank = [[] for _ in range(num_ranks)]

    for plan in plans:
        vals = plan["district_pcts_sorted"]
        if len(vals) != num_ranks:
            raise ValueError("Inconsistent district_pcts_sorted lengths across plans")
        for i, v in enumerate(vals):
            per_rank[i].append(v)

    stats = []
    for i, values in enumerate(per_rank, start=1):
        row = {"district_rank": i}
        row.update(quantile_stats(values))
        stats.append(row)

    return stats


def compute_enacted_points(precinct_geojson: Path, group_col: str, pop_col: str = "VAP"):
    """
    Computes enacted district minority percentages and returns them sorted by percentage,
    so they align with the rank-based boxplots.
    """
    gdf = gpd.read_file(precinct_geojson)

    required = {"enacted_cd", group_col, pop_col}
    missing = [c for c in required if c not in gdf.columns]
    if missing:
        raise ValueError(f"Missing columns in {precinct_geojson}: {missing}")

    grouped = gdf.groupby("enacted_cd")[[group_col, pop_col]].sum().reset_index()
    grouped["pct"] = grouped[group_col] / grouped[pop_col]
    grouped = grouped.sort_values("pct").reset_index(drop=True)

    enacted_points = []
    for i, row in grouped.iterrows():
        enacted_points.append(
            {
                "district_rank": int(i + 1),
                "enacted_cd": int(row["enacted_cd"]),
                "pct": float(row["pct"]),
            }
        )

    return enacted_points


def compute_raceblind_boxwhisker(plans_path: Path):
    dem_seats = []
    cut_edges = []

    with plans_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if "dem_seats" in row:
                dem_seats.append(row["dem_seats"])
            if "cut_edges" in row:
                cut_edges.append(row["cut_edges"])

    if not dem_seats:
        raise ValueError(f"No dem_seats found in {plans_path}")
    if not cut_edges:
        raise ValueError(f"No cut_edges found in {plans_path}")

    return {
        "dem_seats": quantile_stats(dem_seats),
        "cut_edges": quantile_stats(cut_edges),
        "num_plans": len(dem_seats),
    }


def run_vra_job(job):
    raw_path = Path(job["raw"])
    precinct_path = Path(job["precincts"])
    out_path = Path(job["out"])
    group_key = job["group_key"]

    if not raw_path.exists():
        print(f"Skipping missing raw file: {raw_path}")
        return
    if not precinct_path.exists():
        print(f"Skipping missing precinct file: {precinct_path}")
        return

    plans = load_boxwhisker_raw(raw_path)
    box_stats = compute_boxwhisker_from_raw(plans)
    enacted_points = compute_enacted_points(precinct_path, group_key)

    sample = plans[0]
    payload = {
        "state": job["state"],
        "ensemble": "vra",
        "group_key": group_key,
        "threshold": sample.get("threshold"),
        "num_plans": len(plans),
        "district_boxwhisker": box_stats,
        "enacted_points": enacted_points,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Wrote: {out_path}")
    print(f"Plans used: {len(plans)}")
    print(f"District ranks: {len(box_stats)}")
    print("-" * 60)


def run_raceblind_job(job):
    plans_path = Path(job["plans"])
    out_path = Path(job["out"])

    if not plans_path.exists():
        print(f"Skipping missing plans file: {plans_path}")
        return

    stats = compute_raceblind_boxwhisker(plans_path)

    payload = {
        "state": job["state"],
        "ensemble": "raceblind",
        "metrics": stats,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Wrote: {out_path}")
    print(f"Plans used: {stats['num_plans']}")
    print("-" * 60)


def main():
    for job in JOBS:
        try:
            if job["ensemble"] == "vra":
                run_vra_job(job)
            elif job["ensemble"] == "raceblind":
                run_raceblind_job(job)
            else:
                print(f"Skipping unknown ensemble type: {job['ensemble']}")
                print("-" * 60)
        except Exception as e:
            print(f"Failed for {job['state']} {job['ensemble']}: {e}")
            print("-" * 60)


if __name__ == "__main__":
    main()