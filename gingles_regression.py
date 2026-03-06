# scripts/gingles_regression.py
"""
Build non-linear regression curves for Gingles 2/3 plots.

Runs all configured state/group jobs in one execution.

Input examples:
  AL_data/AL_gingles_Black_precinct_table.json
  AL_data/AL_gingles_White_precinct_table.json
  OR_data/OR_gingles_Latino_precinct_table.json
  OR_data/OR_gingles_White_precinct_table.json

Output examples:
  AL_data/AL_gingles_regression_Black.json
  AL_data/AL_gingles_regression_White.json
  OR_data/OR_gingles_regression_Latino.json
  OR_data/OR_gingles_regression_White.json
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np


ROOT = Path(__file__).resolve().parent  # CSE416-Project repo root

# Configure every regression job here.
JOBS = [
    {"state": "AL", "group": "Black"},
    {"state": "AL", "group": "White"},
    {"state": "OR", "group": "Latino"},
    {"state": "OR", "group": "White"},
]


# ----------------------------- Utilities -----------------------------


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def _clip01(a: np.ndarray) -> np.ndarray:
    return np.clip(a, 0.0, 1.0)


def _train_test_split(
    x: np.ndarray, y: np.ndarray, test_frac: float = 0.2, seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    n = len(x)
    rng = np.random.default_rng(seed)
    idx = np.arange(n)
    rng.shuffle(idx)
    k = int(math.floor((1.0 - test_frac) * n))
    tr = idx[:k]
    te = idx[k:]
    return x[tr], x[te], y[tr], y[te]


def _load_precinct_table(path: Path) -> Tuple[str, str, np.ndarray, np.ndarray]:
    """
    Returns: (state, group, x(group_pct), y(dem_share))
    """
    data = json.loads(path.read_text())
    state = str(data.get("state", ""))
    group = str(data.get("group", ""))
    rows = data.get("rows", [])
    if not rows:
        raise ValueError(f"No rows found in precinct table: {path}")

    xs: List[float] = []
    ys: List[float] = []
    for r in rows:
        try:
            x = float(r["group_pct"])
            y = float(r["dem_share"])
            if not (0.0 <= x <= 1.0):
                continue
            if not (0.0 <= y <= 1.0):
                continue
            xs.append(x)
            ys.append(y)
        except Exception:
            continue

    if len(xs) < 10:
        raise ValueError(f"Too few valid points ({len(xs)}) in {path}")

    return state, group, np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)


# ----------------------------- Model defs -----------------------------


@dataclass
class CandidateModel:
    name: str
    predict: Callable[[np.ndarray], np.ndarray]
    rmse: float
    meta: Dict


def _fit_poly(
    x_tr: np.ndarray, y_tr: np.ndarray, x_te: np.ndarray, y_te: np.ndarray, degree: int
) -> CandidateModel:
    coeffs = np.polyfit(x_tr, y_tr, deg=degree)
    p = np.poly1d(coeffs)

    def pred(xx: np.ndarray) -> np.ndarray:
        return _clip01(p(xx))

    y_hat = pred(x_te)
    return CandidateModel(
        name=f"poly_deg_{degree}",
        predict=pred,
        rmse=_rmse(y_te, y_hat),
        meta={"degree": degree, "coeffs": [float(c) for c in coeffs]},
    )


def _try_fit_logistic(
    x_tr: np.ndarray, y_tr: np.ndarray, x_te: np.ndarray, y_te: np.ndarray
) -> Optional[CandidateModel]:
    """
    Optional 4-parameter logistic curve:
      y = d + (a - d) / (1 + exp(-b(x - c)))
    """
    try:
        from scipy.optimize import curve_fit  # type: ignore
    except Exception:
        return None

    def logistic(xx, a, b, c, d):
        return d + (a - d) / (1.0 + np.exp(-b * (xx - c)))

    a0 = float(np.clip(np.max(y_tr), 0, 1))
    d0 = float(np.clip(np.min(y_tr), 0, 1))
    b0 = 5.0
    c0 = 0.5
    bounds = ([0.0, -50.0, 0.0, 0.0], [1.0, 50.0, 1.0, 1.0])

    try:
        popt, _ = curve_fit(
            logistic,
            x_tr,
            y_tr,
            p0=[a0, b0, c0, d0],
            bounds=bounds,
            maxfev=20000,
        )
    except Exception:
        return None

    a, b, c, d = [float(v) for v in popt]

    def pred(xx: np.ndarray) -> np.ndarray:
        return _clip01(logistic(xx, a, b, c, d))

    y_hat = pred(x_te)
    return CandidateModel(
        name="logistic_4p",
        predict=pred,
        rmse=_rmse(y_te, y_hat),
        meta={"params": {"a": a, "b": b, "c": c, "d": d}},
    )


# ----------------------------- Main pipeline -----------------------------


def choose_best_model(x: np.ndarray, y: np.ndarray, seed: int = 42) -> CandidateModel:
    x_tr, x_te, y_tr, y_te = _train_test_split(x, y, test_frac=0.2, seed=seed)

    models: List[CandidateModel] = []

    for deg in [1, 2, 3, 4]:
        try:
            models.append(_fit_poly(x_tr, y_tr, x_te, y_te, deg))
        except Exception:
            pass

    mlog = _try_fit_logistic(x_tr, y_tr, x_te, y_te)
    if mlog is not None:
        models.append(mlog)

    if not models:
        raise RuntimeError("No regression models could be fit.")

    models.sort(key=lambda m: m.rmse)
    return models[0]


def resolve_paths(state: str, group: str) -> Tuple[Path, Path]:
    state = state.upper().strip()
    group_norm = group.strip().title()

    base = ROOT / f"{state}_data"
    infile = base / f"{state}_gingles_{group_norm}_precinct_table.json"
    outfile = base / f"{state}_gingles_regression_{group_norm}.json"
    return infile, outfile


def build_output(
    state: str,
    group: str,
    x: np.ndarray,
    y: np.ndarray,
    model: CandidateModel,
    grid_n: int = 201,
) -> Dict:
    x_grid = np.linspace(0.0, 1.0, grid_n)
    dem_curve = model.predict(x_grid)
    rep_curve = _clip01(1.0 - dem_curve)

    return {
        "state": state,
        "group": group,
        "x_label": "group_pct",
        "y_label_dem": "dem_share",
        "models_tried": None,
        "chosen_model": model.name,
        "rmse": float(model.rmse),
        "meta": model.meta,
        "n_points": int(len(x)),
        "x_grid": [float(v) for v in x_grid],
        "dem_curve": [float(v) for v in dem_curve],
        "rep_curve": [float(v) for v in rep_curve],
    }


def run_job(state: str, group: str) -> None:
    infile, outfile = resolve_paths(state, group)

    if not infile.exists():
        print(f"Skipping missing input: {infile}")
        return

    st, grp, x, y = _load_precinct_table(infile)
    best = choose_best_model(x, y, seed=42)
    payload = build_output(st, grp, x, y, best, grid_n=201)

    outfile.parent.mkdir(parents=True, exist_ok=True)
    outfile.write_text(json.dumps(payload, indent=2))

    print(f"Loaded: {infile} (n={len(x)})")
    print(f"Chosen: {best.name}  RMSE={best.rmse:.4f}")
    print(f"Wrote:  {outfile}")
    print("-" * 60)


def main() -> None:
    for job in JOBS:
        try:
            run_job(job["state"], job["group"])
        except Exception as e:
            print(f"Failed for {job['state']} {job['group']}: {e}")
            print("-" * 60)


if __name__ == "__main__":
    main()