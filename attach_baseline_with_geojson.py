import json
import geopandas as gpd
import pandas as pd

def attach_baseline_to_official_districts(
    districts_geojson_path: str,
    baseline_json_path: str,
    out_geojson_path: str,
    out_geojson_path2: str,
    *,
    district_col: str = "DISTRICT",   # field in your official districts file
):
    # Load official district geometries
    gdf = gpd.read_file(districts_geojson_path).copy()
    gdf[district_col] = pd.to_numeric(gdf[district_col], errors="coerce").astype("Int64")

    # Load baseline stats
    with open(baseline_json_path, "r") as f:
        baseline = json.load(f)

    # Convert baseline["districts"] dict -> dataframe
    rows = []
    for d_str, info in baseline["districts"].items():
        d = int(d_str)
        rows.append({
            district_col: d,
            "population_calc": info.get("population"),
            "votes_dem": info.get("votes_dem"),
            "votes_rep": info.get("votes_rep"),
            "winner": info.get("winner"),
            "dem_share": info.get("dem_share"),
        })
    stats = pd.DataFrame(rows)

    # Merge and write
    out = gdf.merge(stats, on=district_col, how="left", validate="one_to_one")
    out.to_file(out_geojson_path, driver="GeoJSON")
    out.to_file(out_geojson_path2, driver="GeoJSON")

    print("Saved:", out_geojson_path)
    print("District rows:", len(out))
    print("Missing stats rows:", int(out["votes_dem"].isna().sum()))
    print("District ids in output:", sorted(out[district_col].dropna().astype(int).unique().tolist()))

# AL
attach_baseline_to_official_districts(
    districts_geojson_path="BASE_FILES/AL_Congressional_Districts_Shapefile/SP_Remedial_Plan_3 2023-10-05.shp",
    baseline_json_path="AL_data/AL_enacted_baseline.json",
    out_geojson_path="AL_data/AL_enacted_districts_with_stats.geojson",
    out_geojson_path2="seawulf_runs/AL/input/AL_enacted_districts_with_stats.geojson",
    district_col="DISTRICT",
)

# OR
attach_baseline_to_official_districts(
    districts_geojson_path="BASE_FILES/OR_Congressional_Districts.geojson",
    baseline_json_path="OR_data/OR_enacted_baseline.json",
    out_geojson_path="OR_data/OR_enacted_districts_with_stats.geojson",
    out_geojson_path2="seawulf_runs/OR/input/OR_enacted_districts_with_stats.geojson",
    district_col="DISTRICT",
)