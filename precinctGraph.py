import geopandas as gpd
import networkx as nx
from networkx.readwrite import json_graph
import json

def build_precinct_graph(geojson_path, output_json, buffer_m=5):
    gdf = gpd.read_file(geojson_path)

    # Fix geometries
    gdf["geometry"] = gdf["geometry"].buffer(0)

    # Project so buffering is in meters
    if gdf.crs is None:
        raise ValueError("GeoJSON has no CRS. Set it before projecting.")
    gdf = gdf.to_crs("EPSG:5070")

    G = nx.Graph()

    # Add nodes with ALL attributes except geometry
    for _, row in gdf.iterrows():
        attrs = row.drop("geometry").to_dict()
        G.add_node(row["GEOID"], **attrs)

    gdf = gdf.reset_index(drop=True)
    sindex = gdf.sindex

    for i, row in gdf.iterrows():
        id_i = row["GEOID"]
        geom_i = row.geometry.buffer(buffer_m)

        for j in sindex.intersection(geom_i.bounds):
            if i >= j:   # prevents duplicate checks + self
                continue
            geom_j = gdf.loc[j, "geometry"].buffer(buffer_m)

            # adjacency test
            if geom_i.intersects(geom_j):
                G.add_edge(id_i, gdf.loc[j, "GEOID"])

    with open(output_json, "w") as f:
        json.dump(json_graph.node_link_data(G), f)

    comps = list(nx.connected_components(G))
    print("Saved:", output_json)
    print("Nodes:", G.number_of_nodes())
    print("Edges:", G.number_of_edges())
    print("Components:", len(comps))


build_precinct_graph(
    "AL_precincts_full.geojson",
    "AL_precinct_graph.json"
)
print()
build_precinct_graph(
    "OR_precincts_full.geojson",
    "OR_precinct_graph.json"
)
