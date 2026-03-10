# preview_gingles_export.py
import json
from pathlib import Path
from statistics import mean

FILES = [
    "AL-real-data/AL-Gingles-precinct.json",
    "OR-real-data/OR-Gingles-precinct.json",
]


def pct(v):
    return round(100 * v, 2)


def summarize_points(points):
    xs = [p["x"] for p in points]
    ys = [p["y"] for p in points]

    return {
        "count": len(points),
        "x_min": min(xs) if xs else None,
        "x_max": max(xs) if xs else None,
        "y_min": min(ys) if ys else None,
        "y_max": max(ys) if ys else None,
        "x_mean": mean(xs) if xs else None,
        "y_mean": mean(ys) if ys else None,
    }


def validate_summary_rows(summary_rows, points):
    point_count = len(points)
    row_count_sum = sum(r.get("precinctCount", 0) for r in summary_rows)
    return {
        "summary_row_count_total": row_count_sum,
        "matches_points": row_count_sum == point_count,
    }


def preview_series(race_key, series):
    points = series.get("points", [])
    dem_line = series.get("democraticTrendline", [])
    rep_line = series.get("republicanTrendline", [])
    summary_rows = series.get("summaryRows", [])

    stats = summarize_points(points)
    summary_check = validate_summary_rows(summary_rows, points)

    print(f"\n--- Race key: {race_key} ---")
    print("points:", stats["count"])
    print(
        "x range:",
        round(stats["x_min"], 4) if stats["x_min"] is not None else None,
        "to",
        round(stats["x_max"], 4) if stats["x_max"] is not None else None,
    )
    print(
        "y range:",
        round(stats["y_min"], 4) if stats["y_min"] is not None else None,
        "to",
        round(stats["y_max"], 4) if stats["y_max"] is not None else None,
    )
    print(
        "x mean / y mean:",
        round(stats["x_mean"], 4) if stats["x_mean"] is not None else None,
        "/",
        round(stats["y_mean"], 4) if stats["y_mean"] is not None else None,
    )

    print("democraticTrendline points:", len(dem_line))
    print("republicanTrendline points:", len(rep_line))
    if dem_line:
        print("dem trend start/end:", dem_line[0], dem_line[-1])
    if rep_line:
        print("rep trend start/end:", rep_line[0], rep_line[-1])

    print("summaryRows:", len(summary_rows))
    print("summaryRows precinct total:", summary_check["summary_row_count_total"])
    print("summaryRows matches point count:", summary_check["matches_points"])

    if summary_rows:
        print("summaryRows preview:")
        for row in summary_rows:
            print(row)

    if points:
        print("first point:")
        print(points[0])

        # show a few extreme examples
        sorted_by_x = sorted(points, key=lambda p: p["x"])
        print("lowest-x point:")
        print(sorted_by_x[0])
        print("highest-x point:")
        print(sorted_by_x[-1])


def preview_file(path_str):
    path = Path(path_str)
    print("\n==============================")
    print("FILE:", path)
    print("==============================")

    data = json.loads(path.read_text(encoding="utf-8"))
    print("top-level keys:", list(data.keys()))
    print("stateId:", data.get("stateId"))

    series_map = data.get("feasibleSeriesByRace", {})
    print("race keys:", list(series_map.keys()))

    for race_key, series in series_map.items():
        preview_series(race_key, series)


def main():
    for f in FILES:
        preview_file(f)


if __name__ == "__main__":
    main()

# # validate_project_data.py
# import json
# from pathlib import Path

# import geopandas as gpd
# import numpy as np

# ROOT = Path(__file__).resolve().parent

# PRECINCT_FILES = [
#     ("AL", ROOT / "AL_data" / "AL_precincts_full.geojson"),
#     ("OR", ROOT / "OR_data" / "OR_precincts_full.geojson"),
# ]

# GINGLES_EXPORT_FILES = [
#     ("AL", ROOT / "AL-real-data" / "AL-Gingles-precinct.json"),
#     ("OR", ROOT / "OR-real-data" / "OR-Gingles-precinct.json"),
# ]

# MIN_TOTAL_POP_WARN = 10
# MIN_TOTAL_VOTES_WARN = 10


# def load_json(path: Path) -> dict:
#     return json.loads(path.read_text(encoding="utf-8"))


# def print_section(title: str):
#     print("\n" + "=" * 70)
#     print(title)
#     print("=" * 70)


# def summarize_numeric(series, name: str):
#     arr = np.asarray(series, dtype=float)
#     if arr.size == 0:
#         print(f"{name}: no values")
#         return
#     print(
#         f"{name}: min={arr.min():.4f} "
#         f"q1={np.quantile(arr, 0.25):.4f} "
#         f"median={np.quantile(arr, 0.50):.4f} "
#         f"q3={np.quantile(arr, 0.75):.4f} "
#         f"max={arr.max():.4f}"
#     )


# def validate_precinct_geojson(state: str, path: Path):
#     print_section(f"{state} PRECINCT GEOJSON QA")
#     gdf = gpd.read_file(path)

#     print("file:", path)
#     print("rows:", len(gdf))
#     print("columns:", list(gdf.columns))

#     required = ["GEOID", "VAP", "votes_dem", "votes_rep", "enacted_cd"]
#     missing = [c for c in required if c not in gdf.columns]
#     print("missing required columns:", missing)

#     if missing:
#         return

#     total_votes = gdf["votes_dem"] + gdf["votes_rep"]

#     print("duplicate GEOIDs:", int(gdf["GEOID"].duplicated().sum()))
#     print("missing geometries:", int(gdf.geometry.isna().sum()))
#     print("invalid geometries:", int((~gdf.geometry.is_valid).sum()) if "geometry" in gdf else "N/A")

#     print("VAP <= 0:", int((gdf["VAP"] <= 0).sum()))
#     print("total votes <= 0:", int((total_votes <= 0).sum()))
#     print(f"VAP < {MIN_TOTAL_POP_WARN}:", int((gdf["VAP"] < MIN_TOTAL_POP_WARN).sum()))
#     print(f"total votes < {MIN_TOTAL_VOTES_WARN}:", int((total_votes < MIN_TOTAL_VOTES_WARN).sum()))

#     if "NH_BLACK_ALONE_VAP" in gdf.columns:
#         print("NH_BLACK_ALONE_VAP < 0:", int((gdf["NH_BLACK_ALONE_VAP"] < 0).sum()))
#         print("NH_BLACK_ALONE_VAP > VAP:", int((gdf["NH_BLACK_ALONE_VAP"] > gdf["VAP"]).sum()))

#     if "NH_WHITE_ALONE_VAP" in gdf.columns:
#         print("NH_WHITE_ALONE_VAP < 0:", int((gdf["NH_WHITE_ALONE_VAP"] < 0).sum()))
#         print("NH_WHITE_ALONE_VAP > VAP:", int((gdf["NH_WHITE_ALONE_VAP"] > gdf["VAP"]).sum()))

#     if "LATINO_VAP" in gdf.columns:
#         print("LATINO_VAP < 0:", int((gdf["LATINO_VAP"] < 0).sum()))
#         print("LATINO_VAP > VAP:", int((gdf["LATINO_VAP"] > gdf["VAP"]).sum()))

#     if "OTHER_VAP" in gdf.columns:
#         print("OTHER_VAP < 0:", int((gdf["OTHER_VAP"] < 0).sum()))
#         print("OTHER_VAP > VAP:", int((gdf["OTHER_VAP"] > gdf["VAP"]).sum()))

#     if state == "AL" and all(c in gdf.columns for c in ["NH_BLACK_ALONE_VAP", "NH_WHITE_ALONE_VAP", "OTHER_VAP"]):
#         diff = gdf["VAP"] - (
#             gdf["NH_BLACK_ALONE_VAP"] + gdf["NH_WHITE_ALONE_VAP"] + gdf["OTHER_VAP"]
#         )
#         print("AL race sum mismatch rows:", int((diff != 0).sum()))
#         print("AL race sum mismatch max abs:", int(diff.abs().max()))

#     if state == "OR" and all(c in gdf.columns for c in ["LATINO_VAP", "NH_WHITE_ALONE_VAP", "OTHER_VAP"]):
#         diff = gdf["VAP"] - (
#             gdf["LATINO_VAP"] + gdf["NH_WHITE_ALONE_VAP"] + gdf["OTHER_VAP"]
#         )
#         print("OR race sum mismatch rows:", int((diff != 0).sum()))
#         print("OR race sum mismatch max abs:", int(diff.abs().max()))

#     summarize_numeric(gdf["VAP"], "VAP")
#     summarize_numeric(total_votes, "two_party_votes")
#     summarize_numeric(gdf["votes_dem"] / total_votes.replace(0, np.nan), "dem_share")
#     summarize_numeric(gdf["votes_rep"] / total_votes.replace(0, np.nan), "rep_share")

#     if "AVG_HH_INC" in gdf.columns:
#         summarize_numeric(gdf["AVG_HH_INC"], "AVG_HH_INC")
#     if "region_type" in gdf.columns:
#         print("region_type counts:")
#         print(gdf["region_type"].value_counts(dropna=False))

#     small_pop = gdf[gdf["VAP"] < MIN_TOTAL_POP_WARN][["GEOID", "VAP", "votes_dem", "votes_rep"]].head(10)
#     if len(small_pop):
#         print(f"\nExample precincts with VAP < {MIN_TOTAL_POP_WARN}:")
#         print(small_pop.to_string(index=False))

#     small_votes = gdf[total_votes < MIN_TOTAL_VOTES_WARN][["GEOID", "VAP", "votes_dem", "votes_rep"]].head(10)
#     if len(small_votes):
#         print(f"\nExample precincts with total votes < {MIN_TOTAL_VOTES_WARN}:")
#         print(small_votes.to_string(index=False))


# def validate_gingles_export(state: str, path: Path):
#     print_section(f"{state} GINGLES EXPORT QA")
#     data = load_json(path)

#     print("file:", path)
#     print("top-level keys:", list(data.keys()))
#     print("stateId:", data.get("stateId"))

#     series_map = data.get("feasibleSeriesByRace", {})
#     print("race keys:", list(series_map.keys()))

#     for race_key, series in series_map.items():
#         points = series.get("points", [])
#         dem_line = series.get("democraticTrendline", [])
#         rep_line = series.get("republicanTrendline", [])
#         summary_rows = series.get("summaryRows", [])

#         print(f"\n--- {race_key} ---")
#         print("points:", len(points))
#         print("dem trend points:", len(dem_line))
#         print("rep trend points:", len(rep_line))
#         print("summary rows:", len(summary_rows))

#         if not points:
#             continue

#         x = np.asarray([p["x"] for p in points], dtype=float)
#         y = np.asarray([p["y"] for p in points], dtype=float)
#         total_pop = np.asarray([p["totalPop"] for p in points], dtype=float)
#         minority_pop = np.asarray([p["minorityPop"] for p in points], dtype=float)
#         dem_votes = np.asarray([p["demVotes"] for p in points], dtype=float)
#         rep_votes = np.asarray([p["repVotes"] for p in points], dtype=float)

#         print("x outside [0,1]:", int(((x < 0) | (x > 1)).sum()))
#         print("y outside [0,1]:", int(((y < 0) | (y > 1)).sum()))
#         print("minorityPop > totalPop:", int((minority_pop > total_pop).sum()))
#         print("totalPop <= 0:", int((total_pop <= 0).sum()))
#         print("two_party_votes <= 0:", int(((dem_votes + rep_votes) <= 0).sum()))
#         print(f"totalPop < {MIN_TOTAL_POP_WARN}:", int((total_pop < MIN_TOTAL_POP_WARN).sum()))
#         print(f"two_party_votes < {MIN_TOTAL_VOTES_WARN}:", int(((dem_votes + rep_votes) < MIN_TOTAL_VOTES_WARN).sum()))

#         summarize_numeric(x, f"{race_key} x")
#         summarize_numeric(y, f"{race_key} y")

#         row_total = sum(r.get("precinctCount", 0) for r in summary_rows)
#         print("summary row total precincts:", row_total)
#         print("summary matches points:", row_total == len(points))

#         if dem_line:
#             dem_x = np.asarray([p["x"] for p in dem_line], dtype=float)
#             dem_y = np.asarray([p["y"] for p in dem_line], dtype=float)
#             print("dem trend x sorted ascending:", bool(np.all(np.diff(dem_x) >= 0)))
#             print("dem trend y outside [0,1]:", int(((dem_y < 0) | (dem_y > 1)).sum()))

#         if rep_line:
#             rep_x = np.asarray([p["x"] for p in rep_line], dtype=float)
#             rep_y = np.asarray([p["y"] for p in rep_line], dtype=float)
#             print("rep trend x sorted ascending:", bool(np.all(np.diff(rep_x) >= 0)))
#             print("rep trend y outside [0,1]:", int(((rep_y < 0) | (rep_y > 1)).sum()))

#         tiny_points = [p for p in points if p["totalPop"] < MIN_TOTAL_POP_WARN][:5]
#         if tiny_points:
#             print(f"example tiny-pop precincts (<{MIN_TOTAL_POP_WARN}):")
#             for p in tiny_points:
#                 print(p)

#         tiny_vote_points = [p for p in points if (p["demVotes"] + p["repVotes"]) < MIN_TOTAL_VOTES_WARN][:5]
#         if tiny_vote_points:
#             print(f"example tiny-vote precincts (<{MIN_TOTAL_VOTES_WARN}):")
#             for p in tiny_vote_points:
#                 print(p)


# def main():
#     for state, path in PRECINCT_FILES:
#         validate_precinct_geojson(state, path)

#     for state, path in GINGLES_EXPORT_FILES:
#         validate_gingles_export(state, path)


# if __name__ == "__main__":
#     main()