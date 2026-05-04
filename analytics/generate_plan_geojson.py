"""
generate_plan_geojson.py
========================
Convert interesting plan assignments saved by run_recom.py into
district-level GeoJSON files suitable for the frontend, matching the
format of ORCongressionalDistrict.json / ALCongressionalDistricts.json.

Requirements:
    pip install geopandas shapely

Usage (run from project root):
    python analytics/generate_plan_geojson.py \\
        --state AL \\
        --plan seawulf_runs/AL/output_vra/interesting_plan_zero_effective.json \\
        --precincts AL_data/AL_precincts_full.geojson \\
        --outdir frontend/src/assets/interesting_plans

    python analytics/generate_plan_geojson.py \\
        --state OR \\
        --plan seawulf_runs/OR/output_vra/interesting_plan_extra_democratic.json \\
        --precincts OR_data/OR_precincts_full.geojson \\
        --outdir frontend/src/assets/interesting_plans

    # Or process all saved interesting plans for a state at once:
    python analytics/generate_plan_geojson.py \\
        --state AL \\
        --all \\
        --plan-dir seawulf_runs/AL/output_vra \\
        --precincts AL_data/AL_precincts_full.geojson \\
        --outdir frontend/src/assets/interesting_plans

Output format (one file per plan):
    {STATE}_{plan_id}_districts.json
    e.g. AL_zero_effective_districts.json

Each file is a GeoJSON FeatureCollection where every feature is one
congressional district (precincts dissolved by assignment), with properties:
    district      – district number
    dem_votes     – total Democratic votes in district
    rep_votes     – total Republican votes in district
    winner        – "D" or "R"
    dem_share     – Democratic vote share (0–1)
    plan_id       – the interesting-plan id
    dem_seats     – total Democratic seats in the full plan
    eff_districts – effective minority districts in the full plan
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import geopandas as gpd
    import pandas as pd
    from shapely.geometry import mapping, MultiPolygon, Polygon
    from shapely.ops import unary_union
except ImportError:
    print("ERROR: geopandas and shapely are required.")
    print("  pip install geopandas shapely")
    sys.exit(1)


# ── helpers ──────────────────────────────────────────────────────────────────

def fill_holes(geom):
    """Remove all interior holes from a Polygon or MultiPolygon."""
    if geom.geom_type == "Polygon":
        return Polygon(geom.exterior)
    elif geom.geom_type == "MultiPolygon":
        return MultiPolygon([Polygon(p.exterior) for p in geom.geoms])
    return geom


def keep_largest_part(geom):
    """
    For MultiPolygon geometries, keep only the single largest polygon part.
    This ensures every district renders as one contiguous shape with no island pieces.
    """
    if geom.geom_type != "MultiPolygon":
        return geom
    return max(geom.geoms, key=lambda p: p.area)


def load_plan(plan_path):
    with open(plan_path, encoding="utf-8") as f:
        return json.load(f)


def load_precincts(precincts_path):
    """Load precinct GeoJSON into a GeoDataFrame."""
    print(f"  Loading precincts from {precincts_path} …")
    gdf = gpd.read_file(precincts_path)
    return gdf


def find_precinct_id_column(gdf, assignment_keys):
    """
    Identify which column in the precinct GDF matches the plan assignment keys.
    The assignment dict uses precinct node IDs (strings). Try common column names.
    """
    sample_key = next(iter(assignment_keys))
    candidates = ["GEOID", "geoid", "id", "PRECINCT", "precinct", "GEO_ID"]
    for col in candidates:
        if col in gdf.columns:
            if str(gdf[col].iloc[0]) == str(sample_key):
                return col
            # Check if any value matches
            if gdf[col].astype(str).isin([str(sample_key)]).any():
                return col
    # Fallback: try index
    if str(gdf.index[0]) == str(sample_key):
        return None  # use index
    # Last resort: return first string-like column
    for col in gdf.columns:
        if gdf[col].dtype == object:
            return col
    return None


def build_district_geojson(plan_data, precincts_gdf, state, vra_cfg=None):
    """
    Dissolve precinct geometries by district assignment and compute
    per-district vote tallies. Returns a GeoDataFrame of districts.
    """
    assignment = plan_data["assignment"]
    plan_id = plan_data["plan_id"]
    metrics = plan_data.get("metrics", {})

    # Map assignment keys to district labels
    # Keys are precinct node IDs (may be ints or strings in JSON)
    id_col = find_precinct_id_column(precincts_gdf, assignment.keys())

    if id_col is not None:
        precincts_gdf = precincts_gdf.copy()
        precincts_gdf["_node_id"] = precincts_gdf[id_col].astype(str)
    else:
        precincts_gdf = precincts_gdf.copy()
        precincts_gdf["_node_id"] = precincts_gdf.index.astype(str)

    # Build assignment series (node_id → district)
    assignment_str = {str(k): v for k, v in assignment.items()}
    precincts_gdf["_district"] = precincts_gdf["_node_id"].map(assignment_str)

    unmapped = precincts_gdf["_district"].isna().sum()
    if unmapped > 0:
        print(f"  WARNING: {unmapped} precincts could not be mapped to a district.")

    precincts_gdf = precincts_gdf.dropna(subset=["_district"])
    precincts_gdf["_district"] = precincts_gdf["_district"].astype(int)

    # Aggregate vote tallies per district
    vote_cols = {}
    for col in ["votes_dem", "votes_rep"]:
        if col in precincts_gdf.columns:
            vote_cols[col] = "sum"

    if vote_cols:
        agg = precincts_gdf.groupby("_district").agg(vote_cols).reset_index()
    else:
        agg = precincts_gdf[["_district"]].drop_duplicates().reset_index(drop=True)

    # Dissolve geometries by district, repair topology, fill holes, then simplify.
    # buffer(0) fixes self-intersections and sliver artifacts that dissolve() produces
    # when precinct borders have floating-point micro-gaps or overlaps.
    dissolved = precincts_gdf.dissolve(by="_district", as_index=False)[["_district", "geometry"]]
    dissolved["geometry"] = dissolved.geometry.buffer(0)
    dissolved["geometry"] = dissolved.geometry.apply(fill_holes)
    dissolved["geometry"] = dissolved.geometry.simplify(tolerance=0.001, preserve_topology=True)
    dissolved["geometry"] = dissolved.geometry.apply(keep_largest_part)

    # Remove micro-overlaps from independent simplification: subtract previously
    # processed districts so shared boundaries are exactly non-overlapping.
    geom_list = list(dissolved["geometry"])
    for i in range(1, len(geom_list)):
        for j in range(i):
            try:
                overlap = geom_list[i].intersection(geom_list[j])
                if not overlap.is_empty and overlap.area > 1e-12:
                    geom_list[i] = geom_list[i].difference(geom_list[j]).buffer(0)
            except Exception:
                pass
    dissolved["geometry"] = geom_list

    dissolved = dissolved.merge(agg, on="_district", how="left")

    # Compute winner and dem_share
    if "votes_dem" in dissolved.columns and "votes_rep" in dissolved.columns:
        dissolved["winner"] = dissolved.apply(
            lambda r: "D" if r["votes_dem"] > r["votes_rep"] else "R", axis=1
        )
        total = dissolved["votes_dem"] + dissolved["votes_rep"]
        dissolved["dem_share"] = (dissolved["votes_dem"] / total.where(total > 0, 1)).round(6)
    else:
        dissolved["winner"] = None
        dissolved["dem_share"] = None

    dissolved = dissolved.rename(columns={
        "_district": "district",
        "votes_dem": "dem_votes",
        "votes_rep": "rep_votes",
    })

    dissolved["plan_id"] = plan_id
    dissolved["dem_seats"] = metrics.get("dem_seats")
    dissolved["eff_districts"] = metrics.get("eff_districts")
    dissolved["step"] = plan_data.get("step")

    # Compute isEffective per district using precinct-level minority VAP aggregation
    if vra_cfg and vra_cfg.get("col") in precincts_gdf.columns:
        minority_col = vra_cfg["col"]
        threshold = vra_cfg["threshold"]
        party = vra_cfg["party"]
        vap_agg = (
            precincts_gdf.groupby("_district")[[minority_col, "VAP"]]
            .sum()
            .reset_index()
        )
        vap_agg["_minority_pct"] = vap_agg[minority_col] / vap_agg["VAP"].where(vap_agg["VAP"] > 0, 1)
        dissolved = dissolved.merge(vap_agg[["_district", "_minority_pct"]], left_on="district", right_on="_district", how="left")
        dissolved["isEffective"] = dissolved.apply(
            lambda r: bool(r["_minority_pct"] >= threshold and r.get("winner") == party), axis=1
        )
        dissolved = dissolved.drop(columns=["_district", "_minority_pct"])
    else:
        dissolved["isEffective"] = None

    return dissolved


def to_geojson_dict(gdf):
    """Convert GeoDataFrame to a plain GeoJSON dict."""
    features = []
    for _, row in gdf.iterrows():
        geom = row["geometry"]
        if geom is None or geom.is_empty:
            continue
        props = {
            k: (v if not (isinstance(v, float) and v != v) else None)
            for k, v in row.items()
            if k != "geometry"
        }
        # Convert numpy types to plain Python
        for k, v in props.items():
            if hasattr(v, "item"):
                props[k] = v.item()
        features.append({
            "type": "Feature",
            "geometry": mapping(geom),
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def process_plan(plan_path, precincts_path, outdir, state):
    print(f"Processing: {plan_path}")
    plan_data = load_plan(plan_path)
    plan_id = plan_data["plan_id"]

    precincts_gdf = load_precincts(precincts_path)

    print(f"  Dissolving precincts for plan '{plan_id}' …")
    district_gdf = build_district_geojson(plan_data, precincts_gdf, state, vra_cfg=VRA_CONFIG.get(state))

    os.makedirs(outdir, exist_ok=True)
    outfile = os.path.join(outdir, f"{state}_{plan_id}_districts.json")

    geojson = to_geojson_dict(district_gdf)
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(geojson, f)

    n_districts = len(district_gdf)
    print(f"  Wrote {n_districts} districts → {outfile}")
    return outfile


# ── Pipeline jobs ─────────────────────────────────────────────────────────────

_ROOT = Path(__file__).resolve().parent.parent
_OUTDIR = str(_ROOT / "frontend" / "src" / "assets" / "interesting_plans")

# VRA effectiveness config per state: minority column, VAP threshold, party of choice
VRA_CONFIG = {
    "AL": {"col": "NH_BLACK_ALONE_VAP", "threshold": 0.45, "party": "D"},
    "OR": {"col": "LATINO_VAP",          "threshold": 0.17, "party": "D"},
}

JOBS = [
    {
        "state": "AL",
        "plan_dir": _ROOT / "cse416_seawulf_results" / "AL_output_raceblind",
        "precincts": str(_ROOT / "AL_data" / "AL_precincts_full.geojson"),
    },
    {
        "state": "AL",
        "plan_dir": _ROOT / "cse416_seawulf_results" / "AL_output_vra",
        "precincts": str(_ROOT / "AL_data" / "AL_precincts_full.geojson"),
    },
    {
        "state": "OR",
        "plan_dir": _ROOT / "cse416_seawulf_results" / "OR_output_raceblind",
        "precincts": str(_ROOT / "OR_data" / "OR_precincts_full.geojson"),
    },
    {
        "state": "OR",
        "plan_dir": _ROOT / "cse416_seawulf_results" / "OR_output_vra",
        "precincts": str(_ROOT / "OR_data" / "OR_precincts_full.geojson"),
    },
]


def main():
    for job in JOBS:
        plan_files = sorted(Path(job["plan_dir"]).glob("interesting_plan_*.json"))
        if not plan_files:
            print(f"  No interesting plans found in {job['plan_dir']}, skipping.")
            continue
        for pf in plan_files:
            process_plan(str(pf), job["precincts"], _OUTDIR, job["state"])
    print("Done.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _cli():
    p = argparse.ArgumentParser(description="Generate district GeoJSON from interesting plan assignments.")
    p.add_argument("--state", required=True, choices=["AL", "OR"])
    p.add_argument("--precincts", required=True)
    p.add_argument("--outdir", required=True)

    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan")
    group.add_argument("--all", action="store_true")

    p.add_argument("--plan-dir")
    args = p.parse_args()

    if args.all:
        if not args.plan_dir:
            print("ERROR: --plan-dir is required when using --all")
            sys.exit(1)
        plan_dir = Path(args.plan_dir)
        plan_files = sorted(plan_dir.glob("interesting_plan_*.json"))
        if not plan_files:
            print(f"No interesting_plan_*.json files found in {plan_dir}")
            sys.exit(1)
        for pf in plan_files:
            process_plan(str(pf), args.precincts, args.outdir, args.state)
    else:
        process_plan(args.plan, args.precincts, args.outdir, args.state)

    print("Done.")


if __name__ == "__main__":
    _cli()
