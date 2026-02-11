import geopandas as gpd
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph
import json

# Load data
geoO = gpd.read_file("OR-precincts-with-results.geojson")
csvO = pd.read_csv("OR-precincts-with-results.csv")

# Merge vote data
gdfO = geoO.merge(csvO, on="GEOID")

# Ensure geometry is valid
gdfO = gdfO[gdfO.geometry.notnull()]
gdfO = gdfO.set_geometry("geometry")

# Build graph
GO = nx.Graph()

# Add nodes with attributes
for idx, row in gdfO.iterrows():
    GO.add_node(
        row["GEOID"],
        votes_dem=row["votes_dem_y"],
        votes_rep=row["votes_rep_y"],
        votes_total=row["votes_total_y"]
    )

# Build spatial index
gdfO = gdfO.reset_index(drop=True)
sindexO = gdfO.sindex

for i, row in gdfO.iterrows():
    candidates = list(sindexO.intersection(row.geometry.bounds))
    for j in candidates:
        if i == j:
            continue
        if row.geometry.touches(gdfO.loc[j, "geometry"]):
            GO.add_edge(row["GEOID"], gdfO.loc[j, "GEOID"])

# Save
dataO = json_graph.node_link_data(GO)
with open("OR-precinct-graph.json", "w") as f:
    json.dump(dataO, f)

print("Saved OR-precinct-graph.json")



# Alabama
geoA = gpd.read_file("AL-precincts-with-results.geojson")
csvA = pd.read_csv("AL-precincts-with-results.csv")

# Merge vote data
gdfA = geoA.merge(csvA, on="GEOID")

# Ensure geometry is valid
gdfA = gdfA[gdfA.geometry.notnull()]
gdfA = gdfA.set_geometry("geometry")

# print(gdf.columns.tolist())

# Build graph
GA = nx.Graph()

# Add nodes with attributes
for idx, row in gdfA.iterrows():
    GA.add_node(
        row["GEOID"],
        votes_dem=row["votes_dem_y"],
        votes_rep=row["votes_rep_y"],
        votes_total=row["votes_total_y"]
    )

# Build spatial index
gdfA = gdfA.reset_index(drop=True)
sindexA = gdfA.sindex

for i, row in gdfA.iterrows():
    candidates = list(sindexA.intersection(row.geometry.bounds))
    for j in candidates:
        if i == j:
            continue
        if row.geometry.touches(gdfA.loc[j, "geometry"]):
            GA.add_edge(row["GEOID"], gdfA.loc[j, "GEOID"])

# Save
dataA = json_graph.node_link_data(GA)
with open("AL-precinct-graph.json", "w") as f:
    json.dump(dataA, f)

print("Saved AL-precinct-graph.json")
