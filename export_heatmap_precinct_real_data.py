import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent

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
    "asian": "NH_ASIAN_ALONE_VAP",
    "other": "OTHER_VAP",
}


def safe_pct(numerator, denominator) -> float:
    if denominator is None or denominator <= 0:
        return 0.0
    return float(numerator) / float(denominator) * 100.0


def build_equal_width_bins(num_bins: int = 5) -> list[dict]:
    width = 100 // num_bins
    bins = []

    start = 0
    for i in range(num_bins):
        end = 100 if i == num_bins - 1 else start + width
        bins.append(
            {
                "binId": i + 1,
                "rangeMin": start,
                "rangeMax": end,
                "color": COLORS[i],
            }
        )
        start = end

    return bins


def pct_to_bin_id(pct_0_to_100: float, bins: list[dict]) -> int:
    for i, b in enumerate(bins):
        lo = b["rangeMin"]
        hi = b["rangeMax"]
        is_last = i == len(bins) - 1

        if is_last:
            if lo <= pct_0_to_100 <= hi:
                return b["binId"]
        else:
            if lo <= pct_0_to_100 < hi:
                return b["binId"]

    return bins[-1]["binId"]


def build_raw_features(gdf: gpd.GeoDataFrame, bins: list[dict]) -> list[dict]:
    features = []

    for idx, row in gdf.iterrows():
        vap = float(row["VAP"]) if "VAP" in row and row["VAP"] is not None else 0.0

        black_pct = safe_pct(row.get("NH_BLACK_ALONE_VAP", 0), vap)
        white_pct = safe_pct(row.get("NH_WHITE_ALONE_VAP", 0), vap)
        hispanic_pct = safe_pct(row.get("LATINO_VAP", 0), vap)
        asian_pct = safe_pct(row.get("NH_ASIAN_ALONE_VAP", 0), vap)
        other_pct = safe_pct(row.get("OTHER_VAP", 0), vap)

        features.append(
            {
                "idx": int(idx),
                "black": pct_to_bin_id(black_pct, bins),
                "white": pct_to_bin_id(white_pct, bins),
                "hispanic": pct_to_bin_id(hispanic_pct, bins),
                "asian": pct_to_bin_id(asian_pct, bins),
                "other": pct_to_bin_id(other_pct, bins),
            }
        )

    return features


def compress_bins_remove_empty(bins: list[dict], features: list[dict]) -> tuple[list[dict], list[dict]]:
    used_bin_ids = set()

    for feat in features:
        for key in GROUP_COLS.keys():
            used_bin_ids.add(feat[key])

    used_bins = [b for b in bins if b["binId"] in used_bin_ids]

    id_remap = {}
    new_bins = []

    for new_id, old_bin in enumerate(used_bins, start=1):
        id_remap[old_bin["binId"]] = new_id
        new_bins.append(
            {
                "binId": new_id,
                "rangeMin": old_bin["rangeMin"],
                "rangeMax": old_bin["rangeMax"],
                "color": old_bin["color"],
            }
        )

    new_features = []
    for feat in features:
        new_feat = {"idx": feat["idx"]}
        for key in GROUP_COLS.keys():
            new_feat[key] = id_remap[feat[key]]
        new_features.append(new_feat)

    return new_bins, new_features


def export_state(job: dict) -> None:
    gdf = gpd.read_file(job["precincts"]).reset_index(drop=True)

    bins = build_equal_width_bins(num_bins=5)
    raw_features = build_raw_features(gdf, bins)
    final_bins, final_features = compress_bins_remove_empty(bins, raw_features)

    payload = {
        "stateId": job["state"],
        "granularity": "precinct",
        "bins": final_bins,
        "features": final_features,
    }

    out_path = job["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote: {out_path}")
    print(f"Bins: {final_bins}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()