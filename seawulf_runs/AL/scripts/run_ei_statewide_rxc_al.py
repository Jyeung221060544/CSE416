import json
from pathlib import Path

import geopandas as gpd
import numpy as np

from pyei.r_by_c import RowByColumnEI

ROOT = Path(__file__).resolve().parents[3]  # CSE416-Project
INFILE = ROOT / "AL_data" / "AL_precincts_full.geojson"
OUTDIR = ROOT / "AL_data"

TOTAL_COL = "VAP"
BASE_GROUP_COLS = ["NH_BLACK_ALONE_VAP", "NH_WHITE_ALONE_VAP", "OTHER_VAP"]
BASE_GROUP_NAMES = ["Black_NH", "White_NH", "Other"]

RESIDUAL_GROUP_COL = "UNACCOUNTED_VAP"
RESIDUAL_GROUP_NAME = "Unaccounted"

VOTE_COLS = ["votes_dem", "votes_rep"]
CANDIDATE_NAMES = ["Dem", "Rep"]


def summary_stats(draws: np.ndarray) -> dict:
    draws = np.asarray(draws, dtype=float).reshape(-1)
    return {
        "mean": float(np.mean(draws)),
        "median": float(np.median(draws)),
        "ci95": [
            float(np.quantile(draws, 0.025)),
            float(np.quantile(draws, 0.975)),
        ],
    }


def extract_posterior_array(
    model,
    candidate_idx: int,
    group_idx: int,
    group_name: str,
    group_names: list[str],
    group_counts_by_precinct: np.ndarray,
) -> np.ndarray:
    if not hasattr(model, "sim_trace") or model.sim_trace is None:
        raise AttributeError("RowByColumnEI has no sim_trace after fit().")

    tr = model.sim_trace
    post = tr.posterior if hasattr(tr, "posterior") else tr

    candidate_var_names = ["b", "beta", "theta", "posterior"]

    arr = None
    chosen_name = None
    for name in candidate_var_names:
        try:
            if name in post:
                arr = np.asarray(post[name])
                chosen_name = name
                break
        except Exception:
            pass

    if arr is None:
        try:
            keys = list(post.data_vars.keys())
        except Exception:
            try:
                keys = list(post.keys())
            except Exception:
                keys = []
        raise KeyError(
            f"Could not find posterior group-support array in sim_trace. Keys seen: {keys}"
        )

    arr = np.asarray(arr, dtype=float)
    weights = np.asarray(group_counts_by_precinct, dtype=float).reshape(-1)

    if weights.ndim != 1:
        raise ValueError("group_counts_by_precinct must be 1D")
    if len(weights) == 0:
        raise ValueError("group_counts_by_precinct is empty")
    if not np.all(np.isfinite(weights)):
        raise ValueError("group_counts_by_precinct contains NaN/inf")

    weight_sum = weights.sum()
    if weight_sum <= 0:
        raise ValueError(f"Group '{group_name}' has zero total weight across precincts.")

    shape = arr.shape

    if arr.ndim == 4:
        if shape[-2] == len(group_names) and shape[-1] == len(CANDIDATE_NAMES):
            draws = arr[:, :, group_idx, candidate_idx].reshape(-1)
        elif shape[-2] == len(CANDIDATE_NAMES) and shape[-1] == len(group_names):
            draws = arr[:, :, candidate_idx, group_idx].reshape(-1)
        else:
            raise ValueError(f"Unexpected 4D posterior shape for {chosen_name}: {shape}")

    elif arr.ndim == 3:
        if shape[-2] == len(group_names) and shape[-1] == len(CANDIDATE_NAMES):
            draws = arr[:, group_idx, candidate_idx].reshape(-1)
        elif shape[-2] == len(CANDIDATE_NAMES) and shape[-1] == len(group_names):
            draws = arr[:, candidate_idx, group_idx].reshape(-1)
        else:
            raise ValueError(f"Unexpected 3D posterior shape for {chosen_name}: {shape}")

    elif arr.ndim == 5:
        if shape[2] != len(weights):
            raise ValueError(
                f"Posterior precinct dimension {shape[2]} does not match "
                f"number of precinct weights {len(weights)}"
            )

        if shape[3] == len(group_names) and shape[4] == len(CANDIDATE_NAMES):
            precinct_draws = arr[:, :, :, group_idx, candidate_idx]
        elif shape[3] == len(CANDIDATE_NAMES) and shape[4] == len(group_names):
            precinct_draws = arr[:, :, :, candidate_idx, group_idx]
        else:
            raise ValueError(f"Unexpected 5D posterior shape for {chosen_name}: {shape}")

        draws = np.tensordot(
            precinct_draws,
            weights / weight_sum,
            axes=([2], [0]),
        ).reshape(-1)

    else:
        raise ValueError(f"Unexpected posterior ndim for {chosen_name}: shape={shape}")

    return np.asarray(draws, dtype=float)


def build_inputs(gdf: gpd.GeoDataFrame):
    needed = [TOTAL_COL, *BASE_GROUP_COLS, *VOTE_COLS]
    missing = [c for c in needed if c not in gdf.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    g = gdf.copy()

    for c in needed:
        g[c] = np.asarray(g[c], dtype=float)

    two_party = g["votes_dem"] + g["votes_rep"]

    mask = (
        (g[TOTAL_COL] > 0)
        & (two_party > 0)
        & (g[BASE_GROUP_COLS] >= 0).all(axis=1)
    )
    g = g.loc[mask].copy()

    base_group_sum = g[BASE_GROUP_COLS].sum(axis=1)
    g = g.loc[base_group_sum <= g[TOTAL_COL] + 1e-6].copy()

    g[RESIDUAL_GROUP_COL] = g[TOTAL_COL] - g[BASE_GROUP_COLS].sum(axis=1)
    g[RESIDUAL_GROUP_COL] = np.clip(
        np.asarray(g[RESIDUAL_GROUP_COL], dtype=float), 0.0, None
    )

    candidate_group_cols = [*BASE_GROUP_COLS, RESIDUAL_GROUP_COL]
    candidate_group_names = [*BASE_GROUP_NAMES, RESIDUAL_GROUP_NAME]

    # Drop any group with zero statewide population after filtering
    active_group_cols = []
    active_group_names = []
    for col, name in zip(candidate_group_cols, candidate_group_names):
        total_group_pop = float(g[col].sum())
        if total_group_pop > 0:
            active_group_cols.append(col)
            active_group_names.append(name)

    if len(active_group_cols) < 2:
        raise ValueError(
            f"Need at least 2 demographic groups with positive population, got {active_group_names}"
        )

    full_group_sum = g[active_group_cols].sum(axis=1)
    g = g.loc[full_group_sum > 0].copy()

    total = g[TOTAL_COL].to_numpy(dtype=float)
    votes_total = (g["votes_dem"] + g["votes_rep"]).to_numpy(dtype=float)

    group_fractions_pxg = g[active_group_cols].to_numpy(dtype=float) / total[:, None]
    votes_fractions_pxc = g[VOTE_COLS].to_numpy(dtype=float) / votes_total[:, None]

    group_fractions_pxg = np.clip(group_fractions_pxg, 0.0, 1.0)
    votes_fractions_pxc = np.clip(votes_fractions_pxc, 0.0, 1.0)

    group_fractions_pxg = (
        group_fractions_pxg / group_fractions_pxg.sum(axis=1, keepdims=True)
    )
    votes_fractions_pxc = (
        votes_fractions_pxc / votes_fractions_pxc.sum(axis=1, keepdims=True)
    )

    if not np.all(np.isfinite(group_fractions_pxg)):
        raise ValueError("group_fractions contains NaN or inf")
    if not np.all(np.isfinite(votes_fractions_pxc)):
        raise ValueError("votes_fractions contains NaN or inf")

    precinct_group_sums = group_fractions_pxg.sum(axis=1)
    precinct_vote_sums = votes_fractions_pxc.sum(axis=1)

    if not np.allclose(precinct_group_sums, 1.0, atol=1e-10):
        bad_idx = np.where(~np.isclose(precinct_group_sums, 1.0, atol=1e-10))[0][:10]
        raise ValueError(
            "Precinct-row demographic shares do not sum to 1. "
            f"Example bad row sums: {precinct_group_sums[bad_idx].tolist()}"
        )

    if not np.allclose(precinct_vote_sums, 1.0, atol=1e-10):
        bad_idx = np.where(~np.isclose(precinct_vote_sums, 1.0, atol=1e-10))[0][:10]
        raise ValueError(
            "Precinct-row vote shares do not sum to 1. "
            f"Example bad row sums: {precinct_vote_sums[bad_idx].tolist()}"
        )

    group_fractions = group_fractions_pxg.T
    votes_fractions = votes_fractions_pxc.T

    group_check = group_fractions.sum(axis=0)
    vote_check = votes_fractions.sum(axis=0)

    if not np.allclose(group_check, 1.0, atol=1e-10):
        bad_idx = np.where(~np.isclose(group_check, 1.0, atol=1e-10))[0][:10]
        raise ValueError(
            "Transposed group_fractions do not sum to 1 within precincts. "
            f"Example bad precinct sums: {group_check[bad_idx].tolist()}"
        )

    if not np.allclose(vote_check, 1.0, atol=1e-10):
        bad_idx = np.where(~np.isclose(vote_check, 1.0, atol=1e-10))[0][:10]
        raise ValueError(
            "Transposed votes_fractions do not sum to 1 within precincts. "
            f"Example bad precinct sums: {vote_check[bad_idx].tolist()}"
        )

    precinct_pops = votes_total.astype(int)

    return g, group_fractions, votes_fractions, precinct_pops, active_group_cols, active_group_names


def main():
    gdf = gpd.read_file(INFILE)
    OUTDIR.mkdir(parents=True, exist_ok=True)

    (
        g_used,
        group_fractions,
        votes_fractions,
        precinct_pops,
        group_cols,
        group_names,
    ) = build_inputs(gdf)

    print("Prepared inputs:")
    print("  n_precincts_used:", len(g_used))
    print("  active groups:", group_names)
    print("  group_fractions shape:", group_fractions.shape)
    print("  votes_fractions shape:", votes_fractions.shape)
    print("  Any NaN in group_fractions:", bool(np.isnan(group_fractions).any()))
    print("  Any inf in group_fractions:", bool(np.isinf(group_fractions).any()))
    print(
        "  precinct sums from group_fractions:",
        float(group_fractions.sum(axis=0).min()),
        float(group_fractions.sum(axis=0).max()),
    )
    print(
        "  precinct sums from votes_fractions:",
        float(votes_fractions.sum(axis=0).min()),
        float(votes_fractions.sum(axis=0).max()),
    )

    model = RowByColumnEI(model_name="multinomial-dirichlet-modified")
    model.fit(
        group_fractions=group_fractions,
        votes_fractions=votes_fractions,
        precinct_pops=precinct_pops,
        demographic_group_names=group_names,
        candidate_names=CANDIDATE_NAMES,
        tune=1000,
        draw_samples=1000,
        target_accept=0.95,
        chains=2,
        cores=2,
        random_seed=42,
        progressbar=True,
    )
    

    group_counts_matrix = group_fractions * precinct_pops[None, :]

    group_results = []
    full_payload = {
        "state": "AL",
        "model_type": "RxC",
        "model_name": "multinomial-dirichlet-modified",
        "population_base": TOTAL_COL,
        "vote_columns": VOTE_COLS,
        "group_columns": group_cols,
        "group_names": group_names,
        "candidate_names": CANDIDATE_NAMES,
        "n_precincts_used": int(len(g_used)),
        "groups": {},
    }

    for gi, (group_col, group_name) in enumerate(zip(group_cols, group_names)):
        group_counts_by_precinct = group_counts_matrix[gi, :]

        dem_draws = extract_posterior_array(
            model=model,
            candidate_idx=0,
            group_idx=gi,
            group_name=group_name,
            group_names=group_names,
            group_counts_by_precinct=group_counts_by_precinct,
        )
        rep_draws = extract_posterior_array(
            model=model,
            candidate_idx=1,
            group_idx=gi,
            group_name=group_name,
            group_names=group_names,
            group_counts_by_precinct=group_counts_by_precinct,
        )

        payload = {
            "state": "AL",
            "race_group": group_name,
            "group_column": group_col,
            "population_base": TOTAL_COL,
            "votes_base": "two_party_vote_share",
            "n_precincts_used": int(len(g_used)),
            "P_dem_given_group": summary_stats(dem_draws),
            "P_rep_given_group": summary_stats(rep_draws),
            "posterior_sample_preview": {
                "dem": dem_draws[:2000].tolist(),
                "rep": rep_draws[:2000].tolist(),
            },
        }

        full_payload["groups"][group_name] = payload
        group_results.append(
            {
                "race_group": group_name,
                "group_column": group_col,
                "n_precincts_used": int(len(g_used)),
                "mean_P_dem_given_group": payload["P_dem_given_group"]["mean"],
                "mean_P_rep_given_group": payload["P_rep_given_group"]["mean"],
            }
        )

    (OUTDIR / "ei_AL_rxc_full.json").write_text(json.dumps(full_payload, indent=2))
    (OUTDIR / "ei_AL_rxc_summary.json").write_text(json.dumps(group_results, indent=2))

    print(f"Wrote {(OUTDIR / 'ei_AL_rxc_full.json')}")
    print(f"Wrote {(OUTDIR / 'ei_AL_rxc_summary.json')}")
    print("Done.")


if __name__ == "__main__":
    main()