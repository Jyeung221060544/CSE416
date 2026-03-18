#!/bin/bash
#SBATCH --job-name=OR_VRA_MULTI
#SBATCH --partition=medium-28core
#SBATCH --nodes=2
#SBATCH --ntasks=2
#SBATCH --cpus-per-task=28
#SBATCH --time=08:00:00
#SBATCH --output=../output_vra_multinode/slurm-%j.out
#SBATCH --error=../output_vra_multinode/slurm-%j.err

set -euo pipefail

STATE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$STATE_ROOT/scripts"
BASE_CONFIG="$STATE_ROOT/input/config_vra.json"
MULTI_ROOT="$STATE_ROOT/output_vra_multinode"
MODE="final"

mkdir -p "$MULTI_ROOT"

python3 "$SCRIPTS_DIR/prepare_multinode_configs.py" \
  "$BASE_CONFIG" \
  "$MODE" \
  "$SLURM_NTASKS" \
  "$MULTI_ROOT"

srun bash -c '
  STATE_ROOT="'"$STATE_ROOT"'"
  SCRIPTS_DIR="$STATE_ROOT/scripts"
  NODE_ID="$SLURM_PROCID"
  CONFIG="$STATE_ROOT/output_vra_multinode/node_configs/config_node_${NODE_ID}.json"

  echo "[node $NODE_ID] running config $CONFIG"
  python3 "$SCRIPTS_DIR/run_recom_parallel.py" "$CONFIG" final
'

python3 "$SCRIPTS_DIR/merge_multinode_outputs.py" \
  "$MULTI_ROOT" \
  "$MODE"

echo "OR VRA multi-node run complete."