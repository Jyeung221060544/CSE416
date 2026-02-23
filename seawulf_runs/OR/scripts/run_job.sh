#!/bin/bash
#SBATCH --job-name=recom
#SBATCH --output=slurm-%j.out
#SBATCH --nodes=1
#SBATCH --cpus-per-task=32
#SBATCH --time=08:00:00
#SBATCH --mem=16G

module load python
# If you have a venv, activate it here:
# source ~/venvs/cse416/bin/activate

cd "$(dirname "$0")/.."

echo "Running TEST race-blind..."
python scripts/run_recom.py input/config_raceblind.json test

echo "Running TEST VRA..."
python scripts/run_recom.py input/config_vra.json test