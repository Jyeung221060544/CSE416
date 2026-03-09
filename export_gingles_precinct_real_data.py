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
            "white": {
                "minority_col": "NH_WHITE_ALONE_VAP",
                "regression": ROOT / "OR_data" / "OR_gingles_regression_White.json",
            },
            "hispanic": {
                "minority_col": "LATINO_VAP",
                "regression": ROOT / "OR_data" / "OR_gingles_regression_Latino.json",
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

AL_COUNTY_FIPS = {
    "01001": "Autauga County",
    "01003": "Baldwin County",
    "01005": "Barbour County",
    "01007": "Bibb County",
    "01009": "Blount County",
    "01011": "Bullock County",
    "01013": "Butler County",
    "01015": "Calhoun County",
    "01017": "Chambers County",
    "01019": "Cherokee County",
    "01021": "Chilton County",
    "01023": "Choctaw County",
    "01025": "Clarke County",
    "01027": "Clay County",
    "01029": "Cleburne County",
    "01031": "Coffee County",
    "01033": "Colbert County",
    "01035": "Conecuh County",
    "01037": "Coosa County",
    "01039": "Covington County",
    "01041": "Crenshaw County",
    "01043": "Cullman County",
    "01045": "Dale County",
    "01047": "Dallas County",
    "01049": "DeKalb County",
    "01051": "Elmore County",
    "01053": "Escambia County",
    "01055": "Etowah County",
    "01057": "Fayette County",
    "01059": "Franklin County",
    "01061": "Geneva County",
    "01063": "Greene County",
    "01065": "Hale County",
    "01067": "Henry County",
    "01069": "Houston County",
    "01071": "Jackson County",
    "01073": "Jefferson County",
    "01075": "Lamar County",
    "01077": "Lauderdale County",
    "01079": "Lawrence County",
    "01081": "Lee County",
    "01083": "Limestone County",
    "01085": "Lowndes County",
    "01087": "Macon County",
    "01089": "Madison County",
    "01091": "Marengo County",
    "01093": "Marion County",
    "01095": "Marshall County",
    "01097": "Mobile County",
    "01099": "Monroe County",
    "01101": "Montgomery County",
    "01103": "Morgan County",
    "01105": "Perry County",
    "01107": "Pickens County",
    "01109": "Pike County",
    "01111": "Randolph County",
    "01113": "Russell County",
    "01115": "St. Clair County",
    "01117": "Shelby County",
    "01119": "Sumter County",
    "01121": "Talladega County",
    "01123": "Tallapoosa County",
    "01125": "Tuscaloosa County",
    "01127": "Walker County",
    "01129": "Washington County",
    "01131": "Wilcox County",
    "01133": "Winston County",
}

OR_COUNTY_FIPS = {
    "41001": "Baker County",
    "41003": "Benton County",
    "41005": "Clackamas County",
    "41007": "Clatsop County",
    "41009": "Columbia County",
    "41011": "Coos County",
    "41013": "Crook County",
    "41015": "Curry County",
    "41017": "Deschutes County",
    "41019": "Douglas County",
    "41021": "Gilliam County",
    "41023": "Grant County",
    "41025": "Harney County",
    "41027": "Hood River County",
    "41029": "Jackson County",
    "41031": "Jefferson County",
    "41033": "Josephine County",
    "41035": "Klamath County",
    "41037": "Lake County",
    "41039": "Lane County",
    "41041": "Lincoln County",
    "41043": "Linn County",
    "41045": "Malheur County",
    "41047": "Marion County",
    "41049": "Morrow County",
    "41051": "Multnomah County",
    "41053": "Polk County",
    "41055": "Sherman County",
    "41057": "Tillamook County",
    "41059": "Umatilla County",
    "41061": "Union County",
    "41063": "Wallowa County",
    "41065": "Wasco County",
    "41067": "Washington County",
    "41069": "Wheeler County",
    "41071": "Yamhill County",
}

def clean_label(text: str) -> str:
    return " ".join(str(text).replace("_", " ").split()).strip()

def choose_name(row) -> str:
    for field in ["name", "NAME", "precinct_name", "Precinct", "PRECINCT"]:
        if field in row and row[field] not in (None, ""):
            value = clean_label(row[field])
            if value:
                return value

    geoid = str(row["GEOID"]).strip()

    if "-" in geoid:
        left, right = geoid.split("-", 1)
        left = left.strip()
        right = right.strip()

        # Alabama: countyFIPS-descriptive precinct label
        if left.startswith("01") and any(ch.isalpha() for ch in right):
            county_name = AL_COUNTY_FIPS.get(left)
            label = clean_label(right)
            if county_name:
                return f"{county_name} — {label}"
            return label

        # Oregon: countyFIPS-precinct number/code
        if left.startswith("41") and right.isdigit():
            county_name = OR_COUNTY_FIPS.get(left, f"County {left}")
            return f"{county_name} — Precinct {right}"

        # Generic descriptive fallback
        if any(ch.isalpha() for ch in right):
            return clean_label(right)

    return f"Precinct {geoid}"


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