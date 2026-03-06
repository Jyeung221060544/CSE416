import argparse
import json
from pathlib import Path

import geopandas as gpd
import numpy as np


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
    Expected JSONL line format from SeaWulf:
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

    grouped = (
        gdf.groupby("enacted_cd")[[group_col, pop_col]]
        .sum()
        .reset_index()
    )

    grouped["pct"] = grouped[group_col] / grouped[pop_col]
    grouped = grouped.sort_values("pct").reset_index(drop=True)

    enacted_points = []
    for i, row in grouped.iterrows():
        enacted_points.append({
            "district_rank": int(i + 1),
            "enacted_cd": int(row["enacted_cd"]),
            "pct": float(row["pct"]),
        })

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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", required=True, choices=["AL", "OR"])
    parser.add_argument("--ensemble", required=True, choices=["vra", "raceblind"])
    parser.add_argument("--plans", help="plans_final.jsonl for raceblind")
    parser.add_argument("--group-key",
                        help="Example: NH_BLACK_ALONE_VAP, LATINO_VAP, NH_WHITE_ALONE_VAP")
    parser.add_argument("--raw",
                        help="Path to boxwhisker_raw_final.jsonl")
    parser.add_argument("--precincts",
                        help="Path to AL_precincts_full.geojson or OR_precincts_full.geojson")
    parser.add_argument("--out", required=True,
                        help="Output JSON path")
    args = parser.parse_args()

    if args.ensemble == "raceblind":
        if not args.plans:
            raise ValueError("--plans is required when --ensemble raceblind")

        out_path = Path(args.out)
        stats = compute_raceblind_boxwhisker(Path(args.plans))

        payload = {
            "state": args.state,
            "ensemble": "raceblind",
            "metrics": stats,
        }

        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        print(f"Wrote: {out_path}")
        print(f"Plans used: {stats['num_plans']}")
        return

    if not args.group_key or not args.raw or not args.precincts:
        raise ValueError("--group-key, --raw, and --precincts are required when --ensemble vra")

    raw_path = Path(args.raw)
    precinct_path = Path(args.precincts)
    out_path = Path(args.out)

    plans = load_boxwhisker_raw(raw_path)
    box_stats = compute_boxwhisker_from_raw(plans)
    enacted_points = compute_enacted_points(precinct_path, args.group_key)

    sample = plans[0]
    payload = {
        "state": args.state,
        "ensemble": args.ensemble,
        "group_key": args.group_key,
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


if __name__ == "__main__":
    main()