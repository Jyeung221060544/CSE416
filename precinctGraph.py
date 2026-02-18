import geopandas as gpd
import networkx as nx
from networkx.readwrite import json_graph
import json
import numpy as np

FEET_TO_METERS = 0.3048

def keep_largest_component(G: nx.Graph):
    comps = list(nx.connected_components(G))
    comps_sorted = sorted(comps, key=len, reverse=True)
    largest = comps_sorted[0]
    G2 = G.subgraph(largest).copy()
    return G2, [len(c) for c in comps_sorted]

def connect_isolated_by_nearest_centroid(G: nx.Graph, gdf_proj: gpd.GeoDataFrame, id_col: str = "GEOID"):
    # gdf_proj must be in a metric CRS (EPSG:5070)
    centroids = gdf_proj.set_index(id_col).geometry.centroid

    isolated = [n for n, d in G.degree() if d == 0]
    if not isolated:
        return

    for n in isolated:
        if n not in centroids.index:
            continue
        c = centroids.loc[n]

        # find nearest other centroid
        others = centroids.drop(index=n, errors="ignore")
        dists = others.distance(c)
        nearest_id = str(dists.idxmin())
        nearest_dist_m = float(dists.min())

        # add a single fallback edge
        G.add_edge(str(n), str(nearest_id), fallback=1, centroid_dist_m=nearest_dist_m)

    print("Fallback edges added for isolates:", len(isolated))

def build_precinct_adjacency_graph(
    precinct_geojson: str,
    out_graph_json: str,
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

    # Add nodes with ALL attributes except geometry
    for _, row in gdf.iterrows():
        attrs = row.drop("geometry").to_dict()
        node_id = str(row[precinct_id_col])
        G.add_node(node_id, **attrs)

    # Build edges using shared boundary length
    for i, row_i in gdf.iterrows():
        geom_i = row_i.geometry
        node_i = str(row_i[precinct_id_col])

        # candidates via bbox intersection
        candidates = list(sindex.intersection(geom_i.bounds))
        for j in candidates:
            if j <= i:
                continue

            geom_j = gdf.loc[j, "geometry"]
            node_j = str(gdf.loc[j, precinct_id_col])

            # Must touch/intersect to have boundary
            if not geom_i.intersects(geom_j):
                continue

            # shared boundary length
            inter = geom_i.boundary.intersection(geom_j.boundary)
            shared_len = inter.length  # meters in EPSG:5070

            if shared_len >= min_len_m:
                G.add_edge(node_i, node_j, shared_m=shared_len)

    # QA stats
    degrees = [d for _, d in G.degree()]
    if verbose:
        print(f"\n== Graph QA: {precinct_geojson} ==")
        print("nodes:", G.number_of_nodes())
        print("edges:", G.number_of_edges())
        if degrees:
            print("degree min/mean/median/max:",
                  int(np.min(degrees)),
                  float(np.mean(degrees)),
                  float(np.median(degrees)),
                  int(np.max(degrees)))
        isolated = sum(1 for _, d in G.degree() if d == 0)
        print("isolated nodes:", isolated)
        isolated = [n for n, d in G.degree() if d == 0]
        print("isolated:", len(isolated), isolated[:10])

    isolated_list = [n for n, d in G.degree() if d == 0]
    if len(isolated_list) > 0:
        connect_isolated_by_nearest_centroid(G, gdf, id_col=precinct_id_col)

    if verbose:
        # Re-QA after fallback
        isolated_after = [n for n, d in G.degree() if d == 0]
        print("isolated after fallback:", len(isolated_after), isolated_after[:10])
        print("components:", nx.number_connected_components(G))

    G, comp_sizes = keep_largest_component(G)
    if verbose:
        print("component sizes (desc):", comp_sizes[:10])
        print("kept largest component nodes:", G.number_of_nodes(), "edges:", G.number_of_edges())
        print("components after prune:", nx.number_connected_components(G))


    # Save graph
    data = json_graph.node_link_data(G)
    with open(out_graph_json, "w") as f:
        json.dump(data, f)

    return G

AL_G = build_precinct_adjacency_graph(
    precinct_geojson="AL_precincts_full.geojson",
    out_graph_json="AL_graph.json",
    min_shared_boundary_feet=200,
)

OR_G = build_precinct_adjacency_graph(
    precinct_geojson="OR_precincts_full.geojson",
    out_graph_json="OR_graph.json",
    min_shared_boundary_feet=200,
)
