import argparse
import json
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt

# PyEI
from pyei import TwoByTwoEI
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]  # scripts -> AL -> seawulf_runs -> REPO_ROOT

DEFAULT_PRECINCTS = REPO_ROOT / "AL_data" / "AL_precincts_full.geojson"
DEFAULT_OUTDIR = REPO_ROOT / "AL_data" / "ei"

def resolve_path(p: str, repo_root: Path) -> str:
    """
    If p is absolute, keep it.
    If p is relative, interpret it relative to repo_root (NOT cwd).
    """
    pp = Path(p)
    if pp.is_absolute():
        return str(pp)
    return str((repo_root / pp).resolve())


@dataclass
class EISummary:
    group: str
    n_precincts_used: int
    mean_support_group: float
    median_support_group: float
    ci95_group: Tuple[float, float]
    mean_support_nongroup: float
    median_support_nongroup: float
    ci95_nongroup: Tuple[float, float]
    party_of_choice: str
    confidence_score: float  # peak density (group curve)


def ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)


def safe_div(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    out = np.zeros_like(a, dtype=float)
    mask = b > 0
    out[mask] = a[mask] / b[mask]
    return out


def peak_density_from_hist(samples: np.ndarray, bins: int = 60) -> float:
    # Histogram-based density peak (simple + stable; matches “highest EI frequency” idea)
    hist, _ = np.histogram(samples, bins=bins, range=(0.0, 1.0), density=True)
    return float(hist.max()) if hist.size else 0.0


def summarize_samples(samples: np.ndarray) -> Tuple[float, float, Tuple[float, float], float]:
    mean = float(np.mean(samples))
    med = float(np.median(samples))
    lo = float(np.quantile(samples, 0.025))
    hi = float(np.quantile(samples, 0.975))
    peak = peak_density_from_hist(samples)
    return mean, med, (lo, hi), peak


def plot_density_hist(
    group_samples: np.ndarray,
    nongroup_samples: np.ndarray,
    title: str,
    out_png: str,
    bins: int = 60,
) -> None:
    plt.figure(figsize=(10, 5))
    plt.hist(group_samples, bins=bins, range=(0, 1), density=True, alpha=0.5, label="group")
    plt.hist(nongroup_samples, bins=bins, range=(0, 1), density=True, alpha=0.5, label="non_group")
    plt.title(title)
    plt.xlabel("Estimated Democratic vote share")
    plt.ylabel("Density (EI frequency)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_png, dpi=150)
    plt.close()


def run_two_by_two_ei(
    x_group_frac: np.ndarray,
    t_dem_frac: np.ndarray,
    n_turnout: np.ndarray,
    draws: int = 2000,
    tune: int = 1000,
    chains: int = 2,
    seed: int = 0,
) -> Tuple[np.ndarray, np.ndarray]:

    # Use a real model name that PyEI recognizes.
    # The PyEI demo uses king99 with lmbda around 0.1 for stability.
    model = TwoByTwoEI("king99", lmbda=0.1)

    # In this PyEI version, fit() uses draw_samples (not draws)
    model.fit(
        group_fraction=x_group_frac,
        votes_fraction=t_dem_frac,
        precinct_pops=n_turnout,
        tune=tune,
        draw_samples=draws,
        chains=chains,
        # optional but often helps sampling stability:
        target_accept=0.9,
    )

    svp = model.sampled_voting_prefs

    # Case 1: dict-like: {"b": ..., "w": ...}
    if isinstance(svp, dict):
        beta_b = np.asarray(svp["b"]).ravel()
        beta_w = np.asarray(svp["w"]).ravel()
        return beta_b, beta_w

    # Case 2: list/tuple-like: [b_samples, w_samples]
    if isinstance(svp, (list, tuple)):
        # Sometimes it might be [ {"b":..., "w":...} ]
        if len(svp) == 1 and isinstance(svp[0], dict) and "b" in svp[0] and "w" in svp[0]:
            beta_b = np.asarray(svp[0]["b"]).ravel()
            beta_w = np.asarray(svp[0]["w"]).ravel()
            return beta_b, beta_w

        # Common: [b, w]
        if len(svp) >= 2:
            beta_b = np.asarray(svp[0]).ravel()
            beta_w = np.asarray(svp[1]).ravel()
            return beta_b, beta_w

    # Case 3: fall back to idata/posterior if available (newer-ish patterns)
    if hasattr(model, "idata") and model.idata is not None:
        post = model.idata.posterior
        # try common variable names
        for b_name, w_name in [("b", "w"), ("beta_b", "beta_w")]:
            if b_name in post and w_name in post:
                beta_b = np.asarray(post[b_name]).ravel()
                beta_w = np.asarray(post[w_name]).ravel()
                return beta_b, beta_w

    raise TypeError(
        "Could not extract voting preference samples from model.sampled_voting_prefs "
        f"(type={type(svp)}). Available attrs: "
        f"{[a for a in dir(model) if 'sample' in a or 'idata' in a or 'trace' in a]}"
    )


def build_inputs(
    gdf: gpd.GeoDataFrame,
    group_col: str,
    vap_col: str,
    dem_col: str,
    rep_col: str,
    turnout_col: str = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    # group fraction proxy: group VAP / total VAP
    vap = gdf[vap_col].to_numpy(dtype=float)
    group_vap = gdf[group_col].to_numpy(dtype=float)
    x = safe_div(group_vap, vap)

    dem = gdf[dem_col].to_numpy(dtype=float)
    rep = gdf[rep_col].to_numpy(dtype=float)
    total_votes = dem + rep
    t = safe_div(dem, total_votes)

    # weights: use votes as “observed participants”
    n = total_votes if turnout_col is None else gdf[turnout_col].to_numpy(dtype=float)

    # filter invalid rows
    mask = (
        np.isfinite(x) & np.isfinite(t) & np.isfinite(n) &
        (x >= 0) & (x <= 1) &
        (t >= 0) & (t <= 1) &
        (n > 0)
    )
    return x[mask], t[mask], n[mask]


def main():
    ap = argparse.ArgumentParser()

    # defaults in code (no need to pass paths)
    ap.add_argument("--precincts", default=str(DEFAULT_PRECINCTS),
                    help="Path to precincts_full.geojson (default: repo_root/AL_data/AL_precincts_full.geojson)")
    ap.add_argument("--outdir", default=str(DEFAULT_OUTDIR),
                    help="Output directory for EI results (default: repo_root/AL_data/ei)")

    ap.add_argument("--state", default="AL", help="State label e.g., AL or OR")
    ap.add_argument("--groups", nargs="+", default=["NH_BLACK_ANY_VAP", "NH_WHITE_ANY_VAP"],
                    help="Group VAP columns e.g., NH_BLACK_ANY_VAP HVAP")

    ap.add_argument("--vap_col", default="VAP")
    ap.add_argument("--dem_col", default="votes_dem")
    ap.add_argument("--rep_col", default="votes_rep")

    ap.add_argument("--draws", type=int, default=2000)
    ap.add_argument("--tune", type=int, default=1000)
    ap.add_argument("--chains", type=int, default=2)
    ap.add_argument("--seed", type=int, default=0)

    args = ap.parse_args()

    # normalize to absolute paths
    precincts_path = Path(args.precincts).expanduser()
    if not precincts_path.is_absolute():
        precincts_path = (REPO_ROOT / precincts_path).resolve()

    outdir_path = Path(args.outdir).expanduser()
    if not outdir_path.is_absolute():
        outdir_path = (REPO_ROOT / outdir_path).resolve()

    outdir_path.mkdir(parents=True, exist_ok=True)

    if not precincts_path.exists():
        raise SystemExit(f"Precincts file not found: {precincts_path}")

    gdf = gpd.read_file(str(precincts_path))

    needed = [args.vap_col, args.dem_col, args.rep_col] + args.groups
    missing = [c for c in needed if c not in gdf.columns]
    if missing:
        raise SystemExit(f"Missing required columns in {precincts_path}: {missing}")

    results: Dict[str, EISummary] = {}

    for group_col in args.groups:
        x, t, n = build_inputs(
            gdf,
            group_col=group_col,
            vap_col=args.vap_col,
            dem_col=args.dem_col,
            rep_col=args.rep_col,
        )

        if len(x) < 50:
            print(f"[WARN] {args.state} {group_col}: only {len(x)} usable precincts after filtering; skipping.")
            continue

        print(f"[EI] {args.state} {group_col}: running TwoByTwoEI on {len(x)} precincts...")
        b_samples, w_samples = run_two_by_two_ei(
            x_group_frac=x,
            t_dem_frac=t,
            n_turnout=n,
            draws=args.draws,
            tune=args.tune,
            chains=args.chains,
            seed=args.seed,
        )

        b_mean, b_med, b_ci, b_peak = summarize_samples(b_samples)
        w_mean, w_med, w_ci, _ = summarize_samples(w_samples)

        party = "D" if b_mean >= 0.5 else "R"

        # title = f"{args.state} — EI estimated Democratic support (group={group_col})"
        # out_png = outdir_path / f"{args.state}_EI_{group_col}.png"
        # plot_density_hist(b_samples, w_samples, title=title, out_png=str(out_png))

        results[group_col] = EISummary(
            group=group_col,
            n_precincts_used=int(len(x)),
            mean_support_group=b_mean,
            median_support_group=b_med,
            ci95_group=b_ci,
            mean_support_nongroup=w_mean,
            median_support_nongroup=w_med,
            ci95_nongroup=w_ci,
            party_of_choice=party,
            confidence_score=b_peak,
        )

    out_json = outdir_path / f"{args.state}_ei_statewide.json"
    serializable = {
        "state": args.state,
        "election": "2024_pres_proxy_dem_vs_rep",
        "notes": {
            "group_fraction_proxy": "group_VAP / VAP",
            "vote_fraction": "votes_dem / (votes_dem + votes_rep)",
            "weights": "votes_dem + votes_rep",
            "confidence_score": "histogram density peak of group posterior (EI frequency proxy)",
        },
        "results": {
            k: {
                "n_precincts_used": v.n_precincts_used,
                "mean_support_group": v.mean_support_group,
                "median_support_group": v.median_support_group,
                "ci95_group": list(v.ci95_group),
                "mean_support_nongroup": v.mean_support_nongroup,
                "median_support_nongroup": v.median_support_nongroup,
                "ci95_nongroup": list(v.ci95_nongroup),
                "party_of_choice": v.party_of_choice,
                "confidence_score": v.confidence_score,
            }
            for k, v in results.items()
        },
    }

    with open(out_json, "w") as f:
        json.dump(serializable, f, indent=2)

    print(f"\nWrote EI JSON: {out_json}")
    print(f"Wrote EI plots into: {outdir_path}")

if __name__ == "__main__":
    main()