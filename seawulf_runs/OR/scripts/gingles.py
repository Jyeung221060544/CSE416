import json
from pathlib import Path
import geopandas as gpd
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
INFILE = ROOT / "OR_data" / "OR_precincts_full.geojson"
OUTFILE = ROOT / "OR_data" / "OR_gingles_White_precinct_table.json"     # OR_gingles_Latino_precinct_table.json and OR_gingles_White_precinct_table.json

# feasible group White and Latino
# Black: 60012
# Latino: 389394
# White: 2526275
# Asian: 156707
# Other: 238264

GROUP_NAME = "White"                    # Run for White and Latino
GROUP_COL  = "NH_WHITE_ALONE_VAP"       # Run for NH_WHITE_ALONE_VAP and LATINO_VAP
TOTAL_COL  = "VAP"
DEM_COL    = "votes_dem"
REP_COL    = "votes_rep"
ID_COL     = "GEOID"

def main():
    gdf = gpd.read_file(INFILE)

    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[GROUP_COL].to_numpy(dtype=float)
    dem   = gdf[DEM_COL].to_numpy(dtype=float)
    rep   = gdf[REP_COL].to_numpy(dtype=float)
    two_party = dem + rep

    # keep only sensible rows
    mask = (total > 0) & (two_party > 0) & (group >= 0) & (group <= total)
    gdf = gdf.loc[mask].copy()

    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[GROUP_COL].to_numpy(dtype=float)
    dem   = gdf[DEM_COL].to_numpy(dtype=float)
    rep   = gdf[REP_COL].to_numpy(dtype=float)
    two_party = dem + rep

    group_pct = (group / total).clip(0, 1)
    dem_share = (dem / two_party).clip(0, 1)
    rep_share = (rep / two_party).clip(0, 1)
    winner = np.where(dem > rep, "D", "R")

    rows = []
    for i, row in enumerate(gdf.itertuples(index=False)):
        rows.append({
            "state": "OR",
            "group": GROUP_NAME,
            "precinct_id": getattr(row, ID_COL),
            "vap": int(getattr(row, TOTAL_COL)),
            "group_pop": int(getattr(row, GROUP_COL)),
            "group_pct": float(group_pct[i]),
            "votes_dem": int(getattr(row, DEM_COL)),
            "votes_rep": int(getattr(row, REP_COL)),
            "dem_share": float(dem_share[i]),
            "rep_share": float(rep_share[i]),
            "winner": str(winner[i]),
        })

    payload = {
        "state": "OR",
        "group": GROUP_NAME,
        "n_precincts_used": int(len(rows)),
        "columns": list(rows[0].keys()) if rows else [],
        "rows": rows
    }

    OUTFILE.parent.mkdir(parents=True, exist_ok=True)
    OUTFILE.write_text(json.dumps(payload, indent=2))
    print("Wrote:", OUTFILE, "n=", payload["n_precincts_used"])

if __name__ == "__main__":
    main()

# import geopandas as gpd
# from pathlib import Path

# ROOT = Path(__file__).resolve().parents[3]
# INFILE = ROOT / "OR_data/OR_precincts_full.geojson"
# gdf = gpd.read_file(INFILE)

# print("Black:", gdf["NH_BLACK_ALONE_VAP"].sum())
# print("Latino:", gdf["LATINO_VAP"].sum())
# print("White:", gdf["NH_WHITE_ALONE_VAP"].sum())
# print("Asian:", gdf["NH_ASIAN_ALONE_VAP"].sum())
# print("Other:", gdf["OTHER_VAP"].sum())