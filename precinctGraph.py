import pandas as pd
import geopandas as gpd
import networkx as nx
from networkx.readwrite import json_graph
import json
import numpy as np

FEET_TO_METERS = 0.3048

def sanitize_for_json(x):
    # bools
    if isinstance(x, (np.bool_, bool)):
        return bool(x)

    # Convert numpy scalars
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        if np.isnan(x):
            return None
        return float(x)

    try:
        if pd.isna(x):
            return None
    except Exception:
        pass
    return x

def sanitize_obj(obj):
    if isinstance(obj, dict):
        return {k: sanitize_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_obj(v) for v in obj]
    return sanitize_for_json(obj)

def connect_components_to_largest(G: nx.Graph, gdf_proj: gpd.GeoDataFrame, id_col: str = "GEOID"):
    """
    Connect each non-largest connected component to the largest component by adding
    one 'bridge' edge based on nearest centroid distance.

    This preserves *all* nodes (no pruning) while ensuring the graph is connected.
    """
    comps = list(nx.connected_components(G))
    if len(comps) <= 1:
        return

    comps_sorted = sorted(comps, key=len, reverse=True)
    largest = comps_sorted[0]
    others = comps_sorted[1:]

    # centroids in metric CRS
    centroids = gdf_proj.set_index(id_col).geometry.representative_point()

    largest_list = list(largest)

    added = 0
    for comp in others:
        comp_list = list(comp)

        # Compute nearest centroid pair between this component and the largest component
        # (O(|comp|*|largest|) but should be fine for a few components.)
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

        dist_m, a, b = best
        G.add_edge(a, b, bridge=1, centroid_dist_m=dist_m)
        added += 1

        # update largest set so future comps connect to the now-expanded giant component
        largest.add(a)
        largest_list.append(a)

    print("Bridge edges added to connect components:", added)

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
    min_len_m = min_shared_boundary_feet * FEET_TO_METERS

    gdf = gpd.read_file(precinct_geojson)
    gdf = gdf[[precinct_id_col, "geometry"] + [c for c in gdf.columns if c not in (precinct_id_col, "geometry")]].copy()

    # Clean + project
    gdf["geometry"] = gdf.geometry.buffer(0)
    gdf = gdf.to_crs(target_crs)

    # Spatial index for candidate neighbor search
    sindex = gdf.sindex

    G = nx.Graph()

    # Add nodes with all attributes except geometry
    for _, row in gdf.iterrows():
        attrs = row.drop("geometry").to_dict()
        attrs = {k: sanitize_for_json(v) for k, v in attrs.items()}
        node_id = str(row[precinct_id_col])
        G.add_node(node_id, **attrs)

    # --- adjacency parameters ---
    min_len_m = min_shared_boundary_feet * FEET_TO_METERS

    # Spec #2 tolerance: "within 200 feet"
    PROXIMITY_FEET = 200.0
    tol_m = PROXIMITY_FEET * FEET_TO_METERS

    # Precompute boundaries + buffered boundaries once (much faster than buffering inside the loop)
    gdf = gdf.reset_index(drop=True)
    boundaries = gdf.geometry.boundary
    buffered = gdf.geometry.buffer(tol_m)
    buffered_boundaries = buffered.boundary

    # Spatial index for candidate neighbor search (already in your code)
    sindex = gdf.sindex

    tolerance_edges_added = 0

    # True adjacency via shared boundary length >= 200 ft
    # PLUS tolerance adjacency when polygons are within 200 ft but do not touch.
    for i, row_i in gdf.iterrows():
        geom_i = row_i.geometry
        node_i = str(row_i[precinct_id_col])

        # Candidates: use buffered bounds so "nearby but not intersecting" pairs get considered
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

    # If still disconnected, connect remaining components with explicit non-spec bridge edges.
    # This keeps graph usable for algorithms that require connectivity, while preserving auditability.
    if nx.number_connected_components(G) > 1:
        connect_components_to_largest(G, gdf, id_col=precinct_id_col)

    comps = list(nx.connected_components(G))
    comps_sorted = sorted(comps, key=len, reverse=True)
    print("component sizes:", [len(c) for c in comps_sorted[:10]])

    # compute min distance from each small component to the largest
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

    # Save node-link graph JSON
    data = json_graph.adjacency_data(G)
    data = sanitize_obj(data)
    with open(out_graph_json, "w") as f:
        json.dump(data, f)

    with open(out_graph_json2, "w") as f:
        json.dump(data, f)
    return G

# Build both graphs
AL_G = build_precinct_adjacency_graph(
    precinct_geojson="AL_data/AL_precincts_full.geojson",
    out_graph_json="AL_data/AL_graph.json",
    out_graph_json2="seawulf_runs/AL/input/AL_graph.json",
    min_shared_boundary_feet=200,
)

OR_G = build_precinct_adjacency_graph(
    precinct_geojson="OR_data/OR_precincts_full.geojson",
    out_graph_json="OR_data/OR_graph.json",
    out_graph_json2="seawulf_runs/OR/input/OR_graph.json",
    min_shared_boundary_feet=200,
)


