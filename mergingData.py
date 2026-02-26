"""
mergingData.py
==============
Builds enriched precinct GeoJSON files by joining Census block-level VAP
(Voting Age Population) data, RUCA region classifications, and ACS S1901
household income data onto precinct polygons.

Pipeline (executed in __main__ block)
--------------------------------------
1. build_precinct_geojson_with_vap  — Joins Census P.L. 94-171 block VAP CSV
   onto block geometries, assigns each block to a precinct via representative-
   point spatial join (with nearest fallback), aggregates VAP by group, and
   writes the enriched precinct GeoJSON.
2. add_region_type_from_ruca        — Joins USDA RUCA codes onto Census tract
   geometries, then assigns each precinct a region_type label (urban /
   suburban / rural) via point-in-polygon join.
3. add_income_from_acs_s1901        — Joins ACS S1901 tract-level income
   estimates onto precincts via representative-point join, with optional
   nearest-neighbor imputation for precincts that fall outside all tract
   polygons.

QA helpers (qa, qa_region, qa_income) print diagnostic summaries for each
output GeoDataFrame.

Dependencies: re, pandas, geopandas
"""

import re
from typing import Optional

import pandas as pd
import geopandas as gpd


# ── Helpers ───────────────────────────────────────────────────────────────

def _safe_str(x) -> str:
    """
    Safely convert a value to a stripped string.
    Returns an empty string for None or float NaN.

    Parameters
    ----------
    x : any
        Value to convert.

    Returns
    -------
    str
        Stripped string representation, or "" for None / NaN.
    """
    if x is None:
        return ""
    if isinstance(x, float) and pd.isna(x):
        return ""
    s = str(x)
    return s.strip()


def _to_int_series(s: pd.Series) -> pd.Series:
    """
    Coerce a pandas Series to integers, filling unparseable values with 0.

    Parameters
    ----------
    s : pd.Series
        Series of values to convert.

    Returns
    -------
    pd.Series
        Integer Series with NaN replaced by 0.
    """
    return pd.to_numeric(s, errors="coerce").fillna(0).astype(int)


def _col_or_zero(df: pd.DataFrame, col: Optional[str]):
    """
    Return a DataFrame column by name, or the integer 0 if the column is
    None or not present in the DataFrame.

    Parameters
    ----------
    df  : pd.DataFrame  Source DataFrame.
    col : str or None   Column name to look up.

    Returns
    -------
    pd.Series or int
        The named column, or 0.
    """
    return df[col] if (col is not None and col in df.columns) else 0


def _print_vap_balance(prefix: str, blocks_df: gpd.GeoDataFrame, prec_df: gpd.GeoDataFrame):
    """
    Print a VAP balance check comparing the sum of P4_001N across blocks
    versus precincts, flagging any difference caused by unmatched blocks.

    Parameters
    ----------
    prefix    : str                 Label prefix for each print line.
    blocks_df : gpd.GeoDataFrame    Block-level GeoDataFrame with P4_001N.
    prec_df   : gpd.GeoDataFrame    Precinct-level GeoDataFrame with P4_001N.
    """
    if "P4_001N" in blocks_df.columns and "P4_001N" in prec_df.columns:
        b = int(blocks_df["P4_001N"].sum())
        p = int(prec_df["P4_001N"].sum())
        print(f"{prefix} Total VAP across blocks:    {b}")
        print(f"{prefix} Total VAP across precincts: {p}")
        print(f"{prefix} Difference (prec - blocks): {p - b}")


# ── Main: Build precinct geojson with VAP groups ──────────────────────────

def build_precinct_geojson_with_vap(
    vap_csv_path: str,
    blocks_shp_path: str,
    precincts_geojson_path: str,
    output_geojson_path: str,
    *,
    # column names
    blocks_geoid_col: str = "GEOID20",  # in blocks shapefile
    precinct_id_col: str = "GEOID",     # in precinct file

    # spatial join settings
    target_crs: str = "EPSG:5070",
    verbose: bool = False,
) -> gpd.GeoDataFrame:
    """
    Read block-level VAP CSV + block geometries, merge VAP into blocks,
    assign blocks to precincts using representative_point spatial join (with
    within + dedupe + nearest fallback), aggregate to precincts, merge into
    precinct GeoDataFrame, standardize columns, and write output GeoJSON.

    Demographic groups computed:
      - LATINO_VAP          = Hispanic/Latino VAP (any race) = HVAP (P4_002N)
      - NH_WHITE_ALONE_VAP  = Not Hispanic, White alone
      - NH_BLACK_ALONE_VAP  = Not Hispanic, Black alone
      - NH_ASIAN_ALONE_VAP  = Not Hispanic, Asian alone
      - OTHER_VAP           = remaining NHVAP after subtracting the above

    Parameters
    ----------
    vap_csv_path           : Path to the Census P.L. 94-171 redistricting
                             CSV with block-level VAP data.
    blocks_shp_path        : Path to the Census TIGER block shapefile (.shp).
    precincts_geojson_path : Path to the input precinct GeoJSON (must already
                             have enacted_cd from assign_enacted_districts.py).
    output_geojson_path    : Destination path for the enriched precinct GeoJSON.
    blocks_geoid_col       : Column name of the block GEOID in the shapefile.
    precinct_id_col        : Column name of the precinct identifier.
    target_crs             : EPSG code for the projected CRS used during joins.
    verbose                : Print diagnostic counts when True.

    Returns
    -------
    gpd.GeoDataFrame
        Enriched precinct GeoDataFrame (also written to output_geojson_path).
    """

    # ── Step A: Read block VAP CSV ────────────────────────────────────────
    pop = pd.read_csv(vap_csv_path, skiprows=[1], dtype=str)

    # Step A-1: Build 15-digit block GEOID from GEO_ID (e.g. "1000000US010010201001000")
    pop["GEOID_BLOCK"] = (
        pop["GEO_ID"]
        .astype(str)
        .str.replace("1000000US", "", regex=False)
        .str.strip()
        .str.zfill(15)
    )

    # Step A-2: Base VAP columns: total, HVAP, NHVAP
    base_cols = ["P4_001N", "P4_002N", "P4_003N"]

    # Step A-3: Build label map from first 2 rows (ID row + label row)
    hdr = pd.read_csv(vap_csv_path, header=None, nrows=2)
    col_ids = hdr.iloc[0].tolist()
    labels = hdr.iloc[1].tolist()
    label_map = {_safe_str(cid): _safe_str(lab) for cid, lab in zip(col_ids, labels) if _safe_str(cid)}

    def nh_alone_col(race_phrase: str) -> Optional[str]:
        """
        Find the P4_* column ID matching:
          'Not Hispanic or Latino: <race_phrase> alone'
        Excludes combination/multi-race lines by requiring ' alone' in the label.

        Parameters
        ----------
        race_phrase : str  Race phrase to search for (e.g. "White").

        Returns
        -------
        str or None
            Column ID (e.g. "P4_007N"), or None if not found.
        """
        # fairly permissive, but still anchored on NH section and "... <race> alone"
        pat = re.compile(rf"\bNot Hispanic or Latino\b.*\b{re.escape(race_phrase)}\s+alone\b", re.IGNORECASE)
        for cid, lab in label_map.items():
            if not cid.startswith("P4_"):
                continue
            if "Not Hispanic or Latino" not in lab:
                continue
            if pat.search(lab):
                return cid
        return None

    # Step A-4: Locate the "alone" sub-group columns
    NH_WHITE_ALONE_COL = nh_alone_col("White")
    NH_BLACK_ALONE_COL = nh_alone_col("Black or African American")
    NH_ASIAN_ALONE_COL = nh_alone_col("Asian")

    if verbose:
        print("NH_WHITE_ALONE_COL:", NH_WHITE_ALONE_COL)
        print("NH_BLACK_ALONE_COL:", NH_BLACK_ALONE_COL)
        print("NH_ASIAN_ALONE_COL:", NH_ASIAN_ALONE_COL)

    # Step A-5: Keep only needed columns
    keep_cols = ["GEO_ID", "NAME", "GEOID_BLOCK"] + base_cols
    for c in [NH_WHITE_ALONE_COL, NH_BLACK_ALONE_COL, NH_ASIAN_ALONE_COL]:
        if c and c in pop.columns:
            keep_cols.append(c)
    keep_cols = [c for c in keep_cols if c in pop.columns]

    vap = pop[keep_cols].copy()

    # Step A-6: Convert numeric safely
    num_cols = [c for c in base_cols if c in vap.columns]
    for c in [NH_WHITE_ALONE_COL, NH_BLACK_ALONE_COL, NH_ASIAN_ALONE_COL]:
        if c and c in vap.columns:
            num_cols.append(c)
    vap[num_cols] = vap[num_cols].apply(_to_int_series)

    # Step A-7: Compute requested demographic groups at block level
    vap["LATINO_VAP"] = vap["P4_002N"] if "P4_002N" in vap.columns else 0
    vap["NH_WHITE_ALONE_VAP"] = _col_or_zero(vap, NH_WHITE_ALONE_COL)
    vap["NH_BLACK_ALONE_VAP"] = _col_or_zero(vap, NH_BLACK_ALONE_COL)
    vap["NH_ASIAN_ALONE_VAP"] = _col_or_zero(vap, NH_ASIAN_ALONE_COL)

    nhvap = vap["P4_003N"] if "P4_003N" in vap.columns else 0
    vap["OTHER_VAP"] = (nhvap - vap["NH_WHITE_ALONE_VAP"] - vap["NH_BLACK_ALONE_VAP"] - vap["NH_ASIAN_ALONE_VAP"]).clip(lower=0)

    # Step A-8: Aggregation columns to carry through to blocks/precincts
    agg_cols = [
        "P4_001N",  # VAP
        "P4_002N",  # HVAP (= Latino any race)
        "P4_003N",  # NHVAP
        "LATINO_VAP",
        "NH_WHITE_ALONE_VAP",
        "NH_BLACK_ALONE_VAP",
        "NH_ASIAN_ALONE_VAP",
        "OTHER_VAP",
    ]
    agg_cols = [c for c in agg_cols if c in vap.columns]

    # Step A-9: Ensure GEOID uniqueness (dedupe by summing numeric cols)
    if vap["GEOID_BLOCK"].duplicated().any():
        first_cols = [c for c in ["GEO_ID", "NAME"] if c in vap.columns]
        vap = (
            vap.groupby("GEOID_BLOCK", as_index=False)
            .agg({**{c: "sum" for c in agg_cols}, **{c: "first" for c in first_cols}})
        )

    # ── Step B: Read block geometries ─────────────────────────────────────
    blocks = gpd.read_file(blocks_shp_path)
    blocks["GEOID_BLOCK"] = blocks[blocks_geoid_col].astype(str).str.strip().str.zfill(15)

    # ── Step C: Merge VAP -> blocks ───────────────────────────────────────
    blocks2 = blocks.merge(vap[["GEOID_BLOCK"] + agg_cols], on="GEOID_BLOCK", how="left")
    for c in agg_cols:
        blocks2[c] = pd.to_numeric(blocks2[c], errors="coerce").fillna(0).astype(int)

    if verbose:
        print("Blocks in shapefile:", len(blocks2))
        print("Rows in VAP table:", len(vap))
        # more meaningful than "==0" in many states (water blocks):
        missing_merge = int(blocks2[agg_cols[0]].isna().sum()) if agg_cols else 0
        print("Blocks missing merged VAP rows:", missing_merge)

    # ── Step D: Load precincts ────────────────────────────────────────────
    prec = gpd.read_file(precincts_geojson_path)

    # ── Step E: Block -> Precinct assignment (FIXED) ──────────────────────
    blocks_proj = blocks2.to_crs(target_crs)
    prec_proj = prec.to_crs(target_crs)

    # Step E-1: Attempt to clean geometries (helps with invalid polygons)
    blocks_proj["geometry"] = blocks_proj["geometry"].buffer(0)
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)

    # Step E-2: Points guaranteed inside each block polygon
    blocks_pts = blocks_proj[["GEOID_BLOCK", "geometry"] + agg_cols].copy()
    blocks_pts["geometry"] = blocks_pts.geometry.representative_point()

    # Step E-3: Strict point-in-polygon join
    joined = gpd.sjoin(
        blocks_pts,
        prec_proj[[precinct_id_col, "geometry"]],
        how="left",
        predicate="within",
    )

    # Step E-4: Eliminate double counting: ensure 1 precinct per block
    joined = joined.sort_values(["GEOID_BLOCK", precinct_id_col]).drop_duplicates(subset=["GEOID_BLOCK"])

    # Step E-5: Fallback for unmatched blocks: nearest precinct
    unmatched_idx = joined[joined[precinct_id_col].isna()].index

    if len(unmatched_idx):
        unmatched = joined.loc[unmatched_idx].drop(columns=["index_right"], errors="ignore")

        nearest = gpd.sjoin_nearest(
            unmatched.drop(columns=[precinct_id_col], errors="ignore"),
            prec_proj[[precinct_id_col, "geometry"]],
            how="left",
            distance_col="__dist",
        )

        # sjoin_nearest can return >1 row per input index when there are distance ties.
        # Keep one match per input row (index) and align back to unmatched_idx ordering.
        nearest = nearest[~nearest.index.duplicated(keep="first")]
        nearest = nearest.reindex(unmatched_idx)
        joined.loc[unmatched_idx, precinct_id_col] = nearest[precinct_id_col].to_numpy()

    if verbose:
        dup_blocks = int(joined["GEOID_BLOCK"].duplicated().sum())
        unmatched_blocks = int(joined[precinct_id_col].isna().sum())
        print("Duplicate blocks after join:", dup_blocks)
        print("Blocks not matched to any precinct:", unmatched_blocks)

    # ── Step F: Aggregate (sum) VAP per precinct ──────────────────────────
    agg = (
        joined.dropna(subset=[precinct_id_col])
        .groupby(precinct_id_col)[agg_cols]
        .sum()
        .reset_index()
    )

    # Step F-1: Merge back to precincts
    prec2 = prec.merge(agg, on=precinct_id_col, how="left")
    for c in agg_cols:
        prec2[c] = pd.to_numeric(prec2[c], errors="coerce").fillna(0).astype(int)

    if verbose:
        print("Precinct rows:", len(prec2))
        _print_vap_balance(prefix="", blocks_df=blocks2, prec_df=prec2)

    # Step F-2: Standardize column names at precinct level
    if "P4_001N" in prec2.columns:
        prec2["VAP"] = prec2["P4_001N"]
    if "P4_002N" in prec2.columns:
        prec2["HVAP"] = prec2["P4_002N"]       # keep original HVAP
        prec2["LATINO_VAP"] = prec2["P4_002N"] # requested Latino
    if "P4_003N" in prec2.columns:
        prec2["NHVAP"] = prec2["P4_003N"]

    # Step F-3: Ensure OTHER_VAP is consistent with precinct-level values too
    if all(c in prec2.columns for c in ["NHVAP", "NH_WHITE_ALONE_VAP", "NH_BLACK_ALONE_VAP", "NH_ASIAN_ALONE_VAP"]):
        prec2["OTHER_VAP"] = (
            prec2["NHVAP"]
            - prec2["NH_WHITE_ALONE_VAP"]
            - prec2["NH_BLACK_ALONE_VAP"]
            - prec2["NH_ASIAN_ALONE_VAP"]
        ).clip(lower=0).astype(int)

    # ── Step G: Create minimal precinct dataframe (preserve geometry) ──────
    keep_cols_out = [
        # identifiers
        "state", precinct_id_col, "official_boundary", "enacted_cd",

        # election results
        "votes_dem", "votes_rep", "votes_total", "pct_dem_lead",

        # demographics
        "VAP", "HVAP", "NHVAP",
        "LATINO_VAP",
        "NH_WHITE_ALONE_VAP", "NH_BLACK_ALONE_VAP", "NH_ASIAN_ALONE_VAP",
        "OTHER_VAP",

        # geometry
        "geometry",
    ]
    keep_cols_out = [c for c in keep_cols_out if c in prec2.columns]
    prec_clean = prec2[keep_cols_out].copy()

    # Step G-1: Ensure ints for numeric fields
    id_like = {"state", precinct_id_col, "official_boundary", "geometry"}
    for c in prec_clean.columns:
        if c not in id_like:
            prec_clean[c] = pd.to_numeric(prec_clean[c], errors="coerce").fillna(0).astype(int)

    if verbose:
        print("Original columns:", len(prec2.columns))
        print("Cleaned columns:", len(prec_clean.columns))
        print("Cleaned column list:", list(prec_clean.columns))

        if all(c in prec_clean.columns for c in ["VAP", "LATINO_VAP", "NHVAP"]):
            print(
                "Check VAP == LATINO_VAP + NHVAP (sum):",
                int(prec_clean["VAP"].sum()),
                int((prec_clean["LATINO_VAP"] + prec_clean["NHVAP"]).sum()),
            )
        if all(c in prec_clean.columns for c in ["NHVAP", "NH_WHITE_ALONE_VAP", "NH_BLACK_ALONE_VAP", "NH_ASIAN_ALONE_VAP", "OTHER_VAP"]):
            nh_parts = (
                prec_clean["NH_WHITE_ALONE_VAP"]
                + prec_clean["NH_BLACK_ALONE_VAP"]
                + prec_clean["NH_ASIAN_ALONE_VAP"]
                + prec_clean["OTHER_VAP"]
            )
            print(
                "Check NHVAP == White+Black+Asian+Other (sum):",
                int(prec_clean["NHVAP"].sum()),
                int(nh_parts.sum()),
            )

    # Step G-2: Write output
    prec_clean.to_file(output_geojson_path, driver="GeoJSON")
    return prec_clean


# ── RUCA: add region_type ─────────────────────────────────────────────────

def add_region_type_from_ruca(
    precincts_gdf: gpd.GeoDataFrame,
    tracts_path: str,
    ruca_csv_path: str,
    *,
    target_crs: str = "EPSG:5070",
    tract_geoid_col: str = "GEOID",
    ruca_tract_col: str = "TractFIPS20",
) -> gpd.GeoDataFrame:
    """
    Join USDA RUCA (Rural-Urban Commuting Area) codes onto precincts to assign
    a region_type label (urban / suburban / rural / unknown) to each precinct.

    Strategy: Assign each precinct the RUCA code of the Census tract that
    contains its representative point, then map that code to a region label.

    Parameters
    ----------
    precincts_gdf   : gpd.GeoDataFrame  Input precinct GeoDataFrame.
    tracts_path     : str               Path to the Census tract shapefile.
    ruca_csv_path   : str               Path to the RUCA CSV with PrimaryRUCA column.
    target_crs      : str               EPSG code for projected CRS used in joins.
    tract_geoid_col : str               GEOID column name in the tract shapefile.
    ruca_tract_col  : str               Tract FIPS column name in the RUCA CSV.

    Returns
    -------
    gpd.GeoDataFrame
        Copy of precincts_gdf with added columns: PrimaryRUCA,
        PrimaryRUCADescription, region_type.
    """
    # Step 0: Load tracts + RUCA
    tracts = gpd.read_file(tracts_path)
    ruca = pd.read_csv(ruca_csv_path, dtype=str, encoding="latin1")

    # Step 1: Normalize IDs
    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)
    ruca["TRACT_ID"] = ruca[ruca_tract_col].astype(str).str.strip().str.zfill(11)

    ruca_keep = ruca[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription"]].copy()
    ruca_keep["PrimaryRUCA"] = pd.to_numeric(ruca_keep["PrimaryRUCA"], errors="coerce")

    # Step 2: Merge RUCA onto tracts
    tracts2 = tracts.merge(ruca_keep, on="TRACT_ID", how="left")

    # Step 3: Project and clean geometries
    prec_proj = precincts_gdf.to_crs(target_crs).copy()
    tracts_proj = tracts2.to_crs(target_crs).copy()
    tracts_proj["geometry"] = tracts_proj["geometry"].buffer(0)
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)

    # Step 4: Representative point is safer than centroid (holes/coast)
    prec_pts = prec_proj[["geometry"]].copy()
    prec_pts["geometry"] = prec_pts.geometry.representative_point()

    joined = gpd.sjoin(
        prec_pts,
        tracts_proj[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription", "geometry"]],
        how="left",
        predicate="within",
    )

    def ruca_to_region(x):
        """
        Map a RUCA primary code to a region_type label.

        Parameters
        ----------
        x : float or None  RUCA primary code.

        Returns
        -------
        str or None
            "urban", "suburban", "rural", "unknown", or None if NaN.
        """
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

    # Step 5: Attach RUCA values and map to region_type
    out = precincts_gdf.copy()
    out["PrimaryRUCA"] = joined["PrimaryRUCA"].values
    out["PrimaryRUCADescription"] = joined["PrimaryRUCADescription"].values
    out["region_type"] = out["PrimaryRUCA"].apply(ruca_to_region)
    return out


# ── ACS Income: add income fields ─────────────────────────────────────────

def add_income_from_acs_s1901(
    precincts_gdf: gpd.GeoDataFrame,
    tracts_path: str,
    income_csv_path: str,
    *,
    target_crs: str = "EPSG:5070",
    tract_geoid_col: str = "GEOID",
    keep_mean: bool = True,   # include mean income
    keep_moe: bool = True,    # include margins of error
    use_nearest_fallback: bool = True,          # for centroid/within misses
    impute_missing_income: bool = True,         # nearest non-missing tract imputation
) -> gpd.GeoDataFrame:
    """
    Add tract-level ACS S1901 income fields onto precincts using a
    representative-point-in-tract join. Precincts whose joined income is
    missing/0 are optionally filled from the nearest tract with non-missing
    income (when impute_missing_income=True).

    Parameters
    ----------
    precincts_gdf         : gpd.GeoDataFrame  Input precinct GeoDataFrame.
    tracts_path           : str               Path to the Census tract shapefile.
    income_csv_path       : str               Path to ACS S1901 income CSV.
    target_crs            : str               EPSG code for projected CRS.
    tract_geoid_col       : str               GEOID column in the tract shapefile.
    keep_mean             : bool              Include mean household income column.
    keep_moe              : bool              Include margin-of-error columns.
    use_nearest_fallback  : bool              Fallback to nearest tract for
                                              precincts that miss the within join.
    impute_missing_income : bool              Fill zero/missing income from the
                                              nearest tract with non-zero income.

    Returns
    -------
    gpd.GeoDataFrame
        Copy of precincts_gdf with added income columns:
        HH_TOTAL, HH_MEDIAN_INC, HH_MEAN_INC, HH_MEDIAN_INC_MOE,
        HH_MEAN_INC_MOE, AVG_HH_INC, INCOME_IMPUTED, INCOME_MISSING.
    """

    # Step 1: Load tract geometries
    tracts = gpd.read_file(tracts_path).copy()
    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)

    # Step 2: Load ACS income CSV (ACS profile exports usually have a 2-row header)
    inc_raw = pd.read_csv(income_csv_path, dtype=str, skiprows=[1])

    # Step 2a: 11-digit tract GEOID from GEO_ID like "1400000US41001950100"
    inc_raw["TRACT_ID"] = (
        inc_raw["GEO_ID"]
        .astype(str)
        .str.replace("1400000US", "", regex=False)
        .str.strip()
        .str.zfill(11)
    )

    # Step 3: Select minimal columns
    cols = ["TRACT_ID", "S1901_C01_001E", "S1901_C01_012E"]
    if keep_mean:
        cols.append("S1901_C01_013E")
    if keep_moe:
        cols += ["S1901_C01_012M"] + (["S1901_C01_013M"] if keep_mean else [])
    cols = [c for c in cols if c in inc_raw.columns]
    inc = inc_raw[cols].copy()

    # Step 4: Clean numeric fields (keep your existing "0 if missing" behavior)
    def to_num(series: pd.Series) -> pd.Series:
        """
        Parse a string Series as numeric, stripping commas and replacing
        missing sentinels ("-", "") with 0.

        Parameters
        ----------
        series : pd.Series  String Series to parse.

        Returns
        -------
        pd.Series  Float Series with NaN filled to 0.
        """
        return (
            pd.to_numeric(
                series.astype(str).str.replace(",", "", regex=False).replace({"-": None, "": None}),
                errors="coerce",
            )
            .fillna(0)
        )

    if "S1901_C01_001E" in inc.columns:
        inc["S1901_C01_001E"] = to_num(inc["S1901_C01_001E"]).astype(int)

    for c in ["S1901_C01_012E", "S1901_C01_013E", "S1901_C01_012M", "S1901_C01_013M"]:
        if c in inc.columns:
            inc[c] = to_num(inc[c]).round(0).astype(int)

    # Step 5: Rename to friendly columns
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

    # Step 6: Merge income onto tract geometries
    tracts2 = tracts.merge(inc, on="TRACT_ID", how="left")
    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in tracts2.columns:
            tracts2[c] = pd.to_numeric(tracts2[c], errors="coerce").fillna(0).astype(int)

    # Step 7: Spatial join: precinct representative point -> tract polygon
    prec_proj = precincts_gdf.to_crs(target_crs).copy()
    tracts_proj = tracts2.to_crs(target_crs).copy()
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)
    tracts_proj["geometry"] = tracts_proj["geometry"].buffer(0)

    prec_pts = prec_proj[["geometry"]].copy()
    prec_pts["geometry"] = prec_pts.geometry.representative_point()

    attrs = [c for c in [
        "TRACT_ID",
        "HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC",
        "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"
    ] if c in tracts_proj.columns]

    joined = gpd.sjoin(
        prec_pts,
        tracts_proj[attrs + ["geometry"]],
        how="left",
        predicate="within",
    )

    # Step 7a: Fallback for points that didn't fall within any tract polygon
    if use_nearest_fallback:
        unmatched_idx = joined[joined["TRACT_ID"].isna()].index
        if len(unmatched_idx):
            unmatched = joined.loc[unmatched_idx].drop(columns=["index_right"], errors="ignore")
            nearest = gpd.sjoin_nearest(
                unmatched.drop(columns=["TRACT_ID"], errors="ignore"),
                tracts_proj[attrs + ["geometry"]],
                how="left",
                distance_col="__dist",
            )
            # tie-safe: keep 1 row per precinct index
            nearest = nearest[~nearest.index.duplicated(keep="first")].reindex(unmatched_idx)
            for c in attrs:
                if c in nearest.columns:
                    joined.loc[unmatched_idx, c] = nearest[c].values

    # Step 8: Attach back to precincts (still as ints with 0 for missing)
    out = precincts_gdf.copy()
    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in joined.columns:
            out[c] = pd.to_numeric(joined[c], errors="coerce").fillna(0).astype(int)

    # Step 9: Impute missing incomes from nearest tract with non-missing income
    # Define missing as BOTH mean and median == 0 (existing cleaning convention).
    out["INCOME_IMPUTED"] = False

    if impute_missing_income and ("HH_MEDIAN_INC" in out.columns or "HH_MEAN_INC" in out.columns):
        # Step 9a: precinct points again (projected)
        prec_pts2 = prec_proj[["geometry"]].copy()
        prec_pts2["geometry"] = prec_pts2.geometry.representative_point()

        # Step 9b: Which precincts need income imputation?
        has_mean = "HH_MEAN_INC" in out.columns
        has_median = "HH_MEDIAN_INC" in out.columns

        if has_mean and has_median:
            missing_mask = (out["HH_MEAN_INC"] == 0) & (out["HH_MEDIAN_INC"] == 0)
        elif has_mean:
            missing_mask = (out["HH_MEAN_INC"] == 0)
        else:
            missing_mask = (out["HH_MEDIAN_INC"] == 0)

        missing_idx = out.index[missing_mask]
        if len(missing_idx):
            # Step 9c: Use only tracts that have SOME non-missing income
            tracts_good = tracts_proj.copy()
            good_mask = pd.Series(False, index=tracts_good.index)
            if "HH_MEAN_INC" in tracts_good.columns:
                good_mask = good_mask | (tracts_good["HH_MEAN_INC"] > 0)
            if "HH_MEDIAN_INC" in tracts_good.columns:
                good_mask = good_mask | (tracts_good["HH_MEDIAN_INC"] > 0)
            tracts_good = tracts_good.loc[good_mask]

            if len(tracts_good):
                # Step 9d: Nearest join for just missing precincts
                miss_pts = prec_pts2.loc[missing_idx].copy()
                nearest_good = gpd.sjoin_nearest(
                    miss_pts,
                    tracts_good[attrs + ["geometry"]],
                    how="left",
                    distance_col="__dist",
                )
                # tie-safe: keep 1 per precinct
                nearest_good = nearest_good[~nearest_good.index.duplicated(keep="first")].reindex(missing_idx)

                # Step 9e: Fill income fields from nearest good tract
                for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
                    if c in out.columns and c in nearest_good.columns:
                        out.loc[missing_idx, c] = pd.to_numeric(nearest_good[c], errors="coerce").fillna(0).astype(int).values

                out.loc[missing_idx, "INCOME_IMPUTED"] = True

    # Step 10: AVG_HH_INC (prefer mean, fallback to median)
    if "HH_MEAN_INC" in out.columns and "HH_MEDIAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEAN_INC"].where(out["HH_MEAN_INC"] > 0, out["HH_MEDIAN_INC"]).astype(int)
    elif "HH_MEAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEAN_INC"].astype(int)
    elif "HH_MEDIAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEDIAN_INC"].astype(int)

    # Step 11: Optional flag to track anything still missing after imputation
    if "HH_MEAN_INC" in out.columns and "HH_MEDIAN_INC" in out.columns:
        out["INCOME_MISSING"] = (out["HH_MEAN_INC"] == 0) & (out["HH_MEDIAN_INC"] == 0)
    elif "HH_MEAN_INC" in out.columns:
        out["INCOME_MISSING"] = (out["HH_MEAN_INC"] == 0)
    elif "HH_MEDIAN_INC" in out.columns:
        out["INCOME_MISSING"] = (out["HH_MEDIAN_INC"] == 0)
    else:
        out["INCOME_MISSING"] = False

    return out


# ── QA helpers ────────────────────────────────────────────────────────────

def qa(df: gpd.GeoDataFrame, name: str):
    """
    Print VAP balance QA for a precinct GeoDataFrame.

    Parameters
    ----------
    df   : gpd.GeoDataFrame  Precinct GeoDataFrame to validate.
    name : str               Label to prefix printed output.
    """
    print("\n==", name, "==")
    print("rows:", len(df))

    for c in ["VAP", "HVAP", "NHVAP", "LATINO_VAP"]:
        if c in df.columns:
            print(c, "sum:", int(df[c].sum()))

    if all(c in df.columns for c in ["VAP", "HVAP", "NHVAP"]):
        print(
            "Check VAP == HVAP + NHVAP (sum):",
            int(df["VAP"].sum()),
            int((df["HVAP"] + df["NHVAP"]).sum()),
        )

    if all(c in df.columns for c in ["VAP", "LATINO_VAP", "NHVAP"]):
        print(
            "Check VAP == LATINO_VAP + NHVAP (sum):",
            int(df["VAP"].sum()),
            int((df["LATINO_VAP"] + df["NHVAP"]).sum()),
        )

    if "VAP" in df.columns:
        print("Any negative VAP?", bool((df["VAP"] < 0).any()))

    for c in ["NH_WHITE_ALONE_VAP", "NH_BLACK_ALONE_VAP", "NH_ASIAN_ALONE_VAP", "OTHER_VAP"]:
        if c in df.columns:
            mx = int(df[c].max())
            sm = int(df[c].sum())
            if "NHVAP" in df.columns:
                over = int((df[c] > df["NHVAP"]).sum())
                print(c, "max:", mx, "sum:", sm, "over NHVAP rows:", over)
            else:
                print(c, "max:", mx, "sum:", sm)


def qa_region(df: gpd.GeoDataFrame, name: str):
    """
    Print region_type QA for a precinct GeoDataFrame.

    Parameters
    ----------
    df   : gpd.GeoDataFrame  Precinct GeoDataFrame to validate.
    name : str               Label to prefix printed output.
    """
    print("\n==", name, "region_type QA ==")
    print("has region_type col?", "region_type" in df.columns)
    if "region_type" in df.columns:
        print(df["region_type"].value_counts(dropna=False))
        print("missing region_type:", int(df["region_type"].isna().sum()))
    if "PrimaryRUCA" in df.columns:
        print("missing PrimaryRUCA:", int(df["PrimaryRUCA"].isna().sum()))


def qa_income(df: gpd.GeoDataFrame, name: str):
    """
    Print income QA for a precinct GeoDataFrame.

    Parameters
    ----------
    df   : gpd.GeoDataFrame  Precinct GeoDataFrame to validate.
    name : str               Label to prefix printed output.
    """
    print("\n==", name, "income QA ==")
    for c in ["AVG_HH_INC", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_TOTAL"]:
        if c in df.columns:
            print(
                c,
                "min/max/sum_nonzero:",
                int(df[c].min()),
                int(df[c].max()),
                int((df[c] > 0).sum()),
            )
    if "AVG_HH_INC" in df.columns:
        print("Missing AVG_HH_INC:", int((df["AVG_HH_INC"] == 0).sum()))


# ── Script entry ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Step 0: Build enriched precinct GeoJSONs with VAP for AL and OR
    AL = build_precinct_geojson_with_vap(
        vap_csv_path="BASE_FILES/AL-VAP-population.csv",
        blocks_shp_path="BASE_FILES/AL-shapefile/tl_2025_01_tabblock20.shp",
        precincts_geojson_path="AL_data/AL-precincts-with-results-enacted.geojson",
        output_geojson_path="AL_data/AL_precincts_full.geojson",
        verbose=True,
    )

    OR = build_precinct_geojson_with_vap(
        vap_csv_path="BASE_FILES/OR-VAP-population.csv",
        blocks_shp_path="BASE_FILES/OR-shapefile/tl_2025_41_tabblock20.shp",
        precincts_geojson_path="OR_data/OR-precincts-with-results-enacted.geojson",
        output_geojson_path="OR_data/OR_precincts_full.geojson",
        verbose=True,
    )

    # Step 1: Add RUCA region_type for AL and OR
    AL2 = add_region_type_from_ruca(
        AL,
        tracts_path="BASE_FILES/AL_tract/tl_2025_01_tract.shp",
        ruca_csv_path="BASE_FILES/region-type.csv",
    )
    OR2 = add_region_type_from_ruca(
        OR,
        tracts_path="BASE_FILES/OR_tract/tl_2025_41_tract.shp",
        ruca_csv_path="BASE_FILES/region-type.csv",
    )

    # Step 2: Add ACS S1901 income fields for AL and OR
    AL3 = add_income_from_acs_s1901(
        AL2,
        tracts_path="BASE_FILES/AL_tract/tl_2025_01_tract.shp",
        income_csv_path="BASE_FILES/AL-income.csv",
        use_nearest_fallback=True,
    )
    OR3 = add_income_from_acs_s1901(
        OR2,
        tracts_path="BASE_FILES/OR_tract/tl_2025_41_tract.shp",
        income_csv_path="BASE_FILES/OR-income.csv",
        use_nearest_fallback=True,
    )

    # Step 3: Write final GeoJSONs
    AL3.to_file("AL_data/AL_precincts_full.geojson", driver="GeoJSON")
    OR3.to_file("OR_data/OR_precincts_full.geojson", driver="GeoJSON")

    # Step 4: Run QA checks
    qa(AL3, "AL")
    qa(OR3, "OR")

    qa_region(AL3, "AL3")
    qa_region(OR3, "OR3")

    qa_income(AL3, "AL3")
    qa_income(OR3, "OR3")

    # Step 5: Crude ballpark check on median income
    if "HH_MEDIAN_INC" in AL3.columns:
        print(AL3["HH_MEDIAN_INC"].replace(0, pd.NA).dropna().median())
    if "HH_MEDIAN_INC" in OR3.columns:
        print(OR3["HH_MEDIAN_INC"].replace(0, pd.NA).dropna().median())

    # Step 6: Report missing income rows
    if "HH_MEDIAN_INC" in AL3.columns and "GEOID" in AL3.columns:
        missing_al = AL3[AL3["INCOME_MISSING"]][["GEOID", "geometry"]]
        print("missing AL precincts:", len(missing_al))
    if "HH_MEDIAN_INC" in OR3.columns and "GEOID" in OR3.columns:
        missing_or = OR3[OR3["INCOME_MISSING"]][["GEOID", "geometry"]]
        print("missing OR precincts:", len(missing_or))

    print("AL imputed:", int(AL3["INCOME_IMPUTED"].sum()), "still missing:", int(AL3["INCOME_MISSING"].sum()))
    print("OR imputed:", int(OR3["INCOME_IMPUTED"].sum()), "still missing:", int(OR3["INCOME_MISSING"].sum()))
