import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "raceblind_summary": ROOT / "cse416_seawulf_results" / "AL_output_raceblind" / "summary_final.json",
        "vra_summary": ROOT / "cse416_seawulf_results" / "AL_output_vra" / "summary_final.json",
        "out": ROOT / "AL-real-data" / "AL-ensemble-summary.json",
    },
    {
        "state": "OR",
        "raceblind_summary": ROOT / "cse416_seawulf_results" / "OR_output_raceblind" / "summary_final.json",
        "vra_summary": ROOT / "cse416_seawulf_results" / "OR_output_vra" / "summary_final.json",
        "out": ROOT / "OR-real-data" / "OR-ensemble-summary.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_ensemble_entry(state: str, summary: dict, ensemble_type: str) -> dict:
    ensemble_id = f"{state}_{'RACEBLIND' if ensemble_type == 'race-blind' else 'VRA'}"

    description = (
        "Race-blind ReCom ensemble"
        if ensemble_type == "race-blind"
        else "VRA-constrained ReCom ensemble"
    )

    return {
        "ensembleId": ensemble_id,
        "ensembleType": ensemble_type,
        "numPlans": int(summary.get("plans_written", 0)),
        "populationEqualityThreshold": float(summary.get("pop_tolerance", 0.0)),
        "description": description,
    }


def export_state(job: dict) -> None:
    state = job["state"]
    raceblind = load_json(job["raceblind_summary"])
    vra = load_json(job["vra_summary"])

    payload = {
        "stateId": state,
        "ensembles": [
            build_ensemble_entry(state, raceblind, "race-blind"),
            build_ensemble_entry(state, vra, "vra-constrained"),
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