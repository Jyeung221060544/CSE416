import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "baseline": ROOT / "AL_data" / "AL_enacted_baseline.json",
        "metadata": ROOT / "state_summary_metadata.json",
        "out": ROOT / "AL-real-data" / "AL-state-summary.json",
    },
    {
        "state": "OR",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "baseline": ROOT / "OR_data" / "OR_enacted_baseline.json",
        "metadata": ROOT / "state_summary_metadata.json",
        "out": ROOT / "OR-real-data" / "OR-state-summary.json",
    },
]

FEASIBLE_THRESHOLD = 380000


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_demographic_groups(state: str, gdf: gpd.GeoDataFrame, vap_total: int) -> list[dict]:
    white_vap = int(gdf["NH_WHITE_ALONE_VAP"].sum())
    black_vap = int(gdf["NH_BLACK_ALONE_VAP"].sum())
    latino_vap = int(gdf["LATINO_VAP"].sum())
    other_vap_base = int(gdf["OTHER_VAP"].sum())

    if state == "AL":
        groups = [
            ("White", white_vap, True),
            ("Black", black_vap, True),
            ("Other", latino_vap + other_vap_base, False),
        ]
    elif state == "OR":
        groups = [
            ("White", white_vap, True),
            ("Hispanic", latino_vap, True),
            ("Other", black_vap + other_vap_base, False),
        ]
    else:
        raise ValueError(f"Unsupported state: {state}")

    demographic_groups = []
    for label, vap, thresholded in groups:
        pct = 0.0 if vap_total <= 0 else vap / vap_total
        demographic_groups.append(
            {
                "group": label,
                "vap": int(vap),
                "vapPercentage": pct,
                "isFeasible": (vap >= FEASIBLE_THRESHOLD) if thresholded else False,
            }
        )

    return demographic_groups


def export_state(job: dict) -> None:
    state = job["state"]
    gdf = gpd.read_file(job["precincts"])
    baseline = load_json(job["baseline"])
    metadata_all = load_json(job["metadata"])
    meta = metadata_all[state]

    vap_total = int(gdf["VAP"].sum())
    dem_votes = int(gdf["votes_dem"].sum())
    rep_votes = int(gdf["votes_rep"].sum())
    total_two_party = dem_votes + rep_votes

    num_districts = int(baseline["num_districts"])
    ideal_district_population = round(vap_total / num_districts)

    demographic_groups = build_demographic_groups(state, gdf, vap_total)

    payload = {
        "stateId": state,
        "stateName": meta["stateName"],
        "totalPopulation": int(meta["totalPopulation"]),
        "votingAgePopulation": vap_total,
        "numDistricts": num_districts,
        "idealDistrictPopulation": ideal_district_population,
        "isPreclearance": bool(meta["isPreclearance"]),
        "voterDistribution": {
            "electionYear": 2024,
            "democraticVoteShare": 0.0 if total_two_party <= 0 else dem_votes / total_two_party,
            "republicanVoteShare": 0.0 if total_two_party <= 0 else rep_votes / total_two_party,
        },
        "demographicGroups": demographic_groups,
        "redistrictingControl": {
            "controllingParty": meta["controllingParty"],
        },
        "congressionalRepresentatives": {
            "totalSeats": num_districts,
            "byParty": [
                {"party": "Democratic", "seats": int(baseline["dem_seats"])},
                {"party": "Republican", "seats": int(baseline["rep_seats"])},
            ],
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