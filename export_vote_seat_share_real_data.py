import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "curve": ROOT / "AL_data" / "AL_seat_vote_curve.json",
        "enacted": ROOT / "AL_data" / "AL_enacted_baseline.json",
        "state_summary": ROOT / "AL-real-data" / "AL-state-summary.json",
        "meta": ROOT / "vote_seat_metadata.json",
        "out": ROOT / "AL-real-data" / "AL-vote-seat-share.json",
    },
    {
        "state": "OR",
        "curve": ROOT / "OR_data" / "OR_seat_vote_curve.json",
        "enacted": ROOT / "OR_data" / "OR_enacted_baseline.json",
        "state_summary": ROOT / "OR-real-data" / "OR-state-summary.json",
        "meta": ROOT / "vote_seat_metadata.json",
        "out": ROOT / "OR-real-data" / "OR-vote-seat-share.json",
    },
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def closest_point(points: list[dict], target_vote_share: float) -> dict:
    return min(points, key=lambda p: abs(float(p["mean_vote_share"]) - target_vote_share))


def build_dem_curve_points(curve_points: list[dict]) -> list[dict]:
    return [
        {
            "voteShare": float(p["mean_vote_share"]),
            "seatShare": float(p["mean_seat_share"]),
        }
        for p in curve_points
    ]


def build_rep_curve_points(curve_points: list[dict]) -> list[dict]:
    return [
        {
            "voteShare": 1.0 - float(p["mean_vote_share"]),
            "seatShare": 1.0 - float(p["mean_seat_share"]),
        }
        for p in curve_points
    ]


def export_state(job: dict) -> None:
    state = job["state"]
    curve = load_json(job["curve"])
    enacted = load_json(job["enacted"])
    state_summary = load_json(job["state_summary"])
    meta_all = load_json(job["meta"])
    meta = meta_all.get(state, {})

    curve_points = curve["curve_points"]
    total_districts = int(enacted["num_districts"])

    dem_curve = build_dem_curve_points(curve_points)
    rep_curve = build_rep_curve_points(curve_points)

    p50 = closest_point(curve_points, 0.50)
    dem_seat_share_at_50 = float(p50["mean_seat_share"])
    partisan_bias = dem_seat_share_at_50 - 0.5

    enacted_dem_vote_share = float(state_summary["voterDistribution"]["democraticVoteShare"])
    enacted_dem_seat_share = float(enacted["dem_seats"]) / float(total_districts)

    notes = (
        f"At 50% Democratic vote share, Democrats win ~{dem_seat_share_at_50:.3f} "
        f"of seats (partisan bias ≈ {partisan_bias:.3f})."
    )

    payload = {
        "stateId": state,
        "electionYear": 2024,
        "raciallyPolarized": bool(meta.get("raciallyPolarized", False)),
        "totalDistricts": total_districts,
        "partisanBias": partisan_bias,
        "notes": notes,
        "curves": [
            {
                "party": "Democratic",
                "points": dem_curve,
            },
            {
                "party": "Republican",
                "points": rep_curve,
            },
        ],
        "enactedPlan": {
            "democraticVoteShare": enacted_dem_vote_share,
            "democraticSeatShare": enacted_dem_seat_share,
            "label": "Enacted 2024",
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