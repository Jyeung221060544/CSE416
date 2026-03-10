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
        "input": ROOT / "AL_data" / "ei_AL_rxc_full.json",
        "out": ROOT / "AL-real-data" / "AL-EI-compare.json",
    },
    {
        "state": "OR",
        "input": ROOT / "OR_data" / "ei_OR_rxc_full.json",
        "out": ROOT / "OR-real-data" / "OR-EI-compare.json",
    },
]

DISPLAY_LABELS = {
    "Black_NH": "Black",
    "White_NH": "White",
    "Latino": "Latino",
    "Other": "Other",
    "Unaccounted": "Unaccounted",
}

DISPLAY_ORDER = ["Black_NH", "Latino", "White_NH", "Other", "Unaccounted"]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def build_kde_points(samples: np.ndarray, n_points: int = 201) -> tuple[list[dict], float]:
    x_grid = np.linspace(-1.0, 1.0, n_points)

    if len(samples) == 0:
        raise ValueError("No samples provided for KDE.")

    if np.allclose(samples, samples[0]):
        y_grid = np.zeros_like(x_grid)
        peak_x = float(samples[0])
    else:
        kde = gaussian_kde(samples)
        y_grid = kde(x_grid)
        peak_x = float(x_grid[np.argmax(y_grid)])

    points = [{"x": float(x), "y": float(y)} for x, y in zip(x_grid, y_grid)]
    return points, peak_x


def candidate_payload(candidate_id: str, candidate_name: str, party: str, diff_samples: np.ndarray) -> dict:
    kde_points, peak_diff = build_kde_points(diff_samples)
    prob_gt = float(np.mean(diff_samples > DIFFERENCE_THRESHOLD))
    prob_lt = float(np.mean(diff_samples < -DIFFERENCE_THRESHOLD))

    return {
        "candidateId": candidate_id,
        "candidateName": candidate_name,
        "party": party,
        "peakDifference": peak_diff,
        "probDifferenceGT": prob_gt,
        "probDifferenceLT": prob_lt,
        "kdePoints": kde_points,
    }


def get_group_draws(rxc_payload: dict, group_name: str) -> tuple[np.ndarray, np.ndarray]:
    groups = rxc_payload.get("groups", {})
    if group_name not in groups:
        raise KeyError(f"Missing group '{group_name}' in RxC payload")

    group_payload = groups[group_name]
    preview = group_payload.get("posterior_sample_preview", {})

    dem = np.asarray(preview.get("dem", []), dtype=float)
    rep = np.asarray(preview.get("rep", []), dtype=float)

    if dem.size == 0 or rep.size == 0:
        raise ValueError(f"Missing posterior samples for group '{group_name}'")

    n = min(len(dem), len(rep))
    return dem[:n], rep[:n]


def build_pair_payload(group_a: str, group_b: str, dem_a: np.ndarray, rep_a: np.ndarray, dem_b: np.ndarray, rep_b: np.ndarray) -> dict:
    dem_diff = dem_a - dem_b
    rep_diff = rep_a - rep_b

    return {
        "groups": [group_a, group_b],
        "label": f"{DISPLAY_LABELS.get(group_a, group_a)} \u2212 {DISPLAY_LABELS.get(group_b, group_b)}",
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


def sorted_group_names(rxc_payload: dict) -> list[str]:
    names = list(rxc_payload.get("groups", {}).keys())

    def sort_key(name: str):
        try:
            return (0, DISPLAY_ORDER.index(name))
        except ValueError:
            return (1, name)

    return sorted(names, key=sort_key)


def export_state(job: dict) -> None:
    state = job["state"]
    out_path = job["out"]
    rxc_payload = load_json(job["input"])

    all_groups = sorted_group_names(rxc_payload)

    # Skip "Unaccounted" from UI comparisons unless you explicitly want it displayed
    active_groups = [g for g in all_groups if g != "Unaccounted"]

    group_support = []
    for g in active_groups:
        group_info = rxc_payload["groups"][g]
        group_support.append(
            {
                "groupKey": g,
                "groupLabel": DISPLAY_LABELS.get(g, g),
                "meanDemSupport": group_info["P_dem_given_group"]["mean"],
                "meanRepSupport": group_info["P_rep_given_group"]["mean"],
                "demCI95": group_info["P_dem_given_group"]["ci95"],
                "repCI95": group_info["P_rep_given_group"]["ci95"],
            }
        )

    race_pairs = []
    for group_a, group_b in combinations(active_groups, 2):
        dem_a, rep_a = get_group_draws(rxc_payload, group_a)
        dem_b, rep_b = get_group_draws(rxc_payload, group_b)

        n = min(len(dem_a), len(dem_b), len(rep_a), len(rep_b))
        race_pairs.append(
            build_pair_payload(
                group_a,
                group_b,
                dem_a[:n],
                rep_a[:n],
                dem_b[:n],
                rep_b[:n],
            )
        )

    payload = {
        "stateId": state,
        "electionYear": 2024,
        "modelType": "RxC",
        "differenceThreshold": DIFFERENCE_THRESHOLD,
        "groups": group_support,
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

# import json
# from itertools import combinations
# from pathlib import Path

# import numpy as np
# from scipy.stats import gaussian_kde

# ROOT = Path(__file__).resolve().parent

# DIFFERENCE_THRESHOLD = 0.30

# JOBS = [
#     {
#         "state": "AL",
#         "inputs": {
#             "black": ROOT / "AL_data" / "ei_AL_black_2x2.json",
#             "other": ROOT / "AL_data" / "ei_AL_other_2x2.json",
#             "white": ROOT / "AL_data" / "ei_AL_white_2x2.json",
#         },
#         "out": ROOT / "AL-real-data" / "AL-EI-compare.json",
#     },
#     {
#         "state": "OR",
#         "inputs": {
#             "hispanic": ROOT / "OR_data" / "ei_OR_latino_2x2.json",
#             "other": ROOT / "OR_data" / "ei_OR_other_2x2.json",
#             "white": ROOT / "OR_data" / "ei_OR_white_2x2.json",
#         },
#         "out": ROOT / "OR-real-data" / "OR-EI-compare.json",
#     },
# ]

# DISPLAY_LABELS = {
#     "asian": "Asian",
#     "black": "Black",
#     "hispanic": "Hispanic",
#     "other": "Other",
#     "white": "White",
# }


# def load_beta_samples(path: Path) -> np.ndarray:
#     data = json.loads(path.read_text())
#     beta = data["posterior_sample_preview"]["beta"]
#     return np.asarray(beta, dtype=float)


# def build_kde_points(samples: np.ndarray, n_points: int = 201) -> tuple[list[dict], float]:
#     x_grid = np.linspace(-1.0, 1.0, n_points)

#     # If all samples are nearly identical, KDE can fail; handle safely.
#     if np.allclose(samples, samples[0]):
#         y_grid = np.zeros_like(x_grid)
#         peak_x = float(samples[0])
#     else:
#         kde = gaussian_kde(samples)
#         y_grid = kde(x_grid)
#         peak_x = float(x_grid[np.argmax(y_grid)])

#     points = [
#         {"x": float(x), "y": float(y)}
#         for x, y in zip(x_grid, y_grid)
#     ]
#     return points, peak_x


# def candidate_payload(candidate_id: str, candidate_name: str, party: str, diff_samples: np.ndarray) -> dict:
#     kde_points, peak_diff = build_kde_points(diff_samples)
#     prob_gt = float(np.mean(diff_samples > DIFFERENCE_THRESHOLD))

#     return {
#         "candidateId": candidate_id,
#         "candidateName": candidate_name,
#         "party": party,
#         "peakDifference": peak_diff,
#         "probDifferenceGT": prob_gt,
#         "kdePoints": kde_points,
#     }


# def build_pair_payload(race_a: str, race_b: str, beta_a: np.ndarray, beta_b: np.ndarray) -> dict:
#     dem_diff = beta_a - beta_b
#     rep_diff = -dem_diff

#     return {
#         "races": [race_a, race_b],
#         "label": f"{DISPLAY_LABELS[race_a]} \u2212 {DISPLAY_LABELS[race_b]}",
#         "candidates": [
#             candidate_payload(
#                 candidate_id="DEM_PRES_2024",
#                 candidate_name="Kamala Harris",
#                 party="Democratic",
#                 diff_samples=dem_diff,
#             ),
#             candidate_payload(
#                 candidate_id="REP_PRES_2024",
#                 candidate_name="Donald Trump",
#                 party="Republican",
#                 diff_samples=rep_diff,
#             ),
#         ],
#     }


# def export_state(job: dict) -> None:
#     state = job["state"]
#     inputs = job["inputs"]
#     out_path = job["out"]

#     betas = {race: load_beta_samples(path) for race, path in inputs.items()}

#     race_pairs = []
#     for race_a, race_b in combinations(inputs.keys(), 2):
#         race_pairs.append(
#             build_pair_payload(race_a, race_b, betas[race_a], betas[race_b])
#         )

#     payload = {
#         "stateId": state,
#         "electionYear": 2024,
#         "differenceThreshold": DIFFERENCE_THRESHOLD,
#         "racePairs": race_pairs,
#     }

#     out_path.parent.mkdir(parents=True, exist_ok=True)
#     out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
#     print(f"Wrote: {out_path}")


# def main():
#     for job in JOBS:
#         export_state(job)


# if __name__ == "__main__":
#     main()