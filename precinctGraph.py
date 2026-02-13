import geopandas as gpd
import networkx as nx
from networkx.readwrite import json_graph
import json

def build_precinct_graph(geojson_path, output_json, buffer_eps=0.0001):
    gdf = gpd.read_file(geojson_path)

    # Fix geometries
    gdf["geometry"] = gdf["geometry"].buffer(0)

    G = nx.Graph()

    # Add nodes with ALL attributes except geometry
    for _, row in gdf.iterrows():
        attrs = row.drop("geometry").to_dict()
        G.add_node(row["GEOID"], **attrs)

    gdf = gdf.reset_index(drop=True)
    sindex = gdf.sindex

    for i, row in gdf.iterrows():
        geom_i = row.geometry.buffer(buffer_eps)
        candidates = list(sindex.intersection(geom_i.bounds))

        for j in candidates:
            if i == j:
                continue
            if geom_i.intersects(gdf.loc[j, "geometry"]):
                G.add_edge(row["GEOID"], gdf.loc[j, "GEOID"])

    with open(output_json, "w") as f:
        json.dump(json_graph.node_link_data(G), f)

    comps = list(nx.connected_components(G))
    print("Saved:", output_json)
    print("Nodes:", G.number_of_nodes())
    print("Edges:", G.number_of_edges())
    print("Components:", len(comps))

build_precinct_graph(
    "AL_precincts_with_results_and_VAP.geojson",
    "AL_precinct_graph.json"
)
print()
build_precinct_graph(
    "OR_precincts_with_results_and_VAP.geojson",
    "OR_precinct_graph.json"
)
