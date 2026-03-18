import copy
import json
import subprocess
import sys
from pathlib import Path

from mpi4py import MPI


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def split_steps(total_steps: int, world_size: int) -> list[int]:
    base = total_steps // world_size
    rem = total_steps % world_size
    return [base + (1 if i < rem else 0) for i in range(world_size)]


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


def merge_rank_outputs(mpi_output_root: Path, mode: str):
    manifest = load_json(mpi_output_root / "mpi_manifest.json")
    world_size = int(manifest["world_size"])

    rank_dirs = [mpi_output_root / f"rank_{r}" for r in range(world_size)]
    merged_dir = mpi_output_root / "merged"
    merged_dir.mkdir(parents=True, exist_ok=True)

    plans_files = [d / f"plans_{mode}.jsonl" for d in rank_dirs]
    box_files = [d / f"boxwhisker_raw_{mode}.jsonl" for d in rank_dirs]
    eff_files = [d / f"district_effectiveness_{mode}.jsonl" for d in rank_dirs]
    summary_files = [d / f"summary_{mode}.json" for d in rank_dirs]

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
    ranks_with_output = 0

    for s_path in summary_files:
        if not s_path.exists():
            continue
        s = load_json(s_path)
        ranks_with_output += 1

        if first_summary is None:
            first_summary = s

        merge_hist(seat_splits, s.get("seat_splits_dem_seats", {}))
        merge_hist(opp_hist, s.get("vra", {}).get("opp_hist", {}))
        merge_hist(eff_hist, s.get("vra", {}).get("eff_hist", {}))
        merge_hist(cut_hist, s.get("cut_edges_hist", {}))

    if first_summary is None:
        raise RuntimeError("No rank summary files found to merge.")

    merged = {
        "state": first_summary.get("state"),
        "mode": mode,
        "steps": int(manifest["total_steps"]),
        "pop_tolerance": float(first_summary.get("pop_tolerance", 0.0)),
        "mpi": {
            "enabled": True,
            "world_size": world_size,
            "chunks": manifest["chunks"],
            "ranks_with_output": ranks_with_output,
            "output_root": str(mpi_output_root),
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
        "district_effectiveness_rows_written": eff_written,
    }

    write_json(merged_summary, merged)
    print(f"[merge] wrote {merged_summary}")


def main():
    comm = MPI.COMM_WORLD
    rank = comm.Get_rank()
    world_size = comm.Get_size()

    if len(sys.argv) < 4:
        if rank == 0:
            print("Usage: python run_recom_mpi.py <base_config.json> <mode:test|final> <mpi_output_root>")
        sys.exit(1)

    base_config_path = Path(sys.argv[1]).resolve()
    mode = sys.argv[2].lower()
    mpi_output_root = Path(sys.argv[3]).resolve()

    if mode not in {"test", "final"}:
        if rank == 0:
            print("mode must be test or final")
        sys.exit(1)

    base_cfg = load_json(base_config_path)
    total_steps = int(base_cfg["steps_test"] if mode == "test" else base_cfg["steps_final"])
    chunks = split_steps(total_steps, world_size)
    my_steps = chunks[rank]

    rank_dir = mpi_output_root / f"rank_{rank}"
    rank_dir.mkdir(parents=True, exist_ok=True)

    rank_cfg = copy.deepcopy(base_cfg)
    if mode == "test":
        rank_cfg["steps_test"] = my_steps
    else:
        rank_cfg["steps_final"] = my_steps
    rank_cfg["output_dir"] = str(rank_dir)

    rank_cfg_path = rank_dir / "config_rank.json"
    write_json(rank_cfg_path, rank_cfg)

    if rank == 0:
        manifest = {
            "base_config": str(base_config_path),
            "mode": mode,
            "world_size": world_size,
            "total_steps": total_steps,
            "chunks": chunks,
            "mpi_output_root": str(mpi_output_root),
        }
        write_json(mpi_output_root / "mpi_manifest.json", manifest)

    comm.Barrier()

    scripts_dir = Path(__file__).resolve().parent
    run_recom_parallel_py = scripts_dir / "run_recom_parallel.py"
    cmd = [sys.executable, str(run_recom_parallel_py), str(rank_cfg_path), mode]
    print(f"[rank {rank}] running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(scripts_dir.parent))
    if result.returncode != 0:
        raise RuntimeError(f"rank {rank} failed with exit code {result.returncode}")

    comm.Barrier()

    if rank == 0:
        merge_rank_outputs(mpi_output_root, mode)


if __name__ == "__main__":
    main()