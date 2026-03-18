import copy
import json
import math
import sys
from pathlib import Path


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def split_steps(total_steps: int, num_nodes: int) -> list[int]:
    base = total_steps // num_nodes
    rem = total_steps % num_nodes
    return [base + (1 if i < rem else 0) for i in range(num_nodes)]


def main():
    if len(sys.argv) < 5:
        print(
            "Usage: python prepare_multinode_configs.py "
            "<base_config.json> <mode:test|final> <num_nodes> <output_root>"
        )
        sys.exit(1)

    base_config_path = Path(sys.argv[1]).resolve()
    mode = sys.argv[2].lower()
    num_nodes = int(sys.argv[3])
    output_root = Path(sys.argv[4]).resolve()

    if mode not in {"test", "final"}:
        print("mode must be test or final")
        sys.exit(1)

    if num_nodes <= 0:
        print("num_nodes must be > 0")
        sys.exit(1)

    cfg = load_json(base_config_path)

    total_steps = int(cfg["steps_test"] if mode == "test" else cfg["steps_final"])
    chunks = split_steps(total_steps, num_nodes)

    configs_dir = output_root / "node_configs"
    configs_dir.mkdir(parents=True, exist_ok=True)

    print(f"[prepare] mode={mode}")
    print(f"[prepare] total_steps={total_steps}")
    print(f"[prepare] num_nodes={num_nodes}")
    print(f"[prepare] chunks={chunks}")

    for i, chunk in enumerate(chunks):
        node_cfg = copy.deepcopy(cfg)

        if mode == "test":
            node_cfg["steps_test"] = chunk
        else:
            node_cfg["steps_final"] = chunk

        # each node writes to its own folder
        node_cfg["output_dir"] = str(output_root / f"node_{i}")

        node_cfg_path = configs_dir / f"config_node_{i}.json"
        write_json(node_cfg_path, node_cfg)
        print(f"[prepare] wrote {node_cfg_path}")

    manifest = {
        "base_config": str(base_config_path),
        "mode": mode,
        "num_nodes": num_nodes,
        "total_steps": total_steps,
        "chunks": chunks,
        "configs_dir": str(configs_dir),
        "output_root": str(output_root),
    }
    write_json(output_root / "multinode_manifest.json", manifest)
    print(f"[prepare] wrote {output_root / 'multinode_manifest.json'}")


if __name__ == "__main__":
    main()