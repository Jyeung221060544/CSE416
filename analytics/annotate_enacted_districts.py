"""
annotate_enacted_districts.py
=============================
Adds isEffective to each district feature in the enacted congressional district
GeoJSONs, and updates the enactedDistricts section in the effectiveness JSONs.
"""
import json
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parent.parent

JOBS = [
    {
        "state": "AL",
        "precincts": ROOT / "AL_data" / "AL_precincts_full.geojson",
        "districts_geojson": (
            ROOT / "frontend" / "src" / "assets" / "ALCongressionalDistricts.json"
        ),
        "effectiveness_json": ROOT / "AL-real-data" / "AL-effectiveness.json",
        "minority_col": "NH_BLACK_ALONE_VAP",
        "threshold": 0.45,
        "party": "D",
        "cd_key": "CD119FP",
    },
    {
        "state": "OR",
        "precincts": ROOT / "OR_data" / "OR_precincts_full.geojson",
        "districts_geojson": (
            ROOT / "frontend" / "src" / "assets" / "ORCongressionalDistrict.json"
        ),
        "effectiveness_json": ROOT / "OR-real-data" / "OR-effectiveness.json",
        "minority_col": "LATINO_VAP",
        "threshold": 0.17,
        "party": "D",
        "cd_key": "CD119FP",
    },
]


def compute_enacted_effectiveness(precincts_path, minority_col, threshold, party):
    """Return dict mapping district_number -> {isEffective, minority_pct, winner}."""
    gdf = gpd.read_file(precincts_path)
    grouped = (
        gdf.groupby("enacted_cd")[[minority_col, "VAP", "votes_dem", "votes_rep"]]
        .sum()
    )
    result = {}
    for cd, row in grouped.iterrows():
        pct = row[minority_col] / row["VAP"] if row["VAP"] > 0 else 0.0
        winner = "D" if row["votes_dem"] > row["votes_rep"] else "R"
        result[int(cd)] = {
            "isEffective": bool(pct >= threshold and winner == party),
            "minority_pct": round(float(pct), 6),
            "winner": winner,
        }
    return result


def annotate_district_geojson(geojson_path, effectiveness_map, cd_key):
    with open(geojson_path, encoding="utf-8") as f:
        geojson = json.load(f)

    for feat in geojson["features"]:
        cd_str = feat["properties"].get(cd_key, "")
        try:
            cd_num = int(cd_str)
        except (ValueError, TypeError):
            continue
        info = effectiveness_map.get(cd_num, {})
        feat["properties"]["isEffective"] = info.get("isEffective", False)
        feat["properties"]["minority_pct"] = info.get("minority_pct")
        feat["properties"]["winner"] = info.get("winner")

    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f)

    print(f"  Annotated {geojson_path.name}")


def update_effectiveness_json(effectiveness_path, effectiveness_map):
    with open(effectiveness_path, encoding="utf-8") as f:
        data = json.load(f)

    data["enactedDistricts"] = [
        {
            "district": cd,
            "isEffective": info["isEffective"],
            "minority_pct": info["minority_pct"],
            "winner": info["winner"],
        }
        for cd, info in sorted(effectiveness_map.items())
    ]

    with open(effectiveness_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    effective_count = sum(1 for v in effectiveness_map.values() if v["isEffective"])
    print(
        f"  Updated {effectiveness_path.name}"
        f" — {effective_count} effective district(s)"
    )


def main():
    for job in JOBS:
        print(f"\n{job['state']}:")
        effectiveness_map = compute_enacted_effectiveness(
            job["precincts"], job["minority_col"], job["threshold"], job["party"]
        )
        for cd, info in sorted(effectiveness_map.items()):
            print(
                f"  CD{cd}: pct={info['minority_pct']:.3f}"
                f" winner={info['winner']} effective={info['isEffective']}"
            )

        annotate_district_geojson(
            job["districts_geojson"], effectiveness_map, job["cd_key"]
        )
        update_effectiveness_json(job["effectiveness_json"], effectiveness_map)

    print("\nDone.")


if __name__ == "__main__":
    main()
