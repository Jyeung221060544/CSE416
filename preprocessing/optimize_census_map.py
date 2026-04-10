"""
optimize_census_map.py — Stream-processes a census block GeoJSON into the
minimal format needed by the frontend heatmap:
  { type: "FeatureCollection", features: [ { type: "Feature",
    geometry: { ... rounded to 5dp ... }, properties: { idx: N } } ] }

Usage:
    python optimize_census_map.py <input.geojson> <output.json>

Example:
    python optimize_census_map.py OR_data/OR_census_blocks_full.geojson \
        frontend/src/assets/ORCensusMap.json

Processes one feature at a time — peak memory is a single parsed feature,
not the entire file. Writes to a .tmp file first; only replaces output on
full success so a crash never corrupts the destination.
"""

import sys
import json
import os

PRECISION = 4  # decimal places for coordinates (~11 m accuracy)


def round_coords(obj):
    """Recursively round all coordinate numbers to PRECISION decimal places."""
    if isinstance(obj, list):
        return [round_coords(v) for v in obj]
    if isinstance(obj, float):
        return round(obj, PRECISION)
    return obj


def process(src_path, dst_path):
    tmp_path = dst_path + ".tmp"
    idx = 0
    written = 0

    with open(src_path, "r", encoding="utf-8") as fin, \
         open(tmp_path, "w", encoding="utf-8") as fout:

        fout.write('{"type":"FeatureCollection","features":[')
        first = True

        for raw_line in fin:
            line = raw_line.strip()
            if not line:
                continue

            # Strip trailing comma (all features except possibly the last)
            if line.endswith(","):
                line = line[:-1]

            # Skip FeatureCollection wrapper lines
            if line.startswith('{"type":"FeatureCollection"') or \
               line == '{"type":"FeatureCollection", "features": [' or \
               line in ("]}",):
                continue

            # Some formats wrap features inside the array line
            # e.g. {"type":"FeatureCollection","features":[{...},{...}]}
            # Handle single-line files by splitting on feature boundaries
            if line.startswith('{"type":"FeatureCollection"'):
                # Single-line file — need to extract features array manually
                print("Single-line file detected — extracting features array...")
                _process_singleline(line, fout)
                fout.write("]}")
                os.replace(tmp_path, dst_path)
                print(f"Done (single-line path).")
                return

            # Try to parse the line as a GeoJSON Feature
            if not line.startswith('{"type":"Feature"'):
                continue

            try:
                feat = json.loads(line)
            except json.JSONDecodeError:
                # Line might be the last line with trailing `]}`
                if line.endswith("]}"):
                    line = line[:-2]
                    if not line:
                        continue
                    try:
                        feat = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                else:
                    continue

            geom = feat.get("geometry")
            if not geom:
                continue

            geom["coordinates"] = round_coords(geom["coordinates"])

            out = json.dumps(
                {"type": "Feature", "geometry": geom, "properties": {"idx": idx}},
                separators=(",", ":"),
            )

            if not first:
                fout.write(",")
            fout.write(out)
            first = False
            idx += 1
            written += 1

            if written % 10000 == 0:
                print(f"  {written} features written...")

        fout.write("]}")

    os.replace(tmp_path, dst_path)
    print(f"Done. {written} features written to {dst_path}")


def _process_singleline(line, fout):
    """Fallback for single-line FeatureCollection files."""
    data = json.loads(line)
    first = True
    for idx, feat in enumerate(data.get("features", [])):
        geom = feat.get("geometry")
        if not geom:
            continue
        geom["coordinates"] = round_coords(geom["coordinates"])
        out = json.dumps(
            {"type": "Feature", "geometry": geom, "properties": {"idx": idx}},
            separators=(",", ":"),
        )
        if not first:
            fout.write(",")
        fout.write(out)
        first = False
        if (idx + 1) % 10000 == 0:
            print(f"  {idx + 1} features written...")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python optimize_census_map.py <input.geojson> <output.json>")
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]
    if not os.path.exists(src):
        print(f"Error: input file not found: {src}")
        sys.exit(1)

    print(f"Processing {src} -> {dst}")
    process(src, dst)
