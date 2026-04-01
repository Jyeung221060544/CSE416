import json
import sys
from pathlib import Path


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def merge_hist(dst: dict, src: dict):
    for k, v in src.items():
        dst[str(k)] = dst.get(str(k), 0) + int(v)


def concat_jsonl(files: list[Path], out_path: Path) -> int:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with out_path.open("w", encoding="utf-8") as fout:
        for fp in files:
            if not fp.exists():
                continue
            with fp.open("r", encoding="utf-8") as fin:
                for line in fin:
                    line = line.strip()
                    if not line:
                        continue
                    fout.write(line + "\n")
                    written += 1
    return written


def main():
    if len(sys.argv) < 3:
        print("Usage: python merge_multinode_outputs.py <multinode_output_root> <mode:test|final>")
        sys.exit(1)

    output_root = Path(sys.argv[1]).resolve()
    mode = sys.argv[2].lower()

    if mode not in {"test", "final"}:
        print("mode must be test or final")
        sys.exit(1)

    manifest_path = output_root / "multinode_manifest.json"
    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}")
        sys.exit(1)

    manifest = load_json(manifest_path)
    num_nodes = int(manifest["num_nodes"])
    chunks = manifest["chunks"]

    node_dirs = [output_root / f"node_{i}" for i in range(num_nodes)]

    merged_dir = output_root / "merged"
    merged_dir.mkdir(parents=True, exist_ok=True)

    plans_files = [d / f"plans_{mode}.jsonl" for d in node_dirs]
    box_files = [d / f"boxwhisker_raw_{mode}.jsonl" for d in node_dirs]
    eff_files = [d / f"district_effectiveness_{mode}.jsonl" for d in node_dirs]
    summary_files = [d / f"summary_{mode}.json" for d in node_dirs]

    merged_plans = merged_dir / f"plans_{mode}.jsonl"
    merged_box = merged_dir / f"boxwhisker_raw_{mode}.jsonl"
    merged_eff = merged_dir / f"district_effectiveness_{mode}.jsonl"
    merged_summary = merged_dir / f"summary_{mode}.json"

    plans_written = concat_jsonl(plans_files, merged_plans)
    box_written = concat_jsonl(box_files, merged_box)
    eff_written = concat_jsonl(eff_files, merged_eff)

    seat_splits = {}
    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    first_summary = None
    worker_count = 0

    for s_path in summary_files:
        if not s_path.exists():
            continue
        s = load_json(s_path)
        worker_count += 1

        if first_summary is None:
            first_summary = s

        merge_hist(seat_splits, s.get("seat_splits_dem_seats", {}))
        merge_hist(opp_hist, s.get("vra", {}).get("opp_hist", {}))
        merge_hist(eff_hist, s.get("vra", {}).get("eff_hist", {}))
        merge_hist(cut_hist, s.get("cut_edges_hist", {}))

    if first_summary is None:
        print("No node summary files found.")
        sys.exit(1)

    merged = {
        "state": first_summary.get("state"),
        "mode": mode,
        "steps": int(manifest["total_steps"]),
        "pop_tolerance": float(first_summary.get("pop_tolerance", 0.0)),
        "multinode": {
            "enabled": True,
            "num_nodes": num_nodes,
            "chunks": chunks,
            "nodes_with_output": worker_count,
            "output_root": str(output_root),
        },
        "parallel": first_summary.get("parallel", {}),
        "plans_file": str(merged_plans),
        "plans_written": plans_written,
        "seat_splits_dem_seats": seat_splits,
        "vra": {
            "enabled": first_summary.get("vra", {}).get("enabled", False),
            "group_key": first_summary.get("vra", {}).get("group_key"),
            "threshold": first_summary.get("vra", {}).get("threshold"),
            "party_of_choice": first_summary.get("vra", {}).get("party_of_choice"),
            "opp_hist": opp_hist,
            "eff_hist": eff_hist,
        },
        "analysis": first_summary.get("analysis", {}),
        "cut_edges_hist": cut_hist,
        "boxwhisker_raw_file": str(merged_box),
        "boxwhisker_plans_written": box_written,
        "district_effectiveness_file": str(merged_eff),
        "district_effectiveness_rows_written": eff_written,
    }

    write_json(merged_summary, merged)

    print(f"[merge] wrote {merged_plans}")
    print(f"[merge] wrote {merged_box}")
    print(f"[merge] wrote {merged_eff}")
    print(f"[merge] wrote {merged_summary}")


if __name__ == "__main__":
    main()