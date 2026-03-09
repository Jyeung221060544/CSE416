"""
mergingData.py
==============
Builds enriched precinct GeoJSON files by joining Census block-level VAP
(Voting Age Population) data, RUCA region classifications, and ACS S1901
household income data onto precinct polygons.

This version collapses race differently by state:

AL feasible groups:
  - WHITE_VAP  = NH White alone VAP
  - BLACK_VAP  = NH Black alone VAP
  - OTHER_VAP  = everyone else

OR feasible groups:
  - LATINO_VAP = Hispanic/Latino VAP
  - WHITE_VAP  = NH White alone VAP
  - OTHER_VAP  = everyone else

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


def _apply_feasible_race_collapse(prec_df: gpd.GeoDataFrame, state_code: str) -> gpd.GeoDataFrame:
    """
    Collapse race fields to feasible sets WITHOUT renaming columns,
    so downstream configs remain compatible.

    AL:
        keep NH_WHITE_ALONE_VAP
        keep NH_BLACK_ALONE_VAP
        OTHER_VAP = VAP - white - black

    OR:
        keep LATINO_VAP
        keep NH_WHITE_ALONE_VAP
        OTHER_VAP = VAP - latino - white
    """

    out = prec_df.copy()
    state_code = state_code.upper()

    for c in ["VAP", "LATINO_VAP", "NH_WHITE_ALONE_VAP", "NH_BLACK_ALONE_VAP"]:
        if c not in out.columns:
            out[c] = 0
        out[c] = pd.to_numeric(out[c], errors="coerce").fillna(0).astype(int)

    if state_code == "AL":
        # collapse everything except white + black
        out["OTHER_VAP"] = (
            out["VAP"]
            - out["NH_WHITE_ALONE_VAP"]
            - out["NH_BLACK_ALONE_VAP"]
        ).clip(lower=0).astype(int)

    elif state_code == "OR":
        # collapse everything except latino + white
        out["OTHER_VAP"] = (
            out["VAP"]
            - out["LATINO_VAP"]
            - out["NH_WHITE_ALONE_VAP"]
        ).clip(lower=0).astype(int)

    else:
        raise ValueError(f"Unsupported state_code {state_code}")

    return out


# ── Main: Build precinct geojson with VAP groups ──────────────────────────

def build_precinct_geojson_with_vap(
    vap_csv_path: str,
    blocks_shp_path: str,
    precincts_geojson_path: str,
    output_geojson_path: str,
    *,
    state_code: str,
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
    precinct GeoDataFrame, collapse race columns by state, and write output
    GeoJSON.

    Base demographic groups computed from P4:
      - LATINO_VAP          = Hispanic/Latino VAP (any race) = HVAP (P4_002N)
      - NH_WHITE_ALONE_VAP  = Not Hispanic, White alone
      - NH_BLACK_ALONE_VAP  = Not Hispanic, Black alone
      - NH_ASIAN_ALONE_VAP  = Not Hispanic, Asian alone

    Final state-specific output:
      AL:
        - VAP
        - WHITE_VAP
        - BLACK_VAP
        - OTHER_VAP

      OR:
        - VAP
        - LATINO_VAP
        - WHITE_VAP
        - OTHER_VAP

    Parameters
    ----------
    vap_csv_path           : Path to the Census P.L. 94-171 redistricting
                             CSV with block-level VAP data.
    blocks_shp_path        : Path to the Census TIGER block shapefile (.shp).
    precincts_geojson_path : Path to the input precinct GeoJSON (must already
                             have enacted_cd from assign_enacted_districts.py).
    output_geojson_path    : Destination path for the enriched precinct GeoJSON.
    state_code             : Two-letter state code ("AL" or "OR") controlling
                             feasible-race collapse.
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

    # Step A-1: Build 15-digit block GEOID from GEO_ID
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
        """
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

    # Step A-7: Compute base demographic groups at block level
    vap["LATINO_VAP"] = vap["P4_002N"] if "P4_002N" in vap.columns else 0
    vap["NH_WHITE_ALONE_VAP"] = _col_or_zero(vap, NH_WHITE_ALONE_COL)
    vap["NH_BLACK_ALONE_VAP"] = _col_or_zero(vap, NH_BLACK_ALONE_COL)
    vap["NH_ASIAN_ALONE_VAP"] = _col_or_zero(vap, NH_ASIAN_ALONE_COL)

    # Step A-8: Aggregation columns to carry through to blocks/precincts
    agg_cols = [
        "P4_001N",  # VAP
        "P4_002N",  # HVAP (= Latino any race)
        "P4_003N",  # NHVAP
        "LATINO_VAP",
        "NH_WHITE_ALONE_VAP",
        "NH_BLACK_ALONE_VAP",
        "NH_ASIAN_ALONE_VAP",
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
        print("Blocks missing merged VAP rows:", int(blocks2["GEOID_BLOCK"].isna().sum()))

    # ── Step D: Load precincts ────────────────────────────────────────────
    prec = gpd.read_file(precincts_geojson_path)

    # ── Step E: Block -> Precinct assignment ──────────────────────────────
    blocks_proj = blocks2.to_crs(target_crs)
    prec_proj = prec.to_crs(target_crs)

    # Step E-1: Attempt to clean geometries
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

    # Step E-4: Eliminate double counting
    joined = joined.sort_values(["GEOID_BLOCK", precinct_id_col]).drop_duplicates(subset=["GEOID_BLOCK"])

    # Step E-5: Fallback for unmatched blocks
    unmatched_idx = joined[joined[precinct_id_col].isna()].index

    if len(unmatched_idx):
        unmatched = joined.loc[unmatched_idx].drop(columns=["index_right"], errors="ignore")

        nearest = gpd.sjoin_nearest(
            unmatched.drop(columns=[precinct_id_col], errors="ignore"),
            prec_proj[[precinct_id_col, "geometry"]],
            how="left",
            distance_col="__dist",
        )

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
        prec2["HVAP"] = prec2["P4_002N"]
        prec2["LATINO_VAP"] = prec2["P4_002N"]
    if "P4_003N" in prec2.columns:
        prec2["NHVAP"] = prec2["P4_003N"]

    # Step F-3: Collapse to feasible race groups by state
    prec2 = _apply_feasible_race_collapse(prec2, state_code=state_code)

    # ── Step G: Create minimal precinct dataframe (preserve geometry) ─────
    keep_cols_out = [
        # identifiers
        "state", precinct_id_col, "official_boundary", "enacted_cd",

        # election results
        "votes_dem", "votes_rep", "votes_total", "pct_dem_lead",

        # demographics
        "VAP",
        "NH_WHITE_ALONE_VAP",
        "NH_BLACK_ALONE_VAP",     # AL only
        "LATINO_VAP",    # OR only
        "OTHER_VAP",

        # data
        "region_type",
        "AVG_HH_INC",
        "HH_MEDIAN_INC",
        "HH_MEAN_INC",
        "HH_TOTAL",

        # geometry
        "geometry",
    ]
    keep_cols_out = [c for c in keep_cols_out if c in prec2.columns]
    prec_clean = prec2[keep_cols_out].copy()

    # Step G-1: Ensure ints for numeric fields
    id_like = {"state", precinct_id_col, "official_boundary", "region_type", "geometry"}
    for c in prec_clean.columns:
        if c not in id_like:
            prec_clean[c] = pd.to_numeric(prec_clean[c], errors="coerce").fillna(0).astype(int)

    if verbose:
        print("Original columns:", len(prec2.columns))
        print("Cleaned columns:", len(prec_clean.columns))
        print("Cleaned column list:", list(prec_clean.columns))

        if state_code.upper() == "AL" and all(c in prec_clean.columns for c in ["VAP", "WHITE_VAP", "BLACK_VAP", "OTHER_VAP"]):
            print(
                "Check AL VAP == WHITE + BLACK + OTHER (sum):",
                int(prec_clean["VAP"].sum()),
                int((prec_clean["WHITE_VAP"] + prec_clean["BLACK_VAP"] + prec_clean["OTHER_VAP"]).sum()),
            )

        if state_code.upper() == "OR" and all(c in prec_clean.columns for c in ["VAP", "LATINO_VAP", "WHITE_VAP", "OTHER_VAP"]):
            print(
                "Check OR VAP == LATINO + WHITE + OTHER (sum):",
                int(prec_clean["VAP"].sum()),
                int((prec_clean["LATINO_VAP"] + prec_clean["WHITE_VAP"] + prec_clean["OTHER_VAP"]).sum()),
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
    """
    tracts = gpd.read_file(tracts_path)
    ruca = pd.read_csv(ruca_csv_path, dtype=str, encoding="latin1")

    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)
    ruca["TRACT_ID"] = ruca[ruca_tract_col].astype(str).str.strip().str.zfill(11)

    ruca_keep = ruca[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription"]].copy()
    ruca_keep["PrimaryRUCA"] = pd.to_numeric(ruca_keep["PrimaryRUCA"], errors="coerce")

    tracts2 = tracts.merge(ruca_keep, on="TRACT_ID", how="left")

    prec_proj = precincts_gdf.to_crs(target_crs).copy()
    tracts_proj = tracts2.to_crs(target_crs).copy()
    tracts_proj["geometry"] = tracts_proj["geometry"].buffer(0)
    prec_proj["geometry"] = prec_proj["geometry"].buffer(0)

    prec_pts = prec_proj[["geometry"]].copy()
    prec_pts["geometry"] = prec_pts.geometry.representative_point()

    joined = gpd.sjoin(
        prec_pts,
        tracts_proj[["TRACT_ID", "PrimaryRUCA", "PrimaryRUCADescription", "geometry"]],
        how="left",
        predicate="within",
    )

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
    keep_mean: bool = True,
    keep_moe: bool = True,
    use_nearest_fallback: bool = True,
    impute_missing_income: bool = True,
) -> gpd.GeoDataFrame:
    """
    Add tract-level ACS S1901 income fields onto precincts using a
    representative-point-in-tract join. Precincts whose joined income is
    missing/0 are optionally filled from the nearest tract with non-missing
    income.
    """

    tracts = gpd.read_file(tracts_path).copy()
    tracts["TRACT_ID"] = tracts[tract_geoid_col].astype(str).str.strip().str.zfill(11)

    inc_raw = pd.read_csv(income_csv_path, dtype=str, skiprows=[1])

    inc_raw["TRACT_ID"] = (
        inc_raw["GEO_ID"]
        .astype(str)
        .str.replace("1400000US", "", regex=False)
        .str.strip()
        .str.zfill(11)
    )

    cols = ["TRACT_ID", "S1901_C01_001E", "S1901_C01_012E"]
    if keep_mean:
        cols.append("S1901_C01_013E")
    if keep_moe:
        cols += ["S1901_C01_012M"] + (["S1901_C01_013M"] if keep_mean else [])
    cols = [c for c in cols if c in inc_raw.columns]
    inc = inc_raw[cols].copy()

    def to_num(series: pd.Series) -> pd.Series:
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

    tracts2 = tracts.merge(inc, on="TRACT_ID", how="left")
    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in tracts2.columns:
            tracts2[c] = pd.to_numeric(tracts2[c], errors="coerce").fillna(0).astype(int)

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
            nearest = nearest[~nearest.index.duplicated(keep="first")].reindex(unmatched_idx)
            for c in attrs:
                if c in nearest.columns:
                    joined.loc[unmatched_idx, c] = nearest[c].values

    out = precincts_gdf.copy()
    for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
        if c in joined.columns:
            out[c] = pd.to_numeric(joined[c], errors="coerce").fillna(0).astype(int)

    out["INCOME_IMPUTED"] = False

    if impute_missing_income and ("HH_MEDIAN_INC" in out.columns or "HH_MEAN_INC" in out.columns):
        prec_pts2 = prec_proj[["geometry"]].copy()
        prec_pts2["geometry"] = prec_pts2.geometry.representative_point()

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
            tracts_good = tracts_proj.copy()
            good_mask = pd.Series(False, index=tracts_good.index)
            if "HH_MEAN_INC" in tracts_good.columns:
                good_mask = good_mask | (tracts_good["HH_MEAN_INC"] > 0)
            if "HH_MEDIAN_INC" in tracts_good.columns:
                good_mask = good_mask | (tracts_good["HH_MEDIAN_INC"] > 0)
            tracts_good = tracts_good.loc[good_mask]

            if len(tracts_good):
                miss_pts = prec_pts2.loc[missing_idx].copy()
                nearest_good = gpd.sjoin_nearest(
                    miss_pts,
                    tracts_good[attrs + ["geometry"]],
                    how="left",
                    distance_col="__dist",
                )
                nearest_good = nearest_good[~nearest_good.index.duplicated(keep="first")].reindex(missing_idx)

                for c in ["HH_TOTAL", "HH_MEDIAN_INC", "HH_MEAN_INC", "HH_MEDIAN_INC_MOE", "HH_MEAN_INC_MOE"]:
                    if c in out.columns and c in nearest_good.columns:
                        out.loc[missing_idx, c] = pd.to_numeric(nearest_good[c], errors="coerce").fillna(0).astype(int).values

                out.loc[missing_idx, "INCOME_IMPUTED"] = True

    if "HH_MEAN_INC" in out.columns and "HH_MEDIAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEAN_INC"].where(out["HH_MEAN_INC"] > 0, out["HH_MEDIAN_INC"]).astype(int)
    elif "HH_MEAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEAN_INC"].astype(int)
    elif "HH_MEDIAN_INC" in out.columns:
        out["AVG_HH_INC"] = out["HH_MEDIAN_INC"].astype(int)

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
    Print race/VAP QA for a precinct GeoDataFrame.
    """
    print("\n==", name, "==")
    print("rows:", len(df))

    for c in ["VAP", "WHITE_VAP", "BLACK_VAP", "LATINO_VAP", "OTHER_VAP"]:
        if c in df.columns:
            print(c, "sum:", int(df[c].sum()))

    if all(c in df.columns for c in ["VAP", "WHITE_VAP", "BLACK_VAP", "OTHER_VAP"]):
        print(
            "Check VAP == WHITE + BLACK + OTHER (sum):",
            int(df["VAP"].sum()),
            int((df["WHITE_VAP"] + df["BLACK_VAP"] + df["OTHER_VAP"]).sum()),
        )

    if all(c in df.columns for c in ["VAP", "LATINO_VAP", "WHITE_VAP", "OTHER_VAP"]):
        print(
            "Check VAP == LATINO + WHITE + OTHER (sum):",
            int(df["VAP"].sum()),
            int((df["LATINO_VAP"] + df["WHITE_VAP"] + df["OTHER_VAP"]).sum()),
        )

    if "VAP" in df.columns:
        print("Any negative VAP?", bool((df["VAP"] < 0).any()))


def qa_region(df: gpd.GeoDataFrame, name: str):
    """
    Print region_type QA for a precinct GeoDataFrame.
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
    # Step 0: Build enriched precinct GeoJSONs with collapsed feasible-race VAP
    AL = build_precinct_geojson_with_vap(
        vap_csv_path="BASE_FILES/AL-VAP-population.csv",
        blocks_shp_path="BASE_FILES/AL-shapefile/tl_2025_01_tabblock20.shp",
        precincts_geojson_path="AL_data/AL-precincts-with-results-enacted.geojson",
        output_geojson_path="AL_data/AL_precincts_full.geojson",
        state_code="AL",
        verbose=True,
    )

    OR = build_precinct_geojson_with_vap(
        vap_csv_path="BASE_FILES/OR-VAP-population.csv",
        blocks_shp_path="BASE_FILES/OR-shapefile/tl_2025_41_tabblock20.shp",
        precincts_geojson_path="OR_data/OR-precincts-with-results-enacted.geojson",
        output_geojson_path="OR_data/OR_precincts_full.geojson",
        state_code="OR",
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