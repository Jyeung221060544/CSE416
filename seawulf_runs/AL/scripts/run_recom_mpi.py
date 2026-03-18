import copy
import json
import os
import shutil
import subprocess
import sys
import time
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


def split_counts(total, pieces):
    base = total // pieces
    rem = total % pieces
    return [base + (1 if i < rem else 0) for i in range(pieces)]


def get_rank():
    for key in ["OMPI_COMM_WORLD_RANK", "MV2_COMM_WORLD_RANK", "PMI_RANK", "SLURM_PROCID"]:
        if key in os.environ:
            return int(os.environ[key])
    return 0


def get_world_size():
    for key in ["OMPI_COMM_WORLD_SIZE", "MV2_COMM_WORLD_SIZE", "PMI_SIZE", "SLURM_NTASKS"]:
        if key in os.environ:
            return int(os.environ[key])
    return 1


def wait_for_files(paths, timeout_seconds=3600, poll_seconds=2):
    start = time.time()
    while True:
        if all(Path(p).exists() for p in paths):
            return True
        if time.time() - start > timeout_seconds:
            return False
        time.sleep(poll_seconds)


def merge_rank_outputs(
    distributed_root: Path,
    final_outdir: Path,
    mode: str,
    world_size: int,
    total_steps: int,
    rank_chunks: list[int],
    base_cfg: dict,
):
    rank_outdirs = [distributed_root / f"rank_{r}" for r in range(world_size)]

    merged_plans = final_outdir / f"plans_{mode}.jsonl"
    merged_box = final_outdir / f"boxwhisker_raw_{mode}.jsonl"
    merged_eff = final_outdir / f"district_effectiveness_{mode}.jsonl"
    merged_summary = final_outdir / f"summary_{mode}.json"

    plan_files = [r / f"plans_{mode}.jsonl" for r in rank_outdirs]
    box_files = [r / f"boxwhisker_raw_{mode}.jsonl" for r in rank_outdirs]
    eff_files = [r / f"district_effectiveness_{mode}.jsonl" for r in rank_outdirs]
    summary_files = [r / f"summary_{mode}.json" for r in rank_outdirs]

    plans_written = concat_jsonl(plan_files, merged_plans)
    box_written = concat_jsonl(box_files, merged_box)
    district_eff_written = concat_jsonl(eff_files, merged_eff)

    seat_splits = {}
    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    first_summary = None

    for s_path in summary_files:
        if not s_path.exists():
            continue
        s = load_json(s_path)

        if first_summary is None:
            first_summary = s

        merge_hist(seat_splits, s.get("seat_splits_dem_seats", {}))
        merge_hist(opp_hist, s.get("vra", {}).get("opp_hist", {}))
        merge_hist(eff_hist, s.get("vra", {}).get("eff_hist", {}))
        merge_hist(cut_hist, s.get("cut_edges_hist", {}))

    if first_summary is None:
        print("[distributed] No rank summary files found.")
        sys.exit(1)

    merged = {
        "state": base_cfg.get("state"),
        "mode": mode,
        "steps": total_steps,
        "pop_tolerance": float(base_cfg["pop_tolerance"]),
        "parallel": {
            "enabled": True,
            "workers_per_rank": first_summary.get("parallel", {}).get("workers", None),
        },
        "distributed": {
            "enabled": True,
            "world_size": world_size,
            "rank_chunks": rank_chunks,
            "distributed_root": str(distributed_root),
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

    print("[distributed] Wrote merged plans: {}".format(merged_plans))
    print("[distributed] Wrote merged box/whisker raw: {}".format(merged_box))
    print("[distributed] Wrote merged district effectiveness: {}".format(merged_eff))
    print("[distributed] Wrote merged summary: {}".format(merged_summary))


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

    rank = get_rank()
    world_size = get_world_size()

    rank_chunks = split_counts(total_steps, world_size)
    rank_steps = rank_chunks[rank]

    state_root = cfg_path.parent.parent
    scripts_dir = state_root / "scripts"
    run_recom_py = scripts_dir / "run_recom.py"

    final_outdir = Path(base_cfg["output_dir"])

    # Single-node mode: preserve old behavior exactly.
    # Distributed mode: each rank writes to its own subdirectory, rank 0 merges later.
    if world_size > 1:
        distributed_root = final_outdir / "_distributed_tmp"
        original_outdir = distributed_root / f"rank_{rank}"
        ensure_dir(distributed_root)

        if rank == 0:
            manifest = {
                "mode": mode,
                "world_size": world_size,
                "total_steps": total_steps,
                "rank_chunks": rank_chunks,
                "final_outdir": str(final_outdir),
                "distributed_root": str(distributed_root),
            }
            write_json(distributed_root / "distributed_manifest.json", manifest)
    else:
        distributed_root = None
        original_outdir = final_outdir

    ensure_dir(original_outdir)

    requested_workers = int(os.environ.get("SLURM_CPUS_PER_TASK", "4"))
    workers = max(1, min(requested_workers, rank_steps if rank_steps > 0 else 1))

    local_chunks = split_counts(rank_steps, workers)

    tmp_root = original_outdir / "_parallel_tmp"
    ensure_dir(tmp_root)

    print(
        "[parallel] mode={} total_steps={} world_size={} rank={} rank_steps={} workers={}".format(
            mode, total_steps, world_size, rank, rank_steps, workers
        )
    )
    print("[parallel] rank_chunks={}".format(rank_chunks))
    print("[parallel] local_chunks={}".format(local_chunks))

    worker_outdirs = []
    processes = []

    for i, chunk_steps in enumerate(local_chunks):
        worker_cfg = copy.deepcopy(base_cfg)
        worker_outdir = tmp_root / "worker_{}".format(i)
        ensure_dir(worker_outdir)

        if mode == "test":
            worker_cfg["steps_test"] = chunk_steps
        else:
            worker_cfg["steps_final"] = chunk_steps

        worker_cfg["output_dir"] = str(worker_outdir)

        worker_cfg_path = tmp_root / "config_worker_{}.json".format(i)
        write_json(worker_cfg_path, worker_cfg)

        worker_outdirs.append(worker_outdir)

        cmd = [sys.executable, str(run_recom_py), str(worker_cfg_path), mode]
        print("[parallel] rank {} launching worker {}: {}".format(rank, i, cmd))
        p = subprocess.Popen(cmd, cwd=str(state_root))
        processes.append((i, p))

    failed = False
    for i, p in processes:
        rc = p.wait()
        print("[parallel] rank {} worker {} exit code: {}".format(rank, i, rc))
        if rc != 0:
            failed = True

    if failed:
        print("[parallel] rank {}: one or more workers failed. Not merging outputs.".format(rank))
        sys.exit(1)

    merged_plans = original_outdir / "plans_{}.jsonl".format(mode)
    merged_box = original_outdir / "boxwhisker_raw_{}.jsonl".format(mode)
    merged_eff = original_outdir / "district_effectiveness_{}.jsonl".format(mode)
    merged_summary = original_outdir / "summary_{}.json".format(mode)

    plan_files = [w / "plans_{}.jsonl".format(mode) for w in worker_outdirs]
    box_files = [w / "boxwhisker_raw_{}.jsonl".format(mode) for w in worker_outdirs]
    eff_files = [w / "district_effectiveness_{}.jsonl".format(mode) for w in worker_outdirs]

    plans_written = concat_jsonl(plan_files, merged_plans)
    box_written = concat_jsonl(box_files, merged_box)
    district_eff_written = concat_jsonl(eff_files, merged_eff)

    seat_splits = {}
    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    first_summary = None

    for w in worker_outdirs:
        s_path = w / "summary_{}.json".format(mode)
        if not s_path.exists():
            continue
        s = load_json(s_path)

        if first_summary is None:
            first_summary = s

        merge_hist(seat_splits, s.get("seat_splits_dem_seats", {}))
        merge_hist(opp_hist, s.get("vra", {}).get("opp_hist", {}))
        merge_hist(eff_hist, s.get("vra", {}).get("eff_hist", {}))
        merge_hist(cut_hist, s.get("cut_edges_hist", {}))

    if first_summary is None:
        print("[parallel] rank {}: no worker summary files found.".format(rank))
        sys.exit(1)

    local_summary = {
        "state": base_cfg.get("state"),
        "mode": mode,
        "steps": rank_steps,
        "pop_tolerance": float(base_cfg["pop_tolerance"]),
        "parallel": {
            "enabled": True,
            "workers": workers,
            "chunks": local_chunks,
            "tmp_root": str(tmp_root),
        },
        "distributed": {
            "enabled": world_size > 1,
            "rank": rank,
            "world_size": world_size,
            "rank_steps": rank_steps,
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

    write_json(merged_summary, local_summary)

    print("[parallel] rank {} wrote merged plans: {}".format(rank, merged_plans))
    print("[parallel] rank {} wrote merged box/whisker raw: {}".format(rank, merged_box))
    print("[parallel] rank {} wrote merged district effectiveness: {}".format(rank, merged_eff))
    print("[parallel] rank {} wrote merged summary: {}".format(rank, merged_summary))

    if os.environ.get("KEEP_PARALLEL_TMP", "1") == "0":
        shutil.rmtree(tmp_root, ignore_errors=True)
        print("[parallel] rank {} removed temp directory: {}".format(rank, tmp_root))

    # Single-node mode ends here.
    if world_size == 1:
        return

    # Multi-node mode: rank 0 waits for all rank summaries, then merges them.
    rank_summary_paths = [
        final_outdir / "_distributed_tmp" / f"rank_{r}" / f"summary_{mode}.json"
        for r in range(world_size)
    ]

    if rank == 0:
        print("[distributed] rank 0 waiting for all rank summaries...")
        ok = wait_for_files(rank_summary_paths, timeout_seconds=6 * 3600, poll_seconds=2)
        if not ok:
            print("[distributed] timeout waiting for rank summaries.")
            sys.exit(1)

        merge_rank_outputs(
            distributed_root=final_outdir / "_distributed_tmp",
            final_outdir=final_outdir,
            mode=mode,
            world_size=world_size,
            total_steps=total_steps,
            rank_chunks=rank_chunks,
            base_cfg=base_cfg,
        )


if __name__ == "__main__":
    main()