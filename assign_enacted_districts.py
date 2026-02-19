import geopandas as gpd

def assign_enacted_districts(
    precinct_path: str,
    districts_path: str,
    out_path: str,
    precinct_id_col: str,
    district_id_col: str,
    enacted_col: str = "enacted_cd",
):
    # 1) Read files (GeoPandas supports .shp and .geojson)
    precincts = gpd.read_file(precinct_path)
    districts = gpd.read_file(districts_path)

    # 2) Ensure valid geometries (helps prevent join errors)
    precincts["geometry"] = precincts["geometry"].buffer(0)
    districts["geometry"] = districts["geometry"].buffer(0)

    # 3) Put both into same CRS (use districts CRS as the “authority”)
    if precincts.crs != districts.crs:
        precincts = precincts.to_crs(districts.crs)

    # 4) Representative point for stable point-in-polygon assignment
    pts = precincts[[precinct_id_col, "geometry"]].copy()
    pts["geometry"] = pts.geometry.representative_point()

    # 5) Spatial join: precinct point -> district polygon
    joined = gpd.sjoin(
        pts,
        districts[[district_id_col, "geometry"]],
        how="left",
        predicate="within",
    )

    # 6) Attach district id back onto full precinct polygons
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

    # 7) Quick sanity checks
    missing = precincts[precincts[enacted_col].isna()]
    if len(missing) > 0:
        print(f"WARNING: {len(missing)} precincts did not get an enacted district.")
        print(missing[[precinct_id_col]].head(10))

    # 8) Save
    precincts.to_file(out_path, driver="GeoJSON")
    print(f"Saved: {out_path}")
    print("Unique enacted districts:", sorted(precincts[enacted_col].dropna().unique()))

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

al = gpd.read_file("AL_data/AL-precincts-with-results-enacted.geojson")
al["enacted_cd"] = al["enacted_cd"].astype(int)
al.to_file("AL_data/AL-precincts-with-results-enacted.geojson", driver="GeoJSON")

or_ = gpd.read_file("OR_data/OR-precincts-with-results-enacted.geojson")
or_["enacted_cd"] = or_["enacted_cd"].astype(int)
or_.to_file("OR_data/OR-precincts-with-results-enacted.geojson", driver="GeoJSON")