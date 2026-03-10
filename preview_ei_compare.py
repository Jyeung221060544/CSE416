import json

data = json.load(open("AL-real-data/AL-EI-compare.json"))

for pair in data["racePairs"]:
    print(pair["label"])
    for cand in pair["candidates"]:
        print(
            cand["candidateName"],
            "peakDiff:", cand["peakDifference"],
            "probDiffGT:", cand["probDifferenceGT"]
        )
    print()