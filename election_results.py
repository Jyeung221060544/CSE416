import pandas as pd

votes = pd.read_csv("precincts-with-results.csv")
# print(votes.columns)
# print(votes.head())

# pres = votes[votes["Contest"].str.contains("President", case=False)]

# print(pres["Precinct"].nunique())
# print(pres["Precinct"].head(10))
or_votes = votes[votes["state"] == "OR"].copy()

print("Total rows in OR:", len(or_votes))
print("Unique GEOIDs:", or_votes["GEOID"].nunique())
print(or_votes.head())