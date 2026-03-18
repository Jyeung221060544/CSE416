#!/bin/bash
#SBATCH --job-name=OR_MPI_RB
#SBATCH --partition=debug-28core
#SBATCH --nodes=2
#SBATCH --ntasks=2
#SBATCH --cpus-per-task=8
#SBATCH --time=01:00:00
#SBATCH -A class_cse416
#SBATCH -o /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/output_raceblind_mpi_%j.out
#SBATCH -e /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/output_raceblind_mpi_%j.err

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCRIPTS_DIR="$STATE_ROOT/scripts"
BASE_CONFIG="$STATE_ROOT/input/config_raceblind.json"
MPI_OUT="$STATE_ROOT/output_raceblind_mpi"

mkdir -p "$STATE_ROOT/logs"
mkdir -p "$MPI_OUT"

module purge
module load mvapich2/gcc12.1/2.3.7

source ~/.bashrc
conda activate cse416-gis

cd "$STATE_ROOT"

mpirun -np "$SLURM_NTASKS" python "$SCRIPTS_DIR/run_recom_mpi.py" "$BASE_CONFIG" final "$MPI_OUT"