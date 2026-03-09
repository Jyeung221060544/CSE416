import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "num_districts": 7,
        "raceblind_summary": ROOT / "cse416_seawulf_results" / "AL_output_raceblind" / "summary_final.json",
        "vra_summary": ROOT / "cse416_seawulf_results" / "AL_output_vra" / "summary_final.json",
        "enacted_baseline": ROOT / "AL_data" / "AL_enacted_baseline.json",
        "out": ROOT / "AL-real-data" / "AL-splits.json",
    },
    {
        "state": "OR",
        "num_districts": 6,
        "raceblind_summary": ROOT / "cse416_seawulf_results" / "OR_output_raceblind" / "summary_final.json",
        "vra_summary": ROOT / "cse416_seawulf_results" / "OR_output_vra" / "summary_final.json",
        "enacted_baseline": ROOT / "OR_data" / "OR_enacted_baseline.json",
        "out": ROOT / "OR-real-data" / "OR-splits.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_splits_array(seat_splits_dem_seats: dict, num_districts: int) -> list[dict]:
    """
    Build a complete splits array from 0..num_districts Democratic seats.
    """
    splits = []
    for dem in range(0, num_districts + 1):
        rep = num_districts - dem
        freq = int(seat_splits_dem_seats.get(str(dem), 0))
        splits.append(
            {
                "republican": rep,
                "democratic": dem,
                "frequency": freq,
            }
        )
    return splits


def compute_union_split_range(raceblind_splits: list[dict], vra_splits: list[dict]) -> dict:
    used_rep = []

    for row in raceblind_splits + vra_splits:
        if int(row["frequency"]) > 0:
            used_rep.append(int(row["republican"]))

    if not used_rep:
        return {"minRepublican": 0, "maxRepublican": 0}

    return {
        "minRepublican": min(used_rep),
        "maxRepublican": max(used_rep),
    }


def build_ensemble_entry(state: str, ensemble_type: str, splits: list[dict]) -> dict:
    ensemble_id = f"{state}_{'RACEBLIND' if ensemble_type == 'race-blind' else 'VRA'}"
    return {
        "ensembleId": ensemble_id,
        "ensembleType": ensemble_type,
        "splits": splits,
    }


def export_state(job: dict) -> None:
    state = job["state"]
    num_districts = int(job["num_districts"])

    raceblind_summary = load_json(job["raceblind_summary"])
    vra_summary = load_json(job["vra_summary"])
    enacted = load_json(job["enacted_baseline"])

    raceblind_splits = build_splits_array(
        raceblind_summary.get("seat_splits_dem_seats", {}),
        num_districts,
    )
    vra_splits = build_splits_array(
        vra_summary.get("seat_splits_dem_seats", {}),
        num_districts,
    )

    payload = {
        "stateId": state,
        "numDistricts": num_districts,
        "totalPlans": int(raceblind_summary.get("plans_written", 0)),
        "unionSplitRange": compute_union_split_range(raceblind_splits, vra_splits),
        "ensembles": [
            build_ensemble_entry(state, "race-blind", raceblind_splits),
            build_ensemble_entry(state, "vra-constrained", vra_splits),
        ],
        "enactedPlanSplit": {
            "republican": int(enacted.get("rep_seats", 0)),
            "democratic": int(enacted.get("dem_seats", 0)),
        },
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