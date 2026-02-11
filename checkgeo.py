import geopandas as gpd
import pandas as pd

or_gdf = gpd.read_file("OR-precincts-with-results.geojson")

print(or_gdf.columns)
print(len(or_gdf))
print(or_gdf.head())

print(or_gdf.geom_type.unique())

print(or_gdf.crs)

or_csv = pd.read_csv("OR-precincts-with-results.csv")

print(len(or_csv))
print(or_csv["GEOID"].nunique())

al_gdf = gpd.read_file("AL-precincts-with-results.geojson")

print(al_gdf.columns)
print(len(al_gdf))
print(al_gdf.head())

print(al_gdf.geom_type.unique())

print(al_gdf.crs)

al_csv = pd.read_csv("AL-precincts-with-results.csv")

print(len(al_csv))
print(al_csv["GEOID"].nunique())