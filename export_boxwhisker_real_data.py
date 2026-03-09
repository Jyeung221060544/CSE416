import json
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "num_districts": 7,
        "feasible_groups": ["black"],
        "group_map": {
            "black": {
                "raceblind": ROOT / "AL_data" / "AL_boxwhisker_raceblind_black.json",
                "vra": ROOT / "AL_data" / "AL_boxwhisker_vra_black.json",
                "district_prefix": "AL",
            }
        },
        "out": ROOT / "AL-real-data" / "AL-boxwhisker.json",
    },
    {
        "state": "OR",
        "num_districts": 6,
        "feasible_groups": ["latino"],
        "group_map": {
            "latino": {
                "raceblind": ROOT / "OR_data" / "OR_boxwhisker_raceblind_latino.json",
                "vra": ROOT / "OR_data" / "OR_boxwhisker_vra_latino.json",
                "district_prefix": "OR",
            }
        },
        "out": ROOT / "OR-real-data" / "OR-boxwhisker.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def district_id_label(prefix: str, enacted_cd: int) -> str:
    return f"{prefix}-{int(enacted_cd):02d}"


def convert_box_rows(real_rows: list[dict]) -> list[dict]:
    converted = []
    for row in real_rows:
        vals = [row["min"], row["q1"], row["median"], row["q3"], row["max"]]
        converted.append(
            {
                "index": int(row["district_rank"]),
                "min": float(row["min"]),
                "q1": float(row["q1"]),
                "median": float(row["median"]),
                "mean": float(mean(vals)),
                "q3": float(row["q3"]),
                "max": float(row["max"]),
            }
        )
    return converted


def convert_enacted_points(points: list[dict], district_prefix: str) -> list[dict]:
    converted = []
    for row in points:
        converted.append(
            {
                "index": int(row["district_rank"]),
                "districtId": district_id_label(district_prefix, row["enacted_cd"]),
                "groupVapPercentage": float(row["pct"]),
            }
        )
    return converted


def build_ensemble_payload(ensemble_id: str, ensemble_type: str, group_payloads: dict) -> dict:
    return {
        "ensembleId": ensemble_id,
        "ensembleType": ensemble_type,
        "groupDistricts": group_payloads,
    }


def export_state(job: dict) -> None:
    state = job["state"]
    num_districts = job["num_districts"]
    feasible_groups = job["feasible_groups"]
    group_map = job["group_map"]
    out_path = job["out"]

    raceblind_group_districts = {}
    vra_group_districts = {}
    enacted_group_districts = {}

    total_plans = None

    for group_name in feasible_groups:
        spec = group_map[group_name]

        raceblind = load_json(spec["raceblind"])
        vra = load_json(spec["vra"])

        if total_plans is None:
            total_plans = int(raceblind["num_plans"])

        raceblind_group_districts[group_name] = convert_box_rows(raceblind["district_boxwhisker"])
        vra_group_districts[group_name] = convert_box_rows(vra["district_boxwhisker"])

        # enacted points should be the same ranking concept for both files;
        # use raceblind as the source
        enacted_group_districts[group_name] = convert_enacted_points(
            raceblind["enacted_points"],
            spec["district_prefix"],
        )

    payload = {
        "stateId": state,
        "numDistricts": num_districts,
        "totalPlans": int(total_plans or 0),
        "feasibleGroups": feasible_groups,
        "ensembles": [
            build_ensemble_payload(
                ensemble_id=f"{state}_RACEBLIND",
                ensemble_type="race-blind",
                group_payloads=raceblind_group_districts,
            ),
            build_ensemble_payload(
                ensemble_id=f"{state}_VRA",
                ensemble_type="vra-constrained",
                group_payloads=vra_group_districts,
            ),
        ],
        "enactedPlan": {
            "planId": f"{state}_ENACTED_2024",
            "planType": "enacted",
            "groupDistricts": enacted_group_districts,
        },
        "proposedPlan": None,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote: {out_path}")


def main():
    for job in JOBS:
        export_state(job)


if __name__ == "__main__":
    main()