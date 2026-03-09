import json
from itertools import combinations
from pathlib import Path

import numpy as np
from scipy.stats import gaussian_kde

ROOT = Path(__file__).resolve().parent

DIFFERENCE_THRESHOLD = 0.30

JOBS = [
    {
        "state": "AL",
        "inputs": {
            "asian": ROOT / "AL_data" / "ei_AL_asian_2x2.json",
            "black": ROOT / "AL_data" / "ei_AL_black_2x2.json",
            "hispanic": ROOT / "AL_data" / "ei_AL_latino_2x2.json",
            "other": ROOT / "AL_data" / "ei_AL_other_2x2.json",
            "white": ROOT / "AL_data" / "ei_AL_white_2x2.json",
        },
        "out": ROOT / "AL-real-data" / "AL-EI-compare.json",
    },
    {
        "state": "OR",
        "inputs": {
            "asian": ROOT / "OR_data" / "ei_OR_asian_2x2.json",
            "black": ROOT / "OR_data" / "ei_OR_black_2x2.json",
            "hispanic": ROOT / "OR_data" / "ei_OR_latino_2x2.json",
            "other": ROOT / "OR_data" / "ei_OR_other_2x2.json",
            "white": ROOT / "OR_data" / "ei_OR_white_2x2.json",
        },
        "out": ROOT / "OR-real-data" / "OR-EI-compare.json",
    },
]

DISPLAY_LABELS = {
    "asian": "Asian",
    "black": "Black",
    "hispanic": "Hispanic",
    "other": "Other",
    "white": "White",
}


def load_beta_samples(path: Path) -> np.ndarray:
    data = json.loads(path.read_text())
    beta = data["posterior_sample_preview"]["beta"]
    return np.asarray(beta, dtype=float)


def build_kde_points(samples: np.ndarray, n_points: int = 201) -> tuple[list[dict], float]:
    x_grid = np.linspace(-1.0, 1.0, n_points)

    # If all samples are nearly identical, KDE can fail; handle safely.
    if np.allclose(samples, samples[0]):
        y_grid = np.zeros_like(x_grid)
        peak_x = float(samples[0])
    else:
        kde = gaussian_kde(samples)
        y_grid = kde(x_grid)
        peak_x = float(x_grid[np.argmax(y_grid)])

    points = [
        {"x": float(x), "y": float(y)}
        for x, y in zip(x_grid, y_grid)
    ]
    return points, peak_x


def candidate_payload(candidate_id: str, candidate_name: str, party: str, diff_samples: np.ndarray) -> dict:
    kde_points, peak_diff = build_kde_points(diff_samples)
    prob_gt = float(np.mean(diff_samples > DIFFERENCE_THRESHOLD))

    return {
        "candidateId": candidate_id,
        "candidateName": candidate_name,
        "party": party,
        "peakDifference": peak_diff,
        "probDifferenceGT": prob_gt,
        "kdePoints": kde_points,
    }


def build_pair_payload(race_a: str, race_b: str, beta_a: np.ndarray, beta_b: np.ndarray) -> dict:
    dem_diff = beta_a - beta_b
    rep_diff = -dem_diff

    return {
        "races": [race_a, race_b],
        "label": f"{DISPLAY_LABELS[race_a]} \u2212 {DISPLAY_LABELS[race_b]}",
        "candidates": [
            candidate_payload(
                candidate_id="DEM_PRES_2024",
                candidate_name="Kamala Harris",
                party="Democratic",
                diff_samples=dem_diff,
            ),
            candidate_payload(
                candidate_id="REP_PRES_2024",
                candidate_name="Donald Trump",
                party="Republican",
                diff_samples=rep_diff,
            ),
        ],
    }


def export_state(job: dict) -> None:
    state = job["state"]
    inputs = job["inputs"]
    out_path = job["out"]

    betas = {race: load_beta_samples(path) for race, path in inputs.items()}

    race_pairs = []
    for race_a, race_b in combinations(inputs.keys(), 2):
        race_pairs.append(
            build_pair_payload(race_a, race_b, betas[race_a], betas[race_b])
        )

    payload = {
        "stateId": state,
        "electionYear": 2024,
        "differenceThreshold": DIFFERENCE_THRESHOLD,
        "racePairs": race_pairs,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote: {out_path}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()