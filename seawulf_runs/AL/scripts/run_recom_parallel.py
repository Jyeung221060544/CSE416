import copy
import json
import math
import os
import shutil
import subprocess
import sys
from pathlib import Path


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


def merge_hist(dst, src):
    for k, v in src.items():
        dst[str(k)] = dst.get(str(k), 0) + int(v)


def concat_jsonl(files, out_path):
    written = 0
    with open(out_path, "w", encoding="utf-8") as fout:
        for fp in files:
            if not Path(fp).exists():
                continue
            with open(fp, "r", encoding="utf-8") as fin:
                for line in fin:
                    line = line.strip()
                    if not line:
                        continue
                    fout.write(line + "\n")
                    written += 1
    return written


def main():
    if len(sys.argv) < 3:
        print("Usage: python run_recom_parallel.py <config.json> <mode:test|final>")
        sys.exit(1)

    cfg_path = Path(sys.argv[1]).resolve()
    mode = sys.argv[2].lower()
    if mode not in {"test", "final"}:
        print("Mode must be 'test' or 'final'")
        sys.exit(1)

    base_cfg = load_json(cfg_path)
    total_steps = int(base_cfg["steps_test"] if mode == "test" else base_cfg["steps_final"])

    # Use SLURM_CPUS_PER_TASK when available; otherwise default to 4.
    requested_workers = int(os.environ.get("SLURM_CPUS_PER_TASK", "4"))
    workers = max(1, min(requested_workers, total_steps))

    # Split total plans across workers as evenly as possible.
    base_chunk = total_steps // workers
    remainder = total_steps % workers
    chunks = [base_chunk + (1 if i < remainder else 0) for i in range(workers)]

    state_root = cfg_path.parent.parent  # .../AL or .../OR
    scripts_dir = state_root / "scripts"
    run_recom_py = scripts_dir / "run_recom.py"

    original_outdir = Path(base_cfg["output_dir"])
    tmp_root = original_outdir / "_parallel_tmp"
    ensure_dir(tmp_root)

    print(f"[parallel] mode={mode} total_steps={total_steps} workers={workers}")
    print(f"[parallel] chunks={chunks}")

    worker_cfg_paths = []
    worker_outdirs = []
    processes = []

    # Launch one subprocess per worker.
    for i, chunk_steps in enumerate(chunks):
        worker_cfg = copy.deepcopy(base_cfg)
        worker_outdir = tmp_root / f"worker_{i}"
        ensure_dir(worker_outdir)

        if mode == "test":
            worker_cfg["steps_test"] = chunk_steps
        else:
            worker_cfg["steps_final"] = chunk_steps

        # IMPORTANT: each worker writes to its own subdirectory.
        worker_cfg["output_dir"] = str(worker_outdir)

        worker_cfg_path = tmp_root / f"config_worker_{i}.json"
        write_json(worker_cfg_path, worker_cfg)

        worker_cfg_paths.append(worker_cfg_path)
        worker_outdirs.append(worker_outdir)

        cmd = [sys.executable, str(run_recom_py), str(worker_cfg_path), mode]
        print(f"[parallel] launching worker {i}: {cmd}")
        p = subprocess.Popen(cmd, cwd=str(state_root))
        processes.append((i, p))

    # Wait for all workers.
    failed = False
    for i, p in processes:
        rc = p.wait()
        print(f"[parallel] worker {i} exit code: {rc}")
        if rc != 0:
            failed = True

    if failed:
        print("[parallel] One or more workers failed. Not merging outputs.")
        sys.exit(1)

    # Final merged output paths.
    ensure_dir(original_outdir)
    merged_plans = original_outdir / f"plans_{mode}.jsonl"
    merged_box = original_outdir / f"boxwhisker_raw_{mode}.jsonl"
    merged_eff = original_outdir / f"district_effectiveness_{mode}.jsonl"
    merged_summary = original_outdir / f"summary_{mode}.json"

    # Concatenate JSONL outputs.
    plan_files = [w / f"plans_{mode}.jsonl" for w in worker_outdirs]
    box_files = [w / f"boxwhisker_raw_{mode}.jsonl" for w in worker_outdirs]
    eff_files = [w / f"district_effectiveness_{mode}.jsonl" for w in worker_outdirs]

    plans_written = concat_jsonl(plan_files, merged_plans)
    box_written = concat_jsonl(box_files, merged_box)
    district_eff_written = concat_jsonl(eff_files, merged_eff)

    # Merge summaries/histograms from each worker.
    seat_splits = {}
    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    first_summary = None
    worker_summaries = []

    for w in worker_outdirs:
        s_path = w / f"summary_{mode}.json"
        if not s_path.exists():
            continue
        s = load_json(s_path)
        worker_summaries.append(s)

        if first_summary is None:
            first_summary = s

        merge_hist(seat_splits, s.get("seat_splits_dem_seats", {}))
        merge_hist(opp_hist, s.get("vra", {}).get("opp_hist", {}))
        merge_hist(eff_hist, s.get("vra", {}).get("eff_hist", {}))
        merge_hist(cut_hist, s.get("cut_edges_hist", {}))

    if first_summary is None:
        print("[parallel] No worker summary files found.")
        sys.exit(1)

    merged = {
        "state": base_cfg.get("state"),
        "mode": mode,
        "steps": total_steps,
        "pop_tolerance": float(base_cfg["pop_tolerance"]),
        "parallel": {
            "enabled": True,
            "workers": workers,
            "chunks": chunks,
            "tmp_root": str(tmp_root),
        },
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
        "district_effectiveness_rows_written": district_eff_written,
    }

    write_json(merged_summary, merged)

    print(f"[parallel] Wrote merged plans: {merged_plans}")
    print(f"[parallel] Wrote merged box/whisker raw: {merged_box}")
    print(f"[parallel] Wrote merged district effectiveness: {merged_eff}")
    print(f"[parallel] Wrote merged summary: {merged_summary}")

    # Optional cleanup toggle.
    if os.environ.get("KEEP_PARALLEL_TMP", "1") == "0":
        shutil.rmtree(tmp_root, ignore_errors=True)
        print(f"[parallel] Removed temp directory: {tmp_root}")


if __name__ == "__main__":
    main()