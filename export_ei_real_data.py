import json
from pathlib import Path

import numpy as np
from scipy.stats import gaussian_kde

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "inputs": {
            "Black": ROOT / "AL_data" / "ei_AL_black_2x2.json",
            "White": ROOT / "AL_data" / "ei_AL_white_2x2.json",
            "Other": ROOT / "AL_data" / "ei_AL_other_2x2.json",
        },
        "out": ROOT / "AL-real-data" / "AL-EI.json",
    },
    {
        "state": "OR",
        "inputs": {
            "White": ROOT / "OR_data" / "ei_OR_white_2x2.json",
            "Hispanic": ROOT / "OR_data" / "ei_OR_latino_2x2.json",
            "Other": ROOT / "OR_data" / "ei_OR_other_2x2.json",
        },
        "out": ROOT / "OR-real-data" / "OR-EI.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_kde_points(samples: np.ndarray, x_min: float = 0.0, x_max: float = 1.0, n_points: int = 201) -> tuple[list[dict], float]:
    x_grid = np.linspace(x_min, x_max, n_points)

    if np.allclose(samples, samples[0]):
        y_grid = np.zeros_like(x_grid)
        peak_x = float(samples[0])
    else:
        kde = gaussian_kde(samples)
        y_grid = kde(x_grid)
        # clean tiny tails for nicer JSON
        y_grid = np.where(y_grid < 1e-12, 0.0, y_grid)
        peak_x = float(x_grid[np.argmax(y_grid)])

    points = [{"x": float(x), "y": float(y)} for x, y in zip(x_grid, y_grid)]
    return points, peak_x


def dem_group_payload(group_name: str, ei: dict) -> dict:
    beta = np.asarray(ei["posterior_sample_preview"]["beta"], dtype=float)
    ci_low, ci_high = ei["beta_P_dem_given_group"]["ci95"]
    kde_points, peak_x = build_kde_points(beta)

    return {
        "group": group_name,
        "peakSupportEstimate": peak_x,
        "confidenceIntervalLow": float(ci_low),
        "confidenceIntervalHigh": float(ci_high),
        "kdePoints": kde_points,
    }


def rep_group_payload(group_name: str, ei: dict) -> dict:
    beta = np.asarray(ei["posterior_sample_preview"]["beta"], dtype=float)
    rep = 1.0 - beta
    ci_low_dem, ci_high_dem = ei["beta_P_dem_given_group"]["ci95"]
    ci_low_rep = 1.0 - float(ci_high_dem)
    ci_high_rep = 1.0 - float(ci_low_dem)
    kde_points, peak_x = build_kde_points(rep)

    return {
        "group": group_name,
        "peakSupportEstimate": peak_x,
        "confidenceIntervalLow": ci_low_rep,
        "confidenceIntervalHigh": ci_high_rep,
        "kdePoints": kde_points,
    }


def export_state(job: dict) -> None:
    group_files = {group: load_json(path) for group, path in job["inputs"].items()}

    dem_groups = []
    rep_groups = []

    for group_name, ei in group_files.items():
        dem_groups.append(dem_group_payload(group_name, ei))
        rep_groups.append(rep_group_payload(group_name, ei))

    payload = {
        "stateId": job["state"],
        "electionYear": 2024,
        "candidates": [
            {
                "candidateId": "DEM_PRES_2024",
                "candidateName": "Kamala Harris",
                "party": "Democratic",
                "racialGroups": dem_groups,
            },
            {
                "candidateId": "REP_PRES_2024",
                "candidateName": "Donald Trump",
                "party": "Republican",
                "racialGroups": rep_groups,
            },
        ],
    }

    out_path = job["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote: {out_path}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()