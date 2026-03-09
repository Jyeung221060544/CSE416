import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyei import TwoByTwoEI

ROOT = Path(__file__).resolve().parents[3]  # CSE416-Project
INFILE = ROOT / "OR_data" / "OR_precincts_full.geojson"
OUTDIR = ROOT / "OR_data"

TOTAL_COL = "VAP"
DEM_COL = "votes_dem"
REP_COL = "votes_rep"

GROUP_SPECS = [
    {"col": "LATINO_VAP", "name": "Latino", "outfile": "ei_OR_latino_2x2.json"},
    {"col": "NH_WHITE_ALONE_VAP", "name": "White_NH", "outfile": "ei_OR_white_2x2.json"},
    {"col": "OTHER_VAP", "name": "Other", "outfile": "ei_OR_other_2x2.json"},
]


def summ(a: np.ndarray) -> dict:
    return {
        "mean": float(np.mean(a)),
        "median": float(np.median(a)),
        "ci95": [float(np.quantile(a, 0.025)), float(np.quantile(a, 0.975))],
    }


def fit_group(gdf: gpd.GeoDataFrame, group_col: str, group_name: str) -> dict:
    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[group_col].to_numpy(dtype=float)
    dem = gdf[DEM_COL].to_numpy(dtype=float)
    rep = gdf[REP_COL].to_numpy(dtype=float)
    tot_votes = dem + rep

    # Keep only rows with sensible totals for this group
    mask = (total > 0) & (tot_votes > 0) & (group >= 0) & (group <= total)
    g = gdf.loc[mask].copy()

    total = g[TOTAL_COL].to_numpy(dtype=float)
    group = g[group_col].to_numpy(dtype=float)
    dem = g[DEM_COL].to_numpy(dtype=float)
    rep = g[REP_COL].to_numpy(dtype=float)
    tot_votes = dem + rep

    # Fractions required by TwoByTwoEI
    x = (group / total).clip(0, 1)      # fraction of group in precinct
    y = (dem / tot_votes).clip(0, 1)    # Dem two-party vote share in precinct

    model = TwoByTwoEI(
        model_name="king99_pareto_modification",
        pareto_scale=8
    )
    model.fit(
        group_fraction=x,
        votes_fraction=y,
        precinct_pops=tot_votes.astype(int),
        demographic_group_name=group_name,
        candidate_name="Dem",
    )

    if not hasattr(model, "sim_trace") or model.sim_trace is None:
        raise AttributeError(f"TwoByTwoEI for {group_name} has no sim_trace; can't extract posterior draws.")

    tr = model.sim_trace
    post = tr.posterior if hasattr(tr, "posterior") else tr

    # In this pyei version: b_1 = group, b_2 = complement
    beta = np.asarray(post["b_1"]).reshape(-1)
    beta_comp = np.asarray(post["b_2"]).reshape(-1)

    return {
        "state": "OR",
        "race_group": group_name,
        "population_base": TOTAL_COL,
        "group_column": group_col,
        "votes_base": "two_party_dem_share",
        "n_precincts_used": int(len(g)),
        "beta_P_dem_given_group": summ(beta),
        "beta_comp_P_dem_given_non_group": summ(beta_comp),
        "posterior_sample_preview": {
            "beta": beta[:2000].tolist(),
            "beta_comp": beta_comp[:2000].tolist(),
        },
    }


def main():
    gdf = gpd.read_file(INFILE)
    OUTDIR.mkdir(parents=True, exist_ok=True)

    results_summary = []

    for spec in GROUP_SPECS:
        group_col = spec["col"]
        group_name = spec["name"]
        outfile = OUTDIR / spec["outfile"]

        print(f"\nRunning EI for {group_name} ({group_col})...")
        out = fit_group(gdf, group_col, group_name)

        outfile.write_text(json.dumps(out, indent=2))
        print(f"Wrote {outfile} with n={out['n_precincts_used']} precincts")

        results_summary.append({
            "race_group": group_name,
            "group_column": group_col,
            "outfile": str(outfile),
            "n_precincts_used": out["n_precincts_used"],
            "mean_P_dem_given_group": out["beta_P_dem_given_group"]["mean"],
            "mean_P_dem_given_non_group": out["beta_comp_P_dem_given_non_group"]["mean"],
        })

    # Optional: write one combined summary file too
    summary_file = OUTDIR / "ei_OR_2x2_summary.json"
    summary_file.write_text(json.dumps(results_summary, indent=2))
    print(f"\nWrote summary file: {summary_file}")


if __name__ == "__main__":
    main()