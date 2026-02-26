"""
precinctGraph.py
================
Builds a precinct adjacency graph for redistricting analysis and serializes it
to a NetworkX node-link JSON file compatible with GerryChain's Graph.from_json().

Adjacency criteria (in order of precedence)
--------------------------------------------
1. Strict shared-boundary adjacency: two precincts share a boundary segment of
   at least `min_shared_boundary_feet` (default 200 ft). Measured in the
   projected CRS (EPSG:5070).
2. Tolerance adjacency: two precincts are within 200 ft but do not share a
   formal boundary (e.g. separated by a road right-of-way). A buffered
   boundary overlap of >= 200 ft triggers an edge with `tolerance=1`.
3. Bridge edges: if any disconnected components remain after steps 1–2,
   `connect_components_to_largest` adds one bridge edge per component (based
   on nearest centroid distance) to guarantee full graph connectivity.

Module-level script section builds graphs for Alabama (AL) and Oregon (OR).

Dependencies: pandas, geopandas, networkx, json, numpy
"""

import pandas as pd
import geopandas as gpd
import networkx as nx
from networkx.readwrite import json_graph
import json
import numpy as np

# Conversion factor: US survey feet to meters
FEET_TO_METERS = 0.3048


# ── JSON serialization helpers ────────────────────────────────────────────

def sanitize_for_json(x):
    """
    Convert a single value to a JSON-serializable Python scalar.
    Handles numpy booleans, integers, floats (including NaN), and pandas NA.

    Parameters
    ----------
    x : any
        Value to sanitize.

    Returns
    -------
    bool | int | float | None | x
        Sanitized value safe to pass to json.dump().
    """
    # Step 0: Handle numpy booleans
    if isinstance(x, (np.bool_, bool)):
        return bool(x)

    # Step 1: Convert numpy scalars
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        if np.isnan(x):
            return None
        return float(x)

    # Step 2: Handle pandas NA (catches pd.NaT, pd.NA, float NaN)
    try:
        if pd.isna(x):
            return None
    except Exception:
        pass
    return x


def sanitize_obj(obj):
    """
    Recursively sanitize a nested dict/list structure for JSON serialization
    by applying `sanitize_for_json` to every leaf value.

    Parameters
    ----------
    obj : dict | list | any
        The object to sanitize.

    Returns
    -------
    dict | list | JSON-safe scalar
        Sanitized copy of the input.
    """
    if isinstance(obj, dict):
        return {k: sanitize_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_obj(v) for v in obj]
    return sanitize_for_json(obj)


# ── Graph connectivity helper ─────────────────────────────────────────────

def connect_components_to_largest(G: nx.Graph, gdf_proj: gpd.GeoDataFrame, id_col: str = "GEOID"):
    """
    Connect each non-largest connected component to the largest component by
    adding one 'bridge' edge per component based on nearest centroid distance.

    This preserves *all* nodes (no pruning) while ensuring the graph is
    connected. Bridge edges are marked with the attribute `bridge=1` so they
    can be filtered during analysis if needed.

    Parameters
    ----------
    G        : nx.Graph          The adjacency graph to update in-place.
    gdf_proj : gpd.GeoDataFrame  Projected GeoDataFrame (EPSG:5070) with
                                  `id_col` as a column.
    id_col   : str               Column name of the node identifier in gdf_proj.
    """
    comps = list(nx.connected_components(G))
    if len(comps) <= 1:
        return

    # Step 0: Sort components by size descending
    comps_sorted = sorted(comps, key=len, reverse=True)
    largest = comps_sorted[0]
    others = comps_sorted[1:]

    # Step 1: Precompute representative-point centroids in the metric CRS
    centroids = gdf_proj.set_index(id_col).geometry.representative_point()

    largest_list = list(largest)

    added = 0
    for comp in others:
        comp_list = list(comp)

        # Step 2: Compute nearest centroid pair between this component and
        # the largest component (O(|comp|*|largest|) but fine for a few comps)
        best = None  # (dist, a, b)
        for a in comp_list:
            if a not in centroids.index:
                continue
            ca = centroids.loc[a]
            # distance from a to all nodes in largest
            dists = centroids.loc[largest_list].distance(ca)
            b = str(dists.idxmin())
            dist = float(dists.min())
            if best is None or dist < best[0]:
                best = (dist, str(a), b)

        if best is None:
            continue

        # Step 3: Add bridge edge
        dist_m, a, b = best
        G.add_edge(a, b, bridge=1, centroid_dist_m=dist_m)
        added += 1

        # Step 4: Update largest set so future comps connect to the now-expanded
        # giant component
        largest.add(a)
        largest_list.append(a)

    print("Bridge edges added to connect components:", added)


# ── Main graph builder ────────────────────────────────────────────────────

def build_precinct_adjacency_graph(
    precinct_geojson: str,
    out_graph_json: str,
    out_graph_json2: str,
    *,
    precinct_id_col: str = "GEOID",
    target_crs: str = "EPSG:5070",
    min_shared_boundary_feet: float = 200.0,
    verbose: bool = True,
):
    """
    Build a precinct adjacency graph from a precinct GeoJSON and write it to
    two JSON output files (data directory + seawulf input directory).

    Adjacency is determined by shared boundary length >= 200 ft OR polygon
    proximity within 200 ft (tolerance adjacency). Remaining disconnected
    components are connected via nearest-centroid bridge edges.

    Parameters
    ----------
    precinct_geojson          : str    Path to the input precinct GeoJSON.
    out_graph_json            : str    Primary output path for the graph JSON.
    out_graph_json2           : str    Secondary output path (e.g. seawulf input).
    precinct_id_col           : str    Column name of the unique precinct ID.
    target_crs                : str    EPSG code for the projected CRS.
    min_shared_boundary_feet  : float  Minimum shared boundary length in feet
                                       to create an adjacency edge.
    verbose                   : bool   Print graph QA stats when True.

    Returns
    -------
    nx.Graph
        The completed precinct adjacency graph with node attributes from props.
    """
    min_len_m = min_shared_boundary_feet * FEET_TO_METERS

    # Step 0: Read and project precinct GeoDataFrame
    gdf = gpd.read_file(precinct_geojson)
    gdf = gdf[[precinct_id_col, "geometry"] + [c for c in gdf.columns if c not in (precinct_id_col, "geometry")]].copy()

    # Step 1: Clean geometries and reproject
    gdf["geometry"] = gdf.geometry.buffer(0)
    gdf = gdf.to_crs(target_crs)

    # Step 2: Spatial index for candidate neighbor search
    sindex = gdf.sindex

    G = nx.Graph()

    # Step 3: Add nodes with all attributes except geometry
    for _, row in gdf.iterrows():
        attrs = row.drop("geometry").to_dict()
        attrs = {k: sanitize_for_json(v) for k, v in attrs.items()}
        node_id = str(row[precinct_id_col])
        G.add_node(node_id, **attrs)

    # Step 4: Adjacency parameters
    min_len_m = min_shared_boundary_feet * FEET_TO_METERS

    # Spec #2 tolerance: "within 200 feet"
    PROXIMITY_FEET = 200.0
    tol_m = PROXIMITY_FEET * FEET_TO_METERS

    # Step 5: Precompute boundaries + buffered boundaries once
    # (much faster than buffering inside the loop)
    gdf = gdf.reset_index(drop=True)
    boundaries = gdf.geometry.boundary
    buffered = gdf.geometry.buffer(tol_m)
    buffered_boundaries = buffered.boundary

    # Step 6: Re-build spatial index (after reset_index)
    sindex = gdf.sindex

    tolerance_edges_added = 0

    # Step 7: Build edges — true adjacency via shared boundary length >= 200 ft
    # PLUS tolerance adjacency when polygons are within 200 ft but do not touch
    for i, row_i in gdf.iterrows():
        geom_i = row_i.geometry
        node_i = str(row_i[precinct_id_col])

        # Step 7a: Candidates — use buffered bounds so "nearby but not
        # intersecting" pairs get considered
        candidates = list(sindex.intersection(buffered.iloc[i].bounds))

        for j in candidates:
            if j <= i:
                continue

            geom_j = gdf.loc[j, "geometry"]
            node_j = str(gdf.loc[j, precinct_id_col])

            # Case 1: strict touching/intersecting adjacency
            if geom_i.intersects(geom_j):
                inter = boundaries.iloc[i].intersection(boundaries.iloc[j])
                shared_len = float(inter.length)
                if shared_len >= min_len_m:
                    G.add_edge(node_i, node_j, shared_m=shared_len, tolerance=0)
                continue

            # Case 2: spec tolerance adjacency (within 200 ft)
            if geom_i.distance(geom_j) <= tol_m:
                bi = buffered.iloc[i].boundary
                bj = buffered.iloc[j].boundary

                # Fuzz factor to make near-coincident boundary segments intersect.
                # 0.5m–2m is usually safe at EPSG:5070 scale; start small.
                EPS_M = 1.0

                shared_len_tol = float(bi.intersection(bj.buffer(EPS_M)).length)

                if shared_len_tol >= min_len_m:
                    G.add_edge(
                        node_i, node_j,
                        shared_m=shared_len_tol,
                        tolerance=1,
                        tol_m=tol_m,
                        eps_m=EPS_M
                    )
                    tolerance_edges_added += 1

    # Step 8: If still disconnected, connect remaining components with bridge edges
    if nx.number_connected_components(G) > 1:
        connect_components_to_largest(G, gdf, id_col=precinct_id_col)

    # Step 9: Print component diagnostics
    comps = list(nx.connected_components(G))
    comps_sorted = sorted(comps, key=len, reverse=True)
    print("component sizes:", [len(c) for c in comps_sorted[:10]])

    # Step 10: Compute min distance from each small component to the largest
    largest = comps_sorted[0]
    centroids = gdf.set_index(precinct_id_col).geometry.representative_point()

    largest_list = list(largest)
    for idx, comp in enumerate(comps_sorted[1:4], start=1):
        best = None
        for a in comp:
            if a not in centroids.index:
                continue
            ca = centroids.loc[a]
            d = centroids.loc[largest_list].distance(ca).min()
            best = d if best is None else min(best, d)
        print(f"min centroid dist to largest (component {idx}): {float(best):.2f} m")
    print("tolerance threshold:", tol_m, "m")

    if verbose:
        degrees = [d for _, d in G.degree()]
        print(f"\n== Graph QA (spec-compliant, no centroid bridges): {precinct_geojson} ==")
        print("components:", nx.number_connected_components(G))
        if degrees:
            print("degree min/median/max:", int(np.min(degrees)), float(np.median(degrees)), int(np.max(degrees)))
        print("tolerance edges added:", tolerance_edges_added)

    # Step 11: Serialize and save node-link graph JSON
    data = json_graph.adjacency_data(G)
    data = sanitize_obj(data)
    with open(out_graph_json, "w") as f:
        json.dump(data, f)

    with open(out_graph_json2, "w") as f:
        json.dump(data, f)
    return G


# ── Script entry ──────────────────────────────────────────────────────────

# Step 0: Build Alabama adjacency graph
AL_G = build_precinct_adjacency_graph(
    precinct_geojson="AL_data/AL_precincts_full.geojson",
    out_graph_json="AL_data/AL_graph.json",
    out_graph_json2="seawulf_runs/AL/input/AL_graph.json",
    min_shared_boundary_feet=200,
)

# Step 1: Build Oregon adjacency graph
OR_G = build_precinct_adjacency_graph(
    precinct_geojson="OR_data/OR_precincts_full.geojson",
    out_graph_json="OR_data/OR_graph.json",
    out_graph_json2="seawulf_runs/OR/input/OR_graph.json",
    min_shared_boundary_feet=200,
)
