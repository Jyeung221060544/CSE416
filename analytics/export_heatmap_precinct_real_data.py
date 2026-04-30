import json
import math
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent.parent

COLORS = ["#ccfbf1", "#5eead4", "#14b8a6", "#0f766e", "#134e4a"]

JOBS = [
    {
        "state": "AL",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "out": ROOT / "AL-real-data" / "AL-heatmap-precinct.json",
    },
    {
        "state": "OR",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "out": ROOT / "OR-real-data" / "OR-heatmap-precinct.json",
    },
]

GROUP_COLS = {
    "black": "NH_BLACK_ALONE_VAP",
    "white": "NH_WHITE_ALONE_VAP",
    "hispanic": "LATINO_VAP",
    "other": "OTHER_VAP",
}


def safe_pct(numerator, denominator) -> float:
    if denominator is None or denominator <= 0:
        return 0.0
    return float(numerator) / float(denominator) * 100.0


def compute_max_pct(gdf: gpd.GeoDataFrame, col: str, percentile: float = 0.90) -> float:
    pcts = gdf.apply(lambda r: safe_pct(r.get(col, 0), r.get("VAP", 0)), axis=1)
    raw = float(pcts.quantile(percentile))
    return max(5.0, math.ceil(raw / 5) * 5.0)


def build_bins(max_pct: float, num_bins: int = 5) -> list[dict]:
    width = max_pct / num_bins
    bins = []
    start = 0.0
    for i in range(num_bins):
        end = max_pct if i == num_bins - 1 else round(start + width, 4)
        bins.append({
            "binId": i + 1,
            "rangeMin": round(start, 4),
            "rangeMax": round(end, 4),
            "color": COLORS[i],
        })
        start = end
    return bins


def pct_to_bin_id(pct: float, bins: list[dict]) -> int:
    for i, b in enumerate(bins):
        lo, hi = b["rangeMin"], b["rangeMax"]
        if i == len(bins) - 1:
            if lo <= pct <= hi:
                return b["binId"]
        else:
            if lo <= pct < hi:
                return b["binId"]
    return bins[-1]["binId"]


def build_features(gdf: gpd.GeoDataFrame, bins_per_group: dict) -> list[dict]:
    features = []
    for idx, row in gdf.iterrows():
        vap = float(row["VAP"]) if "VAP" in row and row["VAP"] is not None else 0.0
        feature = {"idx": int(idx)}
        for group, col in GROUP_COLS.items():
            pct = safe_pct(row.get(col, 0), vap)
            feature[group] = pct_to_bin_id(pct, bins_per_group[group])
        features.append(feature)
    return features


def export_state(job: dict) -> None:
    gdf = gpd.read_file(job["precincts"]).reset_index(drop=True)

    bins_per_group = {
        group: build_bins(compute_max_pct(gdf, col))
        for group, col in GROUP_COLS.items()
    }
    features = build_features(gdf, bins_per_group)

    payload = {
        "stateId": job["state"],
        "granularity": "precinct",
        "bins": bins_per_group,
        "features": features,
    }

    out_path = job["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote: {out_path}")
    for group, bins in bins_per_group.items():
        print(f"  {group}: [{bins[0]['rangeMin']}–{bins[-1]['rangeMax']}%]")
    print(f"Num features: {len(features)}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()
