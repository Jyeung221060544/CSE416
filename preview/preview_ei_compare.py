import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    data = json.load(open(str(ROOT / "AL-real-data" / "AL-EI-compare.json")))

    for pair in data["racePairs"]:
        print(pair["label"])
        for cand in pair["candidates"]:
            print(
                cand["candidateName"],
                "peakDiff:", cand["peakDifference"],
                "probDiffGT:", cand["probDifferenceGT"]
            )
        print()


if __name__ == "__main__":
    main()
