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
    },
    {
        "state": "OR",
        "blocks_shp": ROOT / "BASE_FILES" / "OR-shapefile" / "tl_2025_41_tabblock20.shp",
        "vap_csv": ROOT / "BASE_FILES" / "OR-VAP-population.csv",
        "out": ROOT / "OR-real-data" / "OR-heatmap-census.json",
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


def compute_max_pct(df: pd.DataFrame, col: str, percentile: float = 0.90) -> float:
    pcts = df.apply(lambda r: safe_pct(r[col], r["VAP"]), axis=1)
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


def load_block_vap(vap_csv_path: Path) -> pd.DataFrame:
    pop = pd.read_csv(vap_csv_path, skiprows=[1], dtype=str)

    pop["GEOID_BLOCK"] = (
        pop["GEO_ID"]
        .astype(str)
        .str.replace("1000000US", "", regex=False)
        .str.strip()
        .str.zfill(15)
    )

    for col in [
        "P4_001N", "P4_002N", "P4_003N", "P4_005N", "P4_006N", "P4_008N"
    ]:
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


def build_features(merged: gpd.GeoDataFrame, bins_per_group: dict) -> list[dict]:
    features = []
    for idx, row in merged.reset_index(drop=True).iterrows():
        vap = int(row["VAP"])
        feature = {"idx": int(idx)}
        for group, col in GROUP_COLS.items():
            pct = safe_pct(row[col], vap)
            feature[group] = pct_to_bin_id(pct, bins_per_group[group])
        features.append(feature)
    return features


def export_state(job: dict) -> None:
    blocks = gpd.read_file(job["blocks_shp"])
    blocks["GEOID_BLOCK"] = blocks["GEOID20"].astype(str).str.strip().str.zfill(15)

    vap = load_block_vap(job["vap_csv"])
    merged = blocks.merge(vap, on="GEOID_BLOCK", how="left")

    for col in GROUP_COLS.values():
        merged[col] = (
            pd.to_numeric(merged[col], errors="coerce").fillna(0).astype(int)
        )
    merged["VAP"] = (
        pd.to_numeric(merged["VAP"], errors="coerce").fillna(0).astype(int)
    )

    bins_per_group = {
        group: build_bins(compute_max_pct(merged, col))
        for group, col in GROUP_COLS.items()
    }
    features = build_features(merged, bins_per_group)

    payload = {
        "stateId": job["state"],
        "granularity": "census_block",
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
