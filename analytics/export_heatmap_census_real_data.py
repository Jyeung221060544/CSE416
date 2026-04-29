import json
import math
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

COLORS = ["#ccfbf1", "#5eead4", "#14b8a6", "#0f766e", "#134e4a"]

JOBS = [
    {
        "state": "AL",
        "blocks_shp": ROOT / "BASE_FILES" / "AL-shapefile" / "tl_2025_01_tabblock20.shp",
        "vap_csv": ROOT / "BASE_FILES" / "AL-VAP-population.csv",
        "out": ROOT / "AL-real-data" / "AL-heatmap-census.json",
        # Column used to set the bin ceiling for this state's primary minority group
        "primary_minority_col": "NH_BLACK_ALONE_VAP",
    },
    {
        "state": "OR",
        "blocks_shp": ROOT / "BASE_FILES" / "OR-shapefile" / "tl_2025_41_tabblock20.shp",
        "vap_csv": ROOT / "BASE_FILES" / "OR-VAP-population.csv",
        "out": ROOT / "OR-real-data" / "OR-heatmap-census.json",
        "primary_minority_col": "LATINO_VAP",
    },
]


def safe_pct(numerator, denominator) -> float:
    if denominator is None or denominator <= 0:
        return 0.0
    return float(numerator) / float(denominator) * 100.0


def compute_minority_max_pct(merged: pd.DataFrame, minority_col: str, percentile: float = 0.90) -> float:
    """
    Return the ceiling for heatmap bins: the *percentile*-th percentile of the
    minority VAP share across all blocks, rounded up to the nearest 5 pp.
    Using a high percentile rather than the absolute max avoids a single
    outlier block blowing out the color scale.
    """
    pcts = merged.apply(
        lambda r: safe_pct(r[minority_col], r["VAP"]), axis=1
    )
    raw = float(pcts.quantile(percentile))
    # Round up to nearest 5, minimum 5
    return max(5.0, math.ceil(raw / 5) * 5.0)


def build_equal_width_bins(num_bins: int = 5, max_pct: float = 100.0) -> list[dict]:
    """Build *num_bins* equal-width bins spanning [0, max_pct]."""
    width = max_pct / num_bins
    bins = []
    start = 0.0

    for i in range(num_bins):
        end = max_pct if i == num_bins - 1 else round(start + width, 4)
        bins.append(
            {
                "binId": i + 1,
                "rangeMin": round(start, 4),
                "rangeMax": round(end, 4),
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


def load_block_vap(vap_csv_path: Path) -> pd.DataFrame:
    pop = pd.read_csv(vap_csv_path, skiprows=[1], dtype=str)

    pop["GEOID_BLOCK"] = (
        pop["GEO_ID"]
        .astype(str)
        .str.replace("1000000US", "", regex=False)
        .str.strip()
        .str.zfill(15)
    )

    for col in ["P4_001N", "P4_002N", "P4_003N", "P4_005N", "P4_006N", "P4_008N"]:
        if col in pop.columns:
            pop[col] = pd.to_numeric(pop[col], errors="coerce").fillna(0).astype(int)

    out = pd.DataFrame({
        "GEOID_BLOCK": pop["GEOID_BLOCK"],
        "VAP": pop["P4_001N"],
        "LATINO_VAP": pop["P4_002N"],
        "NHVAP": pop["P4_003N"],
        "NH_WHITE_ALONE_VAP": pop["P4_005N"],
        "NH_BLACK_ALONE_VAP": pop["P4_006N"],
        "NH_ASIAN_ALONE_VAP": pop["P4_008N"],
    })

    out["OTHER_VAP"] = (
        out["NHVAP"]
        - out["NH_WHITE_ALONE_VAP"]
        - out["NH_BLACK_ALONE_VAP"]
        - out["NH_ASIAN_ALONE_VAP"]
    ).clip(lower=0)

    return out


def build_features(merged: gpd.GeoDataFrame, bins: list[dict]) -> list[dict]:
    features = []

    for idx, row in merged.reset_index(drop=True).iterrows():
        vap_total = int(row["VAP"])

        black_pct = safe_pct(row["NH_BLACK_ALONE_VAP"], vap_total)
        white_pct = safe_pct(row["NH_WHITE_ALONE_VAP"], vap_total)
        hispanic_pct = safe_pct(row["LATINO_VAP"], vap_total)
        asian_pct = safe_pct(row["NH_ASIAN_ALONE_VAP"], vap_total)
        other_pct = safe_pct(row["OTHER_VAP"], vap_total)

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


def export_state(job: dict) -> None:
    blocks = gpd.read_file(job["blocks_shp"])
    blocks["GEOID_BLOCK"] = blocks["GEOID20"].astype(str).str.strip().str.zfill(15)

    vap = load_block_vap(job["vap_csv"])
    merged = blocks.merge(vap, on="GEOID_BLOCK", how="left")

    for col in [
        "VAP",
        "LATINO_VAP",
        "NH_WHITE_ALONE_VAP",
        "NH_BLACK_ALONE_VAP",
        "NH_ASIAN_ALONE_VAP",
        "OTHER_VAP",
    ]:
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0).astype(int)

    max_pct = compute_minority_max_pct(merged, job["primary_minority_col"])
    bins = build_equal_width_bins(num_bins=5, max_pct=max_pct)
    features = build_features(merged, bins)

    payload = {
        "stateId": job["state"],
        "granularity": "census_block",
        "bins": bins,
        "features": features,
    }

    out_path = job["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote: {out_path}")
    print(f"Num bins: {len(bins)}")
    print(f"Num features: {len(features)}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()