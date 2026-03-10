import json
from pathlib import Path

FILES = [
    "AL-real-data/AL-EI.json",
    "OR-real-data/OR-EI.json",
]


def preview(path):
    print("\n==============================")
    print("FILE:", path)
    print("==============================")

    data = json.loads(Path(path).read_text())

    print("\nTop-level keys:")
    print(list(data.keys()))

    print("\nState:", data.get("stateId"))
    print("Election year:", data.get("electionYear"))

    candidates = data.get("candidates", [])
    print("\nNumber of candidates:", len(candidates))

    if not candidates:
        return

    cand = candidates[0]
    print("\nFirst candidate:")
    print("candidateId:", cand.get("candidateId"))
    print("candidateName:", cand.get("candidateName"))
    print("party:", cand.get("party"))

    groups = cand.get("racialGroups", [])
    print("\nNumber of racial groups:", len(groups))

    if not groups:
        return

    group = groups[0]
    print("\nFirst racial group:")
    for k in group:
        if k != "kdePoints":
            print(f"{k}: {group[k]}")

    kde = group.get("kdePoints", [])
    print("\nFirst 5 KDE points:")
    for p in kde[:5]:
        print(p)


def main():
    for f in FILES:
        preview(f)


if __name__ == "__main__":
    main()