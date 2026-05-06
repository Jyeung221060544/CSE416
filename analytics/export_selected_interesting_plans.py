import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union
from shapely.geometry import Polygon, MultiPolygon, GeometryCollection

JOBS = [
    {
        "name": "AL_zero_effective_raceblind",
        "generated": (
            "frontend/src/assets/interesting_plans"
            "/AL_zero_effective_raceblind_districts.json"
        ),
        "enacted": "frontend/src/assets/ALCongressionalDistricts.json",
        "out": (
            "frontend/src/assets/interesting_plans"
            "/AL_zero_effective_raceblind_visual.json"
        ),
    },
    {
        "name": "OR_extra_democratic_vra",
        "generated": (
            "frontend/src/assets/interesting_plans"
            "/OR_extra_democratic_vra_districts.json"
        ),
        "enacted": "frontend/src/assets/ORCongressionalDistrict.json",
        "out": (
            "frontend/src/assets/interesting_plans"
            "/OR_extra_democratic_vra_visual.json"
        ),
    },
    {
        "name": "OR_zero_effective_raceblind",
        "generated": (
            "frontend/src/assets/interesting_plans"
            "/OR_zero_effective_raceblind_districts.json"
        ),
        "enacted": "frontend/src/assets/ORCongressionalDistrict.json",
        "out": (
            "frontend/src/assets/interesting_plans"
            "/OR_zero_effective_raceblind_visual.json"
        ),
    },
]

def remove_skinny_slivers(geom, min_area=5_000_000, min_width=10_000):
    """
    Remove very thin polygon slivers.

    Units are meters because script uses EPSG:5070.
    min_area=5,000,000  -> about 5 sq km
    min_width=10,000    -> about 10 km
    """
    if geom is None or geom.is_empty:
        return geom

    geom = geom.buffer(0)

    if geom.geom_type == "Polygon":
        minx, miny, maxx, maxy = geom.bounds
        width = min(maxx - minx, maxy - miny)

        if geom.area < min_area or width < min_width:
            return Polygon()

        return geom

    if geom.geom_type == "MultiPolygon":
        kept = []

        for p in geom.geoms:
            minx, miny, maxx, maxy = p.bounds
            width = min(maxx - minx, maxy - miny)

            if p.area >= min_area and width >= min_width:
                kept.append(p)

        if not kept:
            return Polygon()

        if len(kept) == 1:
            return kept[0]

        return MultiPolygon(kept)

    return geom

def polygon_only(geom):
    if geom is None or geom.is_empty:
        return geom

    if geom.geom_type in ["Polygon", "MultiPolygon"]:
        return geom

    if geom.geom_type == "GeometryCollection":
        polys = [
            g for g in geom.geoms
            if g.geom_type in ["Polygon", "MultiPolygon"] and not g.is_empty
        ]

        if not polys:
            return Polygon()

        merged = unary_union(polys)
        return merged.buffer(0)

    return Polygon()

def keep_large_parts_only(geom, min_ratio=0.08):
    if geom is None or geom.is_empty:
        return geom

    geom = geom.buffer(0)

    if geom.geom_type == "Polygon":
        return geom

    if geom.geom_type == "MultiPolygon":
        parts = list(geom.geoms)
        largest_area = max(p.area for p in parts)

        kept = [
            p for p in parts
            if p.area >= largest_area * min_ratio
        ]

        if len(kept) == 1:
            return kept[0]

        return MultiPolygon(kept)

    return geom

def clean_geom(g):
    return g.buffer(0)


def fill_holes(geom):
    """Remove all interior holes from polygon geometries."""
    if geom is None or geom.is_empty:
        return geom
    if geom.geom_type == "Polygon":
        return Polygon(geom.exterior)
    if geom.geom_type == "MultiPolygon":
        return MultiPolygon([Polygon(p.exterior) for p in geom.geoms])
    return geom

def assign_gaps(gen, state_outline):
    """Fill any gaps between gen districts and the state outline by merging each
    gap into the district that shares the longest boundary with it."""
    coverage = unary_union(gen.geometry).buffer(0)
    missing = state_outline.difference(coverage).buffer(0)
    if missing.is_empty:
        return gen

    parts = (
        list(missing.geoms) if missing.geom_type == "MultiPolygon" else [missing]
    )
    for gap in parts:
        if gap.is_empty:
            continue
        best_idx, best_score = None, -1
        for idx, row in gen.iterrows():
            shared = row.geometry.boundary.intersection(gap.boundary).length
            score = (
                shared if shared > 0
                else 1 / (row.geometry.distance(gap) + 1e-9)
            )
            if score > best_score:
                best_score = score
                best_idx = idx
        if best_idx is not None:
            gen.at[best_idx, "geometry"] = (
                gen.at[best_idx, "geometry"].union(gap).buffer(0)
            )
    return gen

def reassign_non_contiguous(gen):
    """On raw (pre-simplification) data, districts that touch share actual
    boundary segments, so union-ing a dropped piece with its neighbour produces
    a clean single Polygon.  For each MultiPolygon district keep the largest
    piece and give the remaining pieces to whichever other district shares the
    longest boundary with them."""
    orphans = []
    for idx, row in gen.iterrows():
        g = row.geometry.buffer(0)
        if g.geom_type != "MultiPolygon":
            continue
        parts = list(g.geoms)
        largest = max(parts, key=lambda p: p.area)
        gen.at[idx, "geometry"] = largest.buffer(0)
        orphans.extend(p for p in parts if p is not largest)

    for piece in orphans:
        best_idx, best_score = None, -1
        for idx, row in gen.iterrows():
            shared = row.geometry.boundary.intersection(piece.boundary).length
            score = (
                shared if shared > 0
                else 1 / (row.geometry.distance(piece) + 1e-9)
            )
            if score > best_score:
                best_score = score
                best_idx = idx
        if best_idx is not None:
            gen.at[best_idx, "geometry"] = (
                gen.at[best_idx, "geometry"].union(piece).buffer(0)
            )
    return gen


def make_visual_plan(gen_path, enacted_path, out_path):
    print(f"\nProcessing {gen_path}")

    gen = gpd.read_file(gen_path)
    enacted = gpd.read_file(enacted_path)

    gen = gen.to_crs(epsg=5070)
    enacted = enacted.to_crs(epsg=5070)

    gen["geometry"] = gen.geometry.apply(clean_geom)
    enacted["geometry"] = enacted.geometry.apply(clean_geom)

    state_outline = unary_union(enacted.geometry).buffer(0)

    # Resolve non-contiguous districts on raw data BEFORE any simplification.
    # At full resolution the districts genuinely touch their neighbours, so the
    # union of a dropped piece with the closest district yields a single Polygon.
    gen = reassign_non_contiguous(gen)

    gen["geometry"] = gen.geometry.intersection(state_outline).buffer(0)

    # Gap-fill: cover any area the generated plan missed entirely
    gen = assign_gaps(gen, state_outline)

    gen["geometry"] = (
        gen.geometry
        .apply(polygon_only)
        .buffer(0)
        .apply(lambda g: remove_skinny_slivers(
            g, min_area=10_000_000, min_width=10_000
        ))
        .apply(lambda g: keep_large_parts_only(g, min_ratio=0.01))
        .apply(polygon_only)
        .buffer(0)
        # Morphological opening: erode thin protrusions then restore bulk shape
        .apply(lambda g: g.buffer(-500).buffer(600) if not g.is_empty else g)
        .buffer(0)
        # Remove all interior holes created by intersection/union operations
        .apply(fill_holes)
        .buffer(0)
        # Drop tiny satellite pieces (< 5% of largest part)
        .apply(lambda g: keep_large_parts_only(g, min_ratio=0.05))
        # Force single polygon – keep only the dominant piece
        .apply(lambda g: (
            max(g.geoms, key=lambda p: p.area)
            if g.geom_type == "MultiPolygon" else g
        ))
        # Simplify to reduce file size (~500 m tolerance in EPSG:5070)
        .apply(lambda g: g.simplify(500, preserve_topology=True))
        .buffer(0)
    )

    gen = gen.to_crs(epsg=4326)

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    gen.to_file(out_path, driver="GeoJSON")

    n_pts = sum(
        len(list(g.exterior.coords)) if g.geom_type == "Polygon"
        else sum(len(list(p.exterior.coords)) for p in g.geoms)
        for g in gen.geometry if g and not g.is_empty
    )
    import os
    print(
        f"  Wrote {out_path}"
        f" ({os.path.getsize(out_path)//1024}KB, ~{n_pts} exterior pts)"
    )


def main():
    for job in JOBS:
        make_visual_plan(
            job["generated"],
            job["enacted"],
            job["out"],
        )


if __name__ == "__main__":
    main()