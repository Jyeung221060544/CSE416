import pandas as pd

df = pd.read_csv("OregonPrecinct.csv", low_memory=False)
print(df.head())
print(df.columns)
print(len(df))

# Keep only Congressional districts
cong = df[df["DISTRICT TYPE"] == "Congressional"]

print(cong.head())
print(len(cong))

cong["precinct_id"] = (
    cong["COUNTY"].astype(str) + "_" +
    cong["PRECINCT"].astype(str) + "_" +
    cong["SPLIT"].astype(str)
)

print(cong[["precinct_id"]].head())
print(cong["precinct_id"].nunique())

cong_clean = cong[[
    "precinct_id",
    "COUNTY",
    "PRECINCT",
    "SPLIT",
    "PRECINCT NAME",
    "DISTRICT CODE",
    "DISTRICT NAME"
]].copy()

cong_clean.to_csv("oregon_precinct_nodes_congressional.csv", index=False)
print("Saved:", len(cong_clean))

print(cong["DISTRICT CODE"].value_counts())
print("Num districts:", cong["DISTRICT CODE"].nunique())


