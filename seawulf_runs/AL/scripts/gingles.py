import json
from pathlib import Path

import geopandas as gpd
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
INFILE = ROOT / "AL_data" / "AL_precincts_full.geojson"
OUTDIR = ROOT / "AL_data"

DEM_COL = "votes_dem"
REP_COL = "votes_rep"
TOTAL_COL = "VAP"
ID_COL = "GEOID"

# Add/remove groups here as needed.
GROUP_SPECS = [
    {
        "group_name": "Black",
        "group_col": "NH_BLACK_ALONE_VAP",
        "outfile": OUTDIR / "AL_gingles_Black_precinct_table.json",
    },
    {
        "group_name": "White",
        "group_col": "NH_WHITE_ALONE_VAP",
        "outfile": OUTDIR / "AL_gingles_White_precinct_table.json",
    },

]


def build_payload(gdf: gpd.GeoDataFrame, group_name: str, group_col: str) -> dict:
    total = gdf[TOTAL_COL].to_numpy(dtype=float)
    group = gdf[group_col].to_numpy(dtype=float)
    dem = gdf[DEM_COL].to_numpy(dtype=float)
    rep = gdf[REP_COL].to_numpy(dtype=float)
    two_party = dem + rep

    # Keep only sensible rows
    mask = (total > 0) & (two_party > 0) & (group >= 0) & (group <= total)
    gdf2 = gdf.loc[mask].copy()

    total = gdf2[TOTAL_COL].to_numpy(dtype=float)
    group = gdf2[group_col].to_numpy(dtype=float)
    dem = gdf2[DEM_COL].to_numpy(dtype=float)
    rep = gdf2[REP_COL].to_numpy(dtype=float)
    two_party = dem + rep

    group_pct = np.clip(group / total, 0, 1)
    dem_share = np.clip(dem / two_party, 0, 1)
    rep_share = np.clip(rep / two_party, 0, 1)
    winner = np.where(dem > rep, "D", "R")

    rows = []
    for i, row in enumerate(gdf2.itertuples(index=False)):
        rows.append(
            {
                "state": "AL",
                "group": group_name,
                "precinct_id": getattr(row, ID_COL),
                "vap": int(getattr(row, TOTAL_COL)),
                "group_pop": int(getattr(row, group_col)),
                "group_pct": float(group_pct[i]),
                "votes_dem": int(getattr(row, DEM_COL)),
                "votes_rep": int(getattr(row, REP_COL)),
                "dem_share": float(dem_share[i]),
                "rep_share": float(rep_share[i]),
                "winner": str(winner[i]),
            }
        )

    return {
        "state": "AL",
        "group": group_name,
        "n_precincts_used": int(len(rows)),
        "columns": list(rows[0].keys()) if rows else [],
        "rows": rows,
    }


def main():
    gdf = gpd.read_file(INFILE)

    OUTDIR.mkdir(parents=True, exist_ok=True)

    for spec in GROUP_SPECS:
        payload = build_payload(
            gdf=gdf,
            group_name=spec["group_name"],
            group_col=spec["group_col"],
        )

        spec["outfile"].write_text(json.dumps(payload, indent=2))
        print(f"Wrote: {spec['outfile']}  n={payload['n_precincts_used']}")


if __name__ == "__main__":
    main()