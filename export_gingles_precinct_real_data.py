import json
from pathlib import Path

import geopandas as gpd
import numpy as np


def compute_summary_rows(points):

    bins = [
        (0.0,0.2,"0–20%"),
        (0.2,0.4,"20–40%"),
        (0.4,0.6,"40–60%"),
        (0.6,0.8,"60–80%"),
        (0.8,1.0,"80–100%"),
    ]

    rows = []

    for lo,hi,label in bins:

        subset = [
            p for p in points
            if (lo <= p["x"] < hi) or (hi == 1.0 and lo <= p["x"] <= hi)
        ]

        if len(subset)==0:
            rows.append({
                "rangeLabel":label,
                "precinctCount":0,
                "avgDemocraticVoteShare":0,
                "avgRepublicanVoteShare":0
            })
            continue

        dem_avg = np.mean([p["y"] for p in subset])
        rep_avg = 1 - dem_avg

        rows.append({
            "rangeLabel":label,
            "precinctCount":len(subset),
            "avgDemocraticVoteShare":round(float(dem_avg),4),
            "avgRepublicanVoteShare":round(float(rep_avg),4)
        })

    return rows

ROOT = Path(__file__).resolve().parent

JOBS = [
    {
        "state": "AL",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "groups": {
            "black": {
                "minority_col": "NH_BLACK_ALONE_VAP",
                "regression": ROOT / "AL_data" / "AL_gingles_regression_Black.json",
            },
            "white": {
                "minority_col": "NH_WHITE_ALONE_VAP",
                "regression": ROOT / "AL_data" / "AL_gingles_regression_White.json",
            },
            "hispanic": {
                "minority_col": "LATINO_VAP",
                "regression": None,
            },
            "asian": {
                "minority_col": "NH_ASIAN_ALONE_VAP",
                "regression": None,
            },
            "other": {
                "minority_col": "OTHER_VAP",
                "regression": None,
            },
        },
        "out": ROOT / "AL-real-data" / "AL-Gingles-precinct.json",
    },
    {
        "state": "OR",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "groups": {
            "black": {
                "minority_col": "NH_BLACK_ALONE_VAP",
                "regression": None,
            },
            "white": {
                "minority_col": "NH_WHITE_ALONE_VAP",
                "regression": ROOT / "OR_data" / "OR_gingles_regression_White.json",
            },
            "hispanic": {
                "minority_col": "LATINO_VAP",
                "regression": ROOT / "OR_data" / "OR_gingles_regression_Latino.json",
            },
            "asian": {
                "minority_col": "NH_ASIAN_ALONE_VAP",
                "regression": None,
            },
            "other": {
                "minority_col": "OTHER_VAP",
                "regression": None,
            },
        },
        "out": ROOT / "OR-real-data" / "OR-Gingles-precinct.json",
    },
]

def load_regression_trendlines(path: Path | None):
    if path is None or not path.exists():
        return [], []

    data = json.loads(path.read_text())

    x_grid = data.get("x_grid", [])
    dem_curve = data.get("dem_curve", [])
    rep_curve = data.get("rep_curve", [])

    dem = [{"x": round(float(x), 3), "y": round(float(y), 4)} for x, y in zip(x_grid, dem_curve)]
    rep = [{"x": round(float(x), 3), "y": round(float(y), 4)} for x, y in zip(x_grid, rep_curve)]

    return dem, rep

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
    for frontend_key, spec in job["groups"].items():
        minority_col = spec["minority_col"]
        regression_path = spec["regression"]

        points = build_points(gdf, minority_col)
        dem_line, rep_line = load_regression_trendlines(regression_path)
        summary_rows = compute_summary_rows(points)

        feasible_series[frontend_key] = {
            "points": points,
            "democraticTrendline": dem_line,
            "republicanTrendline": rep_line,
            "summaryRows": summary_rows
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