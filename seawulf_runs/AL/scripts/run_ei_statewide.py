import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyei import TwoByTwoEI
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # CSE416-Project
INFILE = ROOT / "AL_data" / "AL_precincts_full.geojson"
OUTFILE = ROOT / "AL_data" / "ei_AL_other_2x2.json" # Change to ei_AL_black_2x2.json, ei_AL_latino_2x2.json, ei_AL_white_2x2.json, ei_AL_asian_2x2.json, ei_AL_other_2x2.json

GROUP_COL = "OTHER_VAP"   # Run for "NH_BLACK_ALONE_VAP", "LATINO_VAP", and "NH_WHITE_ALONE_VAP", "NH_ASIAN_ALONE_VAP", "OTHER_VAP"
TOTAL_COL = "VAP"                 # total population base (your project uses VAP consistently)
DEM_COL = "votes_dem"
REP_COL = "votes_rep"
GROUP = "Other"      # Change to Black_NH, Latino, White_NH, Asian_NH, Other

def main():
    gdf = gpd.read_file(INFILE)

    # Keep only rows with sensible totals
    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[GROUP_COL].to_numpy(dtype=float)
    dem = gdf[DEM_COL].to_numpy(dtype=float)
    rep = gdf[REP_COL].to_numpy(dtype=float)
    tot_votes = dem + rep

    mask = (total > 0) & (tot_votes > 0) & (group >= 0) & (group <= total)
    gdf = gdf.loc[mask].copy()

    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[GROUP_COL].to_numpy(dtype=float)
    dem = gdf[DEM_COL].to_numpy(dtype=float)
    rep = gdf[REP_COL].to_numpy(dtype=float)
    tot_votes = dem + rep

    # Fractions required by TwoByTwoEI
    x = (group / total).clip(0, 1)          # fraction of group in precinct
    y = (dem / tot_votes).clip(0, 1)        # Dem two-party vote share in precinct

    # Fit EI
    model = TwoByTwoEI(model_name="king99_pareto_modification", pareto_scale=8)
    model.fit(
        group_fraction=x,
        votes_fraction=y,
        precinct_pops=tot_votes.astype(int),
        demographic_group_name=GROUP,
        candidate_name="Dem"
    )

    print("sim_trace type:", type(model.sim_trace))
    post = model.sim_trace.posterior if hasattr(model.sim_trace, "posterior") else model.sim_trace
    print("posterior vars:", list(getattr(post, "data_vars", post.keys())))

    # --- Extract posterior draws (this pyei version stores them in sim_trace) ---
    if not hasattr(model, "sim_trace") or model.sim_trace is None:
        raise AttributeError("TwoByTwoEI has no sim_trace; can't extract posterior draws.")

    tr = model.sim_trace  # typically an ArviZ InferenceData or xarray Dataset

    # Handle both InferenceData (.posterior) and Dataset-like objects
    post = tr.posterior if hasattr(tr, "posterior") else tr

    # In this pyei version, voting prefs are named b_1 (group) and b_2 (non-group)
    beta = np.asarray(post["b_1"]).reshape(-1)       # P(Dem | GROUP)
    beta_comp = np.asarray(post["b_2"]).reshape(-1)  # P(Dem | non-GROUP)

    def summ(a):
        return {
            "mean": float(np.mean(a)),
            "median": float(np.median(a)),
            "ci95": [float(np.quantile(a, 0.025)), float(np.quantile(a, 0.975))],
        }

    out = {
        "state": "AL",
        "race_group": GROUP,
        "population_base": TOTAL_COL,
        "votes_base": "two_party_dem_share",
        "n_precincts_used": int(len(gdf)),
        "beta_P_dem_given_group": summ(beta),
        "beta_comp_P_dem_given_non_group": summ(beta_comp),
        # store a small sample for plotting/debug (not huge files)
        "posterior_sample_preview": {
            "beta": beta[:2000].tolist(),
            "beta_comp": beta_comp[:2000].tolist(),
        },
    }

    OUTFILE.parent.mkdir(parents=True, exist_ok=True)
    OUTFILE.write_text(json.dumps(out, indent=2))
    print(f"Wrote {OUTFILE} with n={out['n_precincts_used']} precincts")

if __name__ == "__main__":
    main()