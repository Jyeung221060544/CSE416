#!/bin/bash
#SBATCH --job-name=AL_MPI_VRA
#SBATCH --partition=debug-28core
#SBATCH --nodes=2
#SBATCH --ntasks=2
#SBATCH --cpus-per-task=8
#SBATCH --time=01:00:00
#SBATCH --output=../output_vra_mpi/slurm-%j.out
#SBATCH --error=../output_vra_mpi/slurm-%j.err

set -euo pipefail

STATE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS_DIR="$STATE_ROOT/scripts"
BASE_CONFIG="$STATE_ROOT/input/config_vra.json"
MPI_OUT="$STATE_ROOT/output_vra_mpi"

mkdir -p "$MPI_OUT"

module purge
module load mvapich2/gcc12.1/2.3.7

source ~/.bashrc
conda activate cse416-gis

cd "$STATE_ROOT"

mpirun -np 2 python "$SCRIPTS_DIR/run_recom_mpi.py" "$BASE_CONFIG" final "$MPI_OUT"