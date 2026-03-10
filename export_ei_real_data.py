import json
from pathlib import Path

import numpy as np
from scipy.stats import gaussian_kde

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "input": ROOT / "AL_data" / "ei_AL_rxc_full.json",
        "out": ROOT / "AL-real-data" / "AL-EI.json",
    },
    {
        "state": "OR",
        "input": ROOT / "OR_data" / "ei_OR_rxc_full.json",
        "out": ROOT / "OR-real-data" / "OR-EI.json",
    },
]

DISPLAY_LABELS = {
    "Black_NH": "Black",
    "White_NH": "White",
    "Latino": "Hispanic",
    "Other": "Other",
    "Unaccounted": "Unaccounted",
}

DISPLAY_ORDER = ["Black_NH", "Latino", "White_NH", "Other", "Unaccounted"]

CANDIDATES = [
    {
        "candidateId": "DEM_PRES_2024",
        "candidateName": "Kamala Harris",
        "party": "Democratic",
        "draw_key": "dem",
        "summary_key": "P_dem_given_group",
    },
    {
        "candidateId": "REP_PRES_2024",
        "candidateName": "Donald Trump",
        "party": "Republican",
        "draw_key": "rep",
        "summary_key": "P_rep_given_group",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_kde_points(
    samples: np.ndarray,
    x_min: float = 0.0,
    x_max: float = 1.0,
    n_points: int = 201,
) -> tuple[list[dict], float]:
    x_grid = np.linspace(x_min, x_max, n_points)

    if len(samples) == 0:
        raise ValueError("No posterior samples provided for KDE.")

    if np.allclose(samples, samples[0]):
        y_grid = np.zeros_like(x_grid)
        peak_x = float(samples[0])
    else:
        kde = gaussian_kde(samples)
        y_grid = kde(x_grid)
        y_grid = np.where(y_grid < 1e-12, 0.0, y_grid)
        peak_x = float(x_grid[np.argmax(y_grid)])

    points = [{"x": float(x), "y": float(y)} for x, y in zip(x_grid, y_grid)]
    return points, peak_x


def sort_group_names(group_names: list[str]) -> list[str]:
    def sort_key(name: str):
        try:
            return (0, DISPLAY_ORDER.index(name))
        except ValueError:
            return (1, name)

    return sorted(group_names, key=sort_key)


def build_group_payload(group_key: str, group_info: dict, draw_key: str, summary_key: str) -> dict:
    preview = group_info.get("posterior_sample_preview", {})
    samples = np.asarray(preview.get(draw_key, []), dtype=float)

    if samples.size == 0:
        raise ValueError(f"Missing posterior '{draw_key}' samples for group '{group_key}'")

    summary = group_info.get(summary_key, {})
    ci_low, ci_high = summary.get("ci95", [0.0, 0.0])

    kde_points, peak_x = build_kde_points(samples)

    return {
        "group": DISPLAY_LABELS.get(group_key, group_key),
        "groupKey": group_key,
        "peakSupportEstimate": peak_x,
        "meanSupportEstimate": float(summary.get("mean", 0.0)),
        "medianSupportEstimate": float(summary.get("median", 0.0)),
        "confidenceIntervalLow": float(ci_low),
        "confidenceIntervalHigh": float(ci_high),
        "kdePoints": kde_points,
    }


def export_state(job: dict) -> None:
    rxc = load_json(job["input"])
    groups = rxc.get("groups", {})

    if not groups:
        raise ValueError(f"No groups found in {job['input']}")

    group_names = sort_group_names(list(groups.keys()))
    active_groups = [g for g in group_names if g != "Unaccounted"]

    candidates_out = []
    for cand in CANDIDATES:
        racial_groups = []
        for group_key in active_groups:
            group_info = groups[group_key]
            racial_groups.append(
                build_group_payload(
                    group_key=group_key,
                    group_info=group_info,
                    draw_key=cand["draw_key"],
                    summary_key=cand["summary_key"],
                )
            )

        candidates_out.append(
            {
                "candidateId": cand["candidateId"],
                "candidateName": cand["candidateName"],
                "party": cand["party"],
                "racialGroups": racial_groups,
            }
        )

    payload = {
        "stateId": job["state"],
        "electionYear": 2024,
        "modelType": "RxC",
        "candidates": candidates_out,
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

# import json
# from pathlib import Path

# import numpy as np
# from scipy.stats import gaussian_kde

# ROOT = Path(__file__).resolve().parent

# JOBS = [
#     {
#         "state": "AL",
#         "inputs": {
#             "Black": ROOT / "AL_data" / "ei_AL_black_2x2.json",
#             "White": ROOT / "AL_data" / "ei_AL_white_2x2.json",
#             "Other": ROOT / "AL_data" / "ei_AL_other_2x2.json",
#         },
#         "out": ROOT / "AL-real-data" / "AL-EI.json",
#     },
#     {
#         "state": "OR",
#         "inputs": {
#             "White": ROOT / "OR_data" / "ei_OR_white_2x2.json",
#             "Hispanic": ROOT / "OR_data" / "ei_OR_latino_2x2.json",
#             "Other": ROOT / "OR_data" / "ei_OR_other_2x2.json",
#         },
#         "out": ROOT / "OR-real-data" / "OR-EI.json",
#     },
# ]


# def load_json(path: Path) -> dict:
#     with path.open("r", encoding="utf-8") as f:
#         return json.load(f)


# def build_kde_points(samples: np.ndarray, x_min: float = 0.0, x_max: float = 1.0, n_points: int = 201) -> tuple[list[dict], float]:
#     x_grid = np.linspace(x_min, x_max, n_points)

#     if np.allclose(samples, samples[0]):
#         y_grid = np.zeros_like(x_grid)
#         peak_x = float(samples[0])
#     else:
#         kde = gaussian_kde(samples)
#         y_grid = kde(x_grid)
#         # clean tiny tails for nicer JSON
#         y_grid = np.where(y_grid < 1e-12, 0.0, y_grid)
#         peak_x = float(x_grid[np.argmax(y_grid)])

#     points = [{"x": float(x), "y": float(y)} for x, y in zip(x_grid, y_grid)]
#     return points, peak_x


# def dem_group_payload(group_name: str, ei: dict) -> dict:
#     beta = np.asarray(ei["posterior_sample_preview"]["beta"], dtype=float)
#     ci_low, ci_high = ei["beta_P_dem_given_group"]["ci95"]
#     kde_points, peak_x = build_kde_points(beta)

#     return {
#         "group": group_name,
#         "peakSupportEstimate": peak_x,
#         "confidenceIntervalLow": float(ci_low),
#         "confidenceIntervalHigh": float(ci_high),
#         "kdePoints": kde_points,
#     }


# def rep_group_payload(group_name: str, ei: dict) -> dict:
#     beta = np.asarray(ei["posterior_sample_preview"]["beta"], dtype=float)
#     rep = 1.0 - beta
#     ci_low_dem, ci_high_dem = ei["beta_P_dem_given_group"]["ci95"]
#     ci_low_rep = 1.0 - float(ci_high_dem)
#     ci_high_rep = 1.0 - float(ci_low_dem)
#     kde_points, peak_x = build_kde_points(rep)

#     return {
#         "group": group_name,
#         "peakSupportEstimate": peak_x,
#         "confidenceIntervalLow": ci_low_rep,
#         "confidenceIntervalHigh": ci_high_rep,
#         "kdePoints": kde_points,
#     }


# def export_state(job: dict) -> None:
#     group_files = {group: load_json(path) for group, path in job["inputs"].items()}

#     dem_groups = []
#     rep_groups = []

#     for group_name, ei in group_files.items():
#         dem_groups.append(dem_group_payload(group_name, ei))
#         rep_groups.append(rep_group_payload(group_name, ei))

#     payload = {
#         "stateId": job["state"],
#         "electionYear": 2024,
#         "candidates": [
#             {
#                 "candidateId": "DEM_PRES_2024",
#                 "candidateName": "Kamala Harris",
#                 "party": "Democratic",
#                 "racialGroups": dem_groups,
#             },
#             {
#                 "candidateId": "REP_PRES_2024",
#                 "candidateName": "Donald Trump",
#                 "party": "Republican",
#                 "racialGroups": rep_groups,
#             },
#         ],
#     }

#     out_path = job["out"]
#     out_path.parent.mkdir(parents=True, exist_ok=True)
#     with out_path.open("w", encoding="utf-8") as f:
#         json.dump(payload, f, indent=2)

#     print(f"Wrote: {out_path}")


# def main():
#     for job in JOBS:
#         export_state(job)


# if __name__ == "__main__":
#     main()