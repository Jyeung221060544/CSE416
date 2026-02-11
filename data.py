import geopandas as gpd
import pandas as pd
import networkx as nx

# Load data
geo = gpd.read_file("OR-precincts-with-results.geojson")
csv = pd.read_csv("OR-precincts-with-results.csv")

# Merge vote data
gdf = geo.merge(csv, on="GEOID")

# Ensure geometry is valid
gdf = gdf[gdf.geometry.notnull()]
gdf = gdf.set_geometry("geometry")

# print(gdf.columns.tolist())

# Build graph
G = nx.Graph()

# Add nodes with attributes
for idx, row in gdf.iterrows():
    G.add_node(
        row["GEOID"],
        votes_dem=row["votes_dem_y"],
        votes_rep=row["votes_rep_y"],
        votes_total=row["votes_total_y"]
    )

# Build spatial index
gdf = gdf.reset_index(drop=True)
sindex = gdf.sindex

for idx, row in gdf.iterrows():
    possible_matches_index = list(sindex.intersection(row.geometry.bounds))
    possible_matches = gdf.iloc[possible_matches_index]

    for idx2, row2 in possible_matches.iterrows():
        if row["GEOID"] != row2["GEOID"]:
            if row.geometry.touches(row2.geometry):
                G.add_edge(row["GEOID"], row2["GEOID"])

print("Number of nodes:", G.number_of_nodes())
print("Number of edges:", G.number_of_edges())
