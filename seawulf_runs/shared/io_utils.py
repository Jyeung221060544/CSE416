"""
io_utils.py
===========
Shared I/O and distributed-run helpers used by both AL and OR ReCom runners.

Functions
---------
load_json        : Load a JSON file and return the parsed object.
write_json       : Serialize an object to a JSON file with indentation.
ensure_dir       : Create a directory (and parents) if it does not exist.
concat_jsonl     : Concatenate multiple JSONL files into a single output file.
merge_hist       : Merge a histogram dict (src) into another (dst) in-place.
split_counts     : Divide a total count into N roughly equal integer chunks.
get_rank         : Detect MPI/SLURM process rank from environment variables.
get_world_size   : Detect MPI/SLURM world size from environment variables.
"""

import json
import os
from pathlib import Path


def load_json(path):
    """Load and return a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    """Write *data* to *path* as pretty-printed JSON."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def ensure_dir(path):
    """Create *path* (and all parents) if it does not already exist."""
    Path(path).mkdir(parents=True, exist_ok=True)


def concat_jsonl(files, out_path):
    """
    Concatenate a list of JSONL files into *out_path*.

    Skips files that do not exist. Returns the total number of lines written.
    """
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


def merge_hist(dst, src):
    """
    Add counts from *src* histogram into *dst* histogram in-place.

    Keys are coerced to strings; values are coerced to int.
    """
    for k, v in src.items():
        dst[str(k)] = dst.get(str(k), 0) + int(v)


def split_counts(total, pieces):
    """
    Divide *total* into *pieces* integer chunks that sum to *total*.

    The first ``total % pieces`` chunks receive one extra unit so that
    all chunks differ by at most 1.
    """
    base = total // pieces
    rem = total % pieces
    return [base + (1 if i < rem else 0) for i in range(pieces)]


def get_rank():
    """
    Return the MPI/SLURM process rank (0-based) from environment variables.

    Falls back to 0 when no relevant variable is set (single-node mode).
    """
    for key in ["OMPI_COMM_WORLD_RANK", "MV2_COMM_WORLD_RANK", "PMI_RANK", "SLURM_PROCID"]:
        if key in os.environ:
            return int(os.environ[key])
    return 0


def get_world_size():
    """
    Return the MPI/SLURM world size from environment variables.

    Falls back to 1 when no relevant variable is set (single-node mode).
    """
    for key in ["OMPI_COMM_WORLD_SIZE", "MV2_COMM_WORLD_SIZE", "PMI_SIZE", "SLURM_NTASKS"]:
        if key in os.environ:
            return int(os.environ[key])
    return 1
