"""
assign_enacted_districts.py
===========================
Assigns each voting precinct to its enacted congressional district using a
representative-point-in-polygon spatial join, then writes the result back
to a GeoJSON file.

Workflow
--------
1. Read precinct and district shapefiles / GeoJSON with GeoPandas.
2. Buffer geometries to fix invalid polygons.
3. Reproject precincts to the districts' CRS.
4. Compute one representative point per precinct for a stable point-in-polygon join.
5. Spatial join: precinct point -> district polygon (left join).
6. Merge the assigned district ID back onto the full precinct GeoDataFrame.
7. Sanity-check for missing assignments and print diagnostics.
8. Write the enriched GeoDataFrame to an output GeoJSON.

Module-level script section (bottom of file) runs the pipeline for Alabama
and Oregon, then casts the enacted_cd column to int.

Dependencies: geopandas
"""

import geopandas as gpd


def assign_enacted_districts(
    precinct_path: str,
    districts_path: str,
    out_path: str,
    precinct_id_col: str,
    district_id_col: str,
    enacted_col: str = "enacted_cd",
):
    """
    Assign each precinct polygon to its enacted congressional district via
    a representative-point spatial join and write the result to GeoJSON.

    Parameters
    ----------
    precinct_path   : Path to the precinct shapefile or GeoJSON.
    districts_path  : Path to the congressional district shapefile or GeoJSON.
    out_path        : Output path for the enriched precinct GeoJSON.
    precinct_id_col : Column name of the unique precinct identifier.
    district_id_col : Column name of the district identifier in the districts file.
    enacted_col     : Name of the output column to store the assigned district
                      (default: "enacted_cd").
    """

    # Step 1: Read files (GeoPandas supports .shp and .geojson)
    precincts = gpd.read_file(precinct_path)
    districts = gpd.read_file(districts_path)

    # Step 2: Ensure valid geometries (helps prevent join errors)
    precincts["geometry"] = precincts["geometry"].buffer(0)
    districts["geometry"] = districts["geometry"].buffer(0)

    # Step 3: Put both into same CRS (use districts CRS as the "authority")
    if precincts.crs != districts.crs:
        precincts = precincts.to_crs(districts.crs)

    # Step 4: Representative point for stable point-in-polygon assignment
    pts = precincts[[precinct_id_col, "geometry"]].copy()
    pts["geometry"] = pts.geometry.representative_point()

    # Step 5: Spatial join: precinct point -> district polygon
    joined = gpd.sjoin(
        pts,
        districts[[district_id_col, "geometry"]],
        how="left",
        predicate="within",
    )

    # Step 6: Attach district id back onto full precinct polygons
    precincts = precincts.merge(
        joined[[precinct_id_col, district_id_col]],
        on=precinct_id_col,
        how="left",
        validate="one_to_one",
    )

    precincts.rename(columns={district_id_col: enacted_col}, inplace=True)
    print("Missing enacted_cd:", int(precincts[enacted_col].isna().sum()))
    print("Min enacted_cd:", precincts[enacted_col].min())
    print("Max enacted_cd:", precincts[enacted_col].max())
    print("Counts per enacted_cd:\n", precincts[enacted_col].value_counts(dropna=False).sort_index())

    # Step 7: Quick sanity checks
    missing = precincts[precincts[enacted_col].isna()]
    if len(missing) > 0:
        print(f"WARNING: {len(missing)} precincts did not get an enacted district.")
        print(missing[[precinct_id_col]].head(10))

    # Step 8: Save
    precincts.to_file(out_path, driver="GeoJSON")
    print(f"Saved: {out_path}")
    print("Unique enacted districts:", sorted(precincts[enacted_col].dropna().unique()))


# ── Script entry: Alabama ─────────────────────────────────────────────────
# precincts = gpd.read_file("AL-precincts-with-results.geojson")
# districts = gpd.read_file("AL_Congressional_Districts_Shapefile/SP_Remedial_Plan_3 2023-10-05.shp")
# print(districts.columns)
# print(precincts.columns)
assign_enacted_districts(
    precinct_path="BASE_FILES/AL-precincts-with-results.geojson",
    districts_path="BASE_FILES/AL_Congressional_Districts_Shapefile/SP_Remedial_Plan_3 2023-10-05.shp",
    out_path="AL_data/AL-precincts-with-results-enacted.geojson",
    precinct_id_col="GEOID",
    district_id_col="DISTRICT",
)

# ── Script entry: Oregon ──────────────────────────────────────────────────
# precincts = gpd.read_file("OR-precincts-with-results.geojson")
# districts = gpd.read_file("OR_Congressional_Districts.geojson")
# print(districts.columns)
# print(precincts.columns)
assign_enacted_districts(
    precinct_path="BASE_FILES/OR-precincts-with-results.geojson",
    districts_path="BASE_FILES/OR_Congressional_Districts.geojson",
    out_path="OR_data/OR-precincts-with-results-enacted.geojson",
    precinct_id_col="GEOID",
    district_id_col="DISTRICT",
)

# ── Post-process: cast enacted_cd to int for AL ───────────────────────────
al = gpd.read_file("AL_data/AL-precincts-with-results-enacted.geojson")
al["enacted_cd"] = al["enacted_cd"].astype(int)
al.to_file("AL_data/AL-precincts-with-results-enacted.geojson", driver="GeoJSON")

# ── Post-process: cast enacted_cd to int for OR ───────────────────────────
or_ = gpd.read_file("OR_data/OR-precincts-with-results-enacted.geojson")
or_["enacted_cd"] = or_["enacted_cd"].astype(int)
or_.to_file("OR_data/OR-precincts-with-results-enacted.geojson", driver="GeoJSON")
