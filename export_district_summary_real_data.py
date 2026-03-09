import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "baseline": ROOT / "AL_data" / "AL_enacted_baseline.json",
        "metadata": ROOT / "district_metadata.json",
        "out": ROOT / "AL-real-data" / "AL-district-summary.json",
    },
    {
        "state": "OR",
        "baseline": ROOT / "OR_data" / "OR_enacted_baseline.json",
        "metadata": ROOT / "district_metadata.json",
        "out": ROOT / "OR-real-data" / "OR-district-summary.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def district_id_label(state: str, district_number: int) -> str:
    return f"{state}-{district_number:02d}"


def margin_direction_from_winner(winner: str) -> str:
    return "D" if winner == "D" else "R"


def party_label_from_winner(winner: str) -> str:
    return "Democratic" if winner == "D" else "Republican"


def compute_vote_margin_percentage(votes_dem: int, votes_rep: int) -> float:
    total = votes_dem + votes_rep
    if total <= 0:
        return 0.0
    return abs(votes_dem - votes_rep) / total


def export_state(job: dict) -> None:
    state = job["state"]
    baseline = load_json(job["baseline"])
    metadata_all = load_json(job["metadata"])
    state_meta = metadata_all.get(state, {})

    districts_out = []

    district_items = sorted(
        baseline["districts"].items(),
        key=lambda kv: int(kv[0])
    )

    for district_str, info in district_items:
        district_number = int(district_str)
        winner = info["winner"]
        votes_dem = int(info["votes_dem"])
        votes_rep = int(info["votes_rep"])

        meta = state_meta.get(str(district_number), {})

        districts_out.append(
            {
                "districtId": district_id_label(state, district_number),
                "districtNumber": district_number,
                "representative": meta.get("representative", ""),
                "party": meta.get("party") or party_label_from_winner(winner),
                "racialGroup": meta.get("racialGroup", ""),
                "voteMarginPercentage": compute_vote_margin_percentage(votes_dem, votes_rep),
                "voteMarginDirection": margin_direction_from_winner(winner),
            }
        )

    payload = {
        "stateId": state,
        "planType": "enacted",
        "electionYear": 2024,
        "districts": districts_out,
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