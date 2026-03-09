import json
from pathlib import Path

import geopandas as gpd
import numpy as np

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "groups": {
            "black": "NH_BLACK_ALONE_VAP",
            "white": "NH_WHITE_ALONE_VAP",
            "hispanic": "LATINO_VAP",
            "asian": "NH_ASIAN_ALONE_VAP",
            "other": "OTHER_VAP",
        },
        "out": ROOT / "AL-real-data" / "AL-Gingles-precinct.json",
    },
    {
        "state": "OR",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "groups": {
            "black": "NH_BLACK_ALONE_VAP",
            "white": "NH_WHITE_ALONE_VAP",
            "hispanic": "LATINO_VAP",
            "asian": "NH_ASIAN_ALONE_VAP",
            "other": "OTHER_VAP",
        },
        "out": ROOT / "OR-real-data" / "OR-Gingles-precinct.json",
    },
]


def choose_name(row) -> str:
    for field in ["name", "NAME", "precinct_name", "Precinct", "PRECINCT"]:
        if field in row and row[field] not in (None, ""):
            return str(row[field])
    return str(row["GEOID"])


def build_points(gdf: gpd.GeoDataFrame, minority_col: str) -> list[dict]:
    points = []

    mask = (
        (gdf["VAP"] > 0)
        & ((gdf["votes_dem"] + gdf["votes_rep"]) > 0)
        & (gdf[minority_col] >= 0)
        & (gdf[minority_col] <= gdf["VAP"])
    )

    g = gdf.loc[mask].copy()

    for _, row in g.iterrows():
        total_pop = int(row["VAP"])
        minority_pop = int(row[minority_col])
        dem_votes = int(row["votes_dem"])
        rep_votes = int(row["votes_rep"])
        total_votes = dem_votes + rep_votes

        x = 0.0 if total_pop <= 0 else float(minority_pop / total_pop)
        y = 0.0 if total_votes <= 0 else float(dem_votes / total_votes)

        points.append(
            {
                "id": str(row["GEOID"]),
                "name": choose_name(row),
                "x": x,
                "y": y,
                "totalPop": total_pop,
                "minorityPop": minority_pop,
                "avgHHIncome": int(row["AVG_HH_INC"]) if "AVG_HH_INC" in row and row["AVG_HH_INC"] is not None else 0,
                "regionType": str(row["region_type"]) if "region_type" in row and row["region_type"] is not None else "",
                "demVotes": dem_votes,
                "repVotes": rep_votes,
            }
        )

    return points


def export_state(job: dict) -> None:
    gdf = gpd.read_file(job["precincts"])

    feasible_series = {}
    for frontend_key, minority_col in job["groups"].items():
        feasible_series[frontend_key] = {
            "points": build_points(gdf, minority_col)
        }

    payload = {
        "stateId": job["state"],
        "feasibleSeriesByRace": feasible_series,
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