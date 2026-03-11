"""
reformat_census.py — Converts a compact single-line GeoJSON FeatureCollection
to newline-delimited format (one feature per line) required by CensusBlockService.

Usage:
    python reformat_census.py <input.json> <output.json>

The output file can be the same as the input (in-place reformat via a .tmp file).

Example:
    python reformat_census.py frontend/src/assets/ALCensusMap.json frontend/src/assets/ALCensusMap.json
    python reformat_census.py frontend/src/assets/ORCensusMap.json frontend/src/assets/ORCensusMap.json
"""

import json
import sys
import os


def reformat(src, dst):
    print(f"Loading {src} ({os.path.getsize(src) // 1_048_576} MB)...")
    with open(src, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    n = len(features)
    print(f"  {n} features found — writing one per line...")

    tmp = dst + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write('{"type":"FeatureCollection","features":[\n')
        for i, feat in enumerate(features):
            sep = "" if i == n - 1 else ","
            f.write(json.dumps(feat, separators=(",", ":")) + sep + "\n")
            if (i + 1) % 25_000 == 0:
                print(f"  {i + 1}/{n}...")
        f.write("]}")

    os.replace(tmp, dst)
    print(f"Done: {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reformat_census.py <input.json> <output.json>")
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]
    if not os.path.exists(src):
        print(f"Error: file not found: {src}")
        sys.exit(1)

    reformat(src, dst)
