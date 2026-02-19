import re
import pandas as pd
import geopandas as gpd

def build_precinct_geojson_with_vap(
    vap_csv_path: str,
    blocks_shp_path: str,
    precincts_geojson_path: str,
    output_geojson_path: str,
    *,
    # column names
    blocks_geoid_col: str = "GEOID20",      # in blocks shapefile
    precinct_id_col: str = "GEOID",         # in precinct file
    # spatial join settings
    target_crs: str = "EPSG:5070",
    join_predicate: str = "intersects",
    use_nh_any_combo: bool = True,
    verbose: bool = False,
) -> gpd.GeoDataFrame:
    """
    Reads block-level VAP CSV + block geometries, merges VAP into blocks, assigns blocks to precincts
    using centroid spatial join, aggregates VAP up to precincts, merges into precinct GeoDataFrame,
    creates standard columns, and writes output GeoJSON.

    Returns the final precinct GeoDataFrame.
    """

    # Read block VAP CSV
    pop = pd.read_csv(vap_csv_path, skiprows=[1], dtype=str)

    # 15-digit block GEOID from GEO_ID like "1000000US010010201001000"
    pop["GEOID_BLOCK"] = (
        pop["GEO_ID"]
        .str.replace("1000000US", "", regex=False)
        .str.strip()
        .str.zfill(15)
    )

    base_cols = ["P4_001N", "P4_002N", "P4_003N"]  # Total VAP, HVAP, NHVAP

    # Build label map
    hdr = pd.read_csv(vap_csv_path, header=None, nrows=2)
    col_ids = hdr.iloc[0].tolist()
    labels = hdr.iloc[1].tolist()

    def _s(x):
        return "" if x is None or (isinstance(x, float) and pd.isna(x)) or (isinstance(x, str) and x.strip() == "") else str(x)

    label_map = {_s(cid): _s(lab) for cid, lab in zip(col_ids, labels) if _s(cid)}

    def nh_any_cols(race_phrase: str) -> list[str]:
        """
        All P4_* columns in the Not Hispanic or Latino section whose label contains race_phrase.
        Captures: '...White alone' AND multi-race combos containing that phrase.
        """
        cols = []
        for cid, lab in label_map.items():
            if not cid.startswith("P4_"):
                continue
            if "Not Hispanic or Latino" not in lab:
                continue
            if re.search(rf"(^|[^A-Za-z]){re.escape(race_phrase)}([^A-Za-z]|$)", lab):
                cols.append(cid)
        return cols

    # Race phrases exactly as they appear in your label row
    RACE_PHRASES = {
        "WHITE": "White",
        "BLACK": "Black or African American",
        "AIAN":  "American Indian and Alaska Native",
        "ASIAN": "Asian",
        "NHOPI": "Native Hawaiian and Other Pacific Islander",
        "SOR":   "Some Other Race",
    }

    NH_ANY_COLS = {k: nh_any_cols(v) for k, v in RACE_PHRASES.items()} if use_nh_any_combo else {k: [] for k in RACE_PHRASES}

    if verbose and use_nh_any_combo:
        for k, cols in NH_ANY_COLS.items():
            print(f"{k}: found {len(cols)} columns")

    needed_race_cols = sorted({c for cols in NH_ANY_COLS.values() for c in cols})

    keep_cols = ["GEO_ID", "NAME", "GEOID_BLOCK"] + base_cols + needed_race_cols
    keep_cols = [c for c in keep_cols if c in pop.columns]
    vap = pop[keep_cols].copy()

    # convert numeric safely
    num_cols = [c for c in base_cols + needed_race_cols if c in vap.columns]
    vap[num_cols] = vap[num_cols].apply(pd.to_numeric, errors="coerce").fillna(0).astype(int)

    # compute NH race in ANY combo
    vap["NH_WHITE_ANY_VAP"] = vap[NH_ANY_COLS["WHITE"]].sum(axis=1) if NH_ANY_COLS["WHITE"] else 0
    vap["NH_BLACK_ANY_VAP"] = vap[NH_ANY_COLS["BLACK"]].sum(axis=1) if NH_ANY_COLS["BLACK"] else 0
    vap["NH_AIAN_ANY_VAP"]  = vap[NH_ANY_COLS["AIAN"]].sum(axis=1)  if NH_ANY_COLS["AIAN"]  else 0
    vap["NH_ASIAN_ANY_VAP"] = vap[NH_ANY_COLS["ASIAN"]].sum(axis=1) if NH_ANY_COLS["ASIAN"] else 0
    vap["NH_NHOPI_ANY_VAP"] = vap[NH_ANY_COLS["NHOPI"]].sum(axis=1) if NH_ANY_COLS["NHOPI"] else 0
    vap["NH_SOR_ANY_VAP"]   = vap[NH_ANY_COLS["SOR"]].sum(axis=1)   if NH_ANY_COLS["SOR"]   else 0

    agg_cols = [
        "P4_001N", "P4_002N", "P4_003N",
        "NH_WHITE_ANY_VAP", "NH_BLACK_ANY_VAP", "NH_AIAN_ANY_VAP",
        "NH_ASIAN_ANY_VAP", "NH_NHOPI_ANY_VAP", "NH_SOR_ANY_VAP",
    ]

    keep_cols = ["GEO_ID", "NAME", "GEOID_BLOCK"] + [c for c in agg_cols if c in vap.columns]
    vap = vap[keep_cols].copy()

    for c in agg_cols:
        if c in vap.columns:
            vap[c] = pd.to_numeric(vap[c], errors="coerce").fillna(0).astype(int)

    # ensure GEOID uniqueness
    if vap["GEOID_BLOCK"].duplicated().any():
        num_cols = [c for c in agg_cols if c in vap.columns]
        first_cols = ["GEO_ID", "NAME"]
        vap = (
            vap.groupby("GEOID_BLOCK", as_index=False)
               .agg({**{c: "sum" for c in num_cols},
                     **{c: "first" for c in first_cols}})
        )

    # -------------------------
    # B) Read block geometries
    # -------------------------
    blocks = gpd.read_file(blocks_shp_path)
    blocks["GEOID_BLOCK"] = blocks[blocks_geoid_col].astype(str).str.strip().str.zfill(15)

    # -------------------------
    # C) Merge VAP -> blocks
    # -------------------------
    blocks2 = blocks.merge(vap, on="GEOID_BLOCK", how="left")
    for c in agg_cols:
        if c in blocks2.columns:
            blocks2[c] = blocks2[c].fillna(0).astype(int)

    if verbose:
        missing = (blocks2["P4_001N"] == 0).sum() if "P4_001N" in blocks2.columns else None
        print("Blocks in shapefile:", len(blocks2))
        print("Rows in VAP table:", len(vap))
        if missing is not None:
            print("Blocks with VAP_TOTAL == 0:", int(missing))

    # -------------------------
    # F) Load precincts (with election results)
    # -------------------------
    prec = gpd.read_file(precincts_geojson_path)

    # Spatial join using block centroids
    blocks_proj = blocks2.to_crs(target_crs)
    prec_proj = prec.to_crs(target_crs)
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)

    blocks_pts = blocks_proj[["GEOID_BLOCK", "geometry"] + [c for c in agg_cols if c in blocks_proj.columns]].copy()
    blocks_pts["geometry"] = blocks_pts.geometry.centroid

    joined = gpd.sjoin(
        blocks_pts,
        prec_proj[[precinct_id_col, "geometry"]],
        how="left",
        predicate=join_predicate,
    )

    if verbose:
        unmatched_blocks = int(joined[precinct_id_col].isna().sum())
        print("Blocks not matched to any precinct:", unmatched_blocks)

    # Aggregate (sum) VAP per precinct
    agg = (
        joined.dropna(subset=[precinct_id_col])
              .groupby(precinct_id_col)[[c for c in agg_cols if c in joined.columns]]
              .sum()
              .reset_index()
    )

    # Merge back to precincts
    prec2 = prec.merge(agg, on=precinct_id_col, how="left")
    for c in agg_cols:
        if c in prec2.columns:
            prec2[c] = prec2[c].fillna(0).astype(int)

    if verbose:
        if "P4_001N" in prec2.columns and "P4_001N" in blocks2.columns:
            print("Precinct rows:", len(prec2))
            print("Total VAP across precincts:", int(prec2["P4_001N"].sum()))
            print("Total VAP across blocks:", int(blocks2["P4_001N"].sum()))

    # Standard column names at precinct level
    if "P4_001N" in prec2.columns:
        prec2["VAP"] = prec2["P4_001N"]
    if "P4_002N" in prec2.columns:
        prec2["HVAP"] = prec2["P4_002N"]
    if "P4_003N" in prec2.columns:
        prec2["NHVAP"] = prec2["P4_003N"]

    if verbose and "NHVAP" in prec2.columns:
        print("NHVAP:", int(prec2["NHVAP"].sum()))

    # Create minimal precinct dataframe (preserve geometry)
    keep_cols = [
        # identifiers
        "state", precinct_id_col, "official_boundary", "enacted_cd",
        # election results
        "votes_dem", "votes_rep", "votes_total", "pct_dem_lead",
        # demographics
        "VAP", "HVAP", "NHVAP",
        "NH_WHITE_ANY_VAP", "NH_BLACK_ANY_VAP", "NH_AIAN_ANY_VAP",
        "NH_ASIAN_ANY_VAP", "NH_NHOPI_ANY_VAP", "NH_SOR_ANY_VAP",
        # geometry
        "geometry",
    ]

    keep_cols = [c for c in keep_cols if c in prec2.columns]
    prec_clean = prec2[keep_cols].copy()

    # Ensure ints for numeric fields
    num_cols = [c for c in prec_clean.columns if c not in {"state", precinct_id_col, "official_boundary", "geometry"}]
    for c in num_cols:
        prec_clean[c] = pd.to_numeric(prec_clean[c], errors="coerce").fillna(0).astype(int)

    if verbose:
        print("Original columns:", len(prec2.columns))
        print("Cleaned columns:", len(prec_clean.columns))
        print("Cleaned column list:", list(prec_clean.columns))

    # Write output
    prec_clean.to_file(output_geojson_path, driver="GeoJSON")

    return prec_clean


AL = build_precinct_geojson_with_vap(
    vap_csv_path="AL-VAP-population.csv",
    blocks_shp_path="AL-shapefile/tl_2025_01_tabblock20.shp",
    precincts_geojson_path="AL-precincts-with-results-enacted.geojson",
    output_geojson_path="AL_precincts_full.geojson",
    verbose=True,
)

OR = build_precinct_geojson_with_vap(
    vap_csv_path="OR-VAP-population.csv",
    blocks_shp_path="OR-shapefile/tl_2025_41_tabblock20.shp",
    precincts_geojson_path="OR-precincts-with-results-enacted.geojson",
    output_geojson_path="OR_precincts_full.geojson",
    verbose=True,
)

def add_region_type_from_ruca(
    precincts_gdf: gpd.GeoDataFrame,
    tracts_path: str,
    ruca_csv_path: str,
    *,
    target_crs: str = "EPSG:5070",
    tract_geoid_col: str = "GEOID",
    ruca_tract_col: str = "TractFIPS20",
) -> gpd.GeoDataFrame:
    # Load tracts + RUCA
    tracts = gpd.read_file(tracts_path)
    ruca = pd.read_csv(ruca_csv_path, dtype=str, encoding="latin1")

    # Normalize IDs
    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)
    ruca["TRACT_ID"] = ruca[ruca_tract_col].astype(str).str.strip().str.zfill(11)

    ruca_keep = ruca[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription"]].copy()
    ruca_keep["PrimaryRUCA"] = pd.to_numeric(ruca_keep["PrimaryRUCA"], errors="coerce")

    # Merge RUCA attributes onto tract geometries
    tracts2 = tracts.merge(ruca_keep, on="TRACT_ID", how="left")

    # Project both
    prec_proj = precincts_gdf.to_crs(target_crs).copy()
    tracts_proj = tracts2.to_crs(target_crs).copy()
    tracts_proj["geometry"] = tracts_proj["geometry"].buffer(0)
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)

    # Centroid join: precinct -> tract
    prec_pts = prec_proj[["geometry"]].copy()
    prec_pts["geometry"] = prec_pts.geometry.centroid

    joined = gpd.sjoin(
        prec_pts,
        tracts_proj[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription", "geometry"]],
        how="left",
        predicate="within"
    )

    # Map RUCA -> region_type
    def ruca_to_region(x):
        if pd.isna(x):
            return None
        x = float(x)
        if 1 <= x <= 3:
            return "urban"
        if 4 <= x <= 6:
            return "suburban"
        if 7 <= x <= 10:
            return "rural"
        return "unknown"

    precincts_out = precincts_gdf.copy()
    precincts_out["PrimaryRUCA"] = joined["PrimaryRUCA"].values
    precincts_out["PrimaryRUCADescription"] = joined["PrimaryRUCADescription"].values
    precincts_out["region_type"] = precincts_out["PrimaryRUCA"].apply(ruca_to_region)

    return precincts_out

AL2 = add_region_type_from_ruca(
    AL,
    tracts_path="AL_tract/tl_2025_01_tract.shp",
    ruca_csv_path="region-type.csv",
)

OR2 = add_region_type_from_ruca(
    OR,
    tracts_path="OR_tract/tl_2025_41_tract.shp",
    ruca_csv_path="region-type.csv",
)

def add_income_from_acs_s1901(
    precincts_gdf: gpd.GeoDataFrame,
    tracts_path: str,
    income_csv_path: str,
    *,
    target_crs: str = "EPSG:5070",
    tract_geoid_col: str = "GEOID",
    keep_mean: bool = True,          # include mean income 
    keep_moe: bool = True,           # include margins of error 
) -> gpd.GeoDataFrame:
    """
    Adds tract-level ACS S1901 income fields onto precincts using centroid-in-tract join.

    Keeps only what you need:
      - HH_MEDIAN_INC (S1901_C01_012E)
      - (optional) HH_MEAN_INC (S1901_C01_013E)
      - (optional) MOEs
      - (optional) HH_TOTAL (S1901_C01_001E)
    """

    # 1) Load tract geometries
    tracts = gpd.read_file(tracts_path).copy()
    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)

    # 2) Load ACS income CSV (ACS profile exports usually have a 2-row header)
    inc_raw = pd.read_csv(income_csv_path, dtype=str, skiprows=[1])

    # 11-digit tract GEOID from GEO_ID like "1400000US41001950100"
    inc_raw["TRACT_ID"] = (
        inc_raw["GEO_ID"]
        .astype(str)
        .str.replace("1400000US", "", regex=False)
        .str.strip()
        .str.zfill(11)
    )

    # 3) Select minimal columns
    cols = ["TRACT_ID", "S1901_C01_001E", "S1901_C01_012E"]
    if keep_mean:
        cols.append("S1901_C01_013E")
    if keep_moe:
        cols += ["S1901_C01_012M"] + (["S1901_C01_013M"] if keep_mean else [])
    cols = [c for c in cols if c in inc_raw.columns]

    inc = inc_raw[cols].copy()

    # 4) Clean numeric fields
    # ACS sometimes uses "-" for missing and may include commas
    def to_num(s):
        return (
            pd.to_numeric(
                s.astype(str).str.replace(",", "", regex=False).replace({"-": None, "": None}),
                errors="coerce",
            )
            .fillna(0)
        )

    if "S1901_C01_001E" in inc.columns:
        inc["S1901_C01_001E"] = to_num(inc["S1901_C01_001E"]).astype(int)

    # store incomes as int dollars
    for c in ["S1901_C01_012E", "S1901_C01_013E", "S1901_C01_012M", "S1901_C01_013M"]:
        if c in inc.columns:
            inc[c] = to_num(inc[c]).round(0).astype(int)

    # 5) Rename to friendly precinct columns
    rename = {}
    if "S1901_C01_001E" in inc.columns:
        rename["S1901_C01_001E"] = "HH_TOTAL"
    if "S1901_C01_012E" in inc.columns:
        rename["S1901_C01_012E"] = "HH_MEDIAN_INC"
    if "S1901_C01_013E" in inc.columns:
        rename["S1901_C01_013E"] = "HH_MEAN_INC"
    if "S1901_C01_012M" in inc.columns:
        rename["S1901_C01_012M"] = "HH_MEDIAN_INC_MOE"
    if "S1901_C01_013M" in inc.columns:
        rename["S1901_C01_013M"] = "HH_MEAN_INC_MOE"

    inc = inc.rename(columns=rename)

    # 6) Merge income onto tract geometries
    tracts2 = tracts.merge(inc, on="TRACT_ID", how="left")

    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in tracts2.columns:
            tracts2[c] = tracts2[c].fillna(0).astype(int)

    # 7) Spatial join: precinct centroid -> tract polygon
    prec_proj = precincts_gdf.to_crs(target_crs).copy()
    tracts_proj = tracts2.to_crs(target_crs).copy()
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)
    tracts_proj["geometry"] = tracts_proj["geometry"].buffer(0)

    prec_pts = prec_proj[["geometry"]].copy()
    prec_pts["geometry"] = prec_pts.geometry.centroid

    joined = gpd.sjoin(
        prec_pts,
        tracts_proj[["TRACT_ID", "geometry"] + [c for c in tracts_proj.columns if c in {
            "HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"
        }]],
        how="left",
        predicate="within",
    )

    # 8) Attach back to precincts
    out = precincts_gdf.copy()
    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in joined.columns:
            out[c] = joined[c].values


    # out["AVG_HH_INC"] = out["HH_MEDIAN_INC"]

    out["AVG_HH_INC"] = out["HH_MEAN_INC"]

    return out

AL3 = add_income_from_acs_s1901(
    AL2,
    tracts_path="AL_tract/tl_2025_01_tract.shp",
    income_csv_path="AL-income.csv",
)

OR3 = add_income_from_acs_s1901(
    OR2,
    tracts_path="OR_tract/tl_2025_41_tract.shp",
    income_csv_path="OR-income.csv",
)

AL3.to_file("AL_precincts_full.geojson", driver="GeoJSON")
OR3.to_file("OR_precincts_full.geojson", driver="GeoJSON")


def qa(df, name):
    print("\n==", name, "==")
    print("rows:", len(df))
    for c in ["VAP","HVAP","NHVAP"]:
        print(c, "sum:", int(df[c].sum()))
    print("Check VAP == HVAP + NHVAP (sum):", int(df["VAP"].sum()), int((df["HVAP"] + df["NHVAP"]).sum()))
    print("Any negative VAP?", (df["VAP"] < 0).any())

    for c in ["NH_WHITE_ANY_VAP","NH_BLACK_ANY_VAP","NH_AIAN_ANY_VAP","NH_ASIAN_ANY_VAP","NH_NHOPI_ANY_VAP","NH_SOR_ANY_VAP"]:
        if c in df.columns:
            print(c, "max:", int(df[c].max()), "sum:", int(df[c].sum()), "over NHVAP rows:", int((df[c] > df["NHVAP"]).sum()))

qa(AL3, "AL")
qa(OR3, "OR")

def qa_region(df, name):
    print("\n==", name, "region_type QA ==")
    print("has region_type col?", "region_type" in df.columns)
    if "region_type" in df.columns:
        print(df["region_type"].value_counts(dropna=False))
        print("missing region_type:", int(df["region_type"].isna().sum()))
        print("missing PrimaryRUCA:", int(df["PrimaryRUCA"].isna().sum()))


qa_region(AL3, "AL2")
qa_region(OR3, "OR2")


def qa_income(df, name):
    print("\n==", name, "income QA ==")
    for c in ["AVG_HH_INC", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_TOTAL"]:
        if c in df.columns:
            print(c, "min/max/sum_nonzero:",
                  int(df[c].min()), int(df[c].max()), int((df[c] > 0).sum()))
    if "AVG_HH_INC" in df.columns:
        print("Missing AVG_HH_INC:", int((df["AVG_HH_INC"] == 0).sum()))

qa_income(AL3, "AL3")
qa_income(OR3, "OR3")

# crude check: average of tract medians (unweighted) won't match state median, but should be in the same ballpark
print(AL3["HH_MEDIAN_INC"].replace(0, pd.NA).dropna().median())
print(OR3["HH_MEDIAN_INC"].replace(0, pd.NA).dropna().median())

missing_al = AL3[AL3["HH_MEDIAN_INC"] == 0][["GEOID", "geometry"]]
missing_or = OR3[OR3["HH_MEDIAN_INC"] == 0][["GEOID", "geometry"]]
print("missing AL precincts:", len(missing_al))
print("missing OR precincts:", len(missing_or))

