import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyei import TwoByTwoEI

ROOT = Path(__file__).resolve().parents[3]  # CSE416-Project
INFILE = ROOT / "AL_data" / "AL_precincts_full.geojson"
OUTDIR = ROOT / "AL_data"

TOTAL_COL = "VAP"
DEM_COL = "votes_dem"
REP_COL = "votes_rep"

GROUP_CONFIGS = [
    {"col": "NH_BLACK_ALONE_VAP", "name": "Black_NH", "outfile": "ei_AL_black_2x2.json"},
    {"col": "NH_WHITE_ALONE_VAP", "name": "White_NH", "outfile": "ei_AL_white_2x2.json"},
    {"col": "OTHER_VAP", "name": "Other", "outfile": "ei_AL_other_2x2.json"},
]


def summ(a):
    return {
        "mean": float(np.mean(a)),
        "median": float(np.median(a)),
        "ci95": [
            float(np.quantile(a, 0.025)),
            float(np.quantile(a, 0.975)),
        ],
    }


def run_ei_for_group(gdf, group_col, group_name):
    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[group_col].to_numpy(dtype=float)
    dem = gdf[DEM_COL].to_numpy(dtype=float)
    rep = gdf[REP_COL].to_numpy(dtype=float)
    tot_votes = dem + rep

    # Keep only rows with sensible totals
    mask = (total > 0) & (tot_votes > 0) & (group >= 0) & (group <= total)
    gdf_use = gdf.loc[mask].copy()

    total = gdf_use[TOTAL_COL].to_numpy(dtype=float)
    group = gdf_use[group_col].to_numpy(dtype=float)
    dem = gdf_use[DEM_COL].to_numpy(dtype=float)
    rep = gdf_use[REP_COL].to_numpy(dtype=float)
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
        raise AttributeError(f"TwoByTwoEI has no sim_trace for {group_name}; can't extract posterior draws.")

    tr = model.sim_trace
    post = tr.posterior if hasattr(tr, "posterior") else tr

    # In this pyei version:
    # b_1 = P(Dem | GROUP)
    # b_2 = P(Dem | non-GROUP)
    beta = np.asarray(post["b_1"]).reshape(-1)
    beta_comp = np.asarray(post["b_2"]).reshape(-1)

    return {
        "state": "AL",
        "race_group": group_name,
        "group_column": group_col,
        "population_base": TOTAL_COL,
        "votes_base": "two_party_dem_share",
        "n_precincts_used": int(len(gdf_use)),
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

    for cfg in GROUP_CONFIGS:
        print(f"Running EI for {cfg['name']} ({cfg['col']})...")

        out = run_ei_for_group(
            gdf=gdf,
            group_col=cfg["col"],
            group_name=cfg["name"],
        )

        outfile_path = OUTDIR / cfg["outfile"]
        outfile_path.write_text(json.dumps(out, indent=2))
        print(f"Wrote {outfile_path} with n={out['n_precincts_used']} precincts")

        results_summary.append({
            "race_group": cfg["name"],
            "group_column": cfg["col"],
            "outfile": str(outfile_path),
            "n_precincts_used": out["n_precincts_used"],
            "mean_P_dem_given_group": out["beta_P_dem_given_group"]["mean"],
            "mean_P_dem_given_non_group": out["beta_comp_P_dem_given_non_group"]["mean"],
        })

    summary_file = OUTDIR / "ei_AL_2x2_summary.json"
    summary_file.write_text(json.dumps(results_summary, indent=2))
    print(f"\nWrote summary file: {summary_file}")

    print("Done. Generated all 2x2 EI output files.")


if __name__ == "__main__":
    main()