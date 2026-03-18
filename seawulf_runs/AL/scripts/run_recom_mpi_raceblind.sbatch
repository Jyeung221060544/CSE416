#!/bin/bash
#SBATCH -p debug-28core
#SBATCH -N 2
#SBATCH --ntasks=2
#SBATCH -c 8
#SBATCH -t 00:30:00
#SBATCH -J AL_MPI_RB
#SBATCH -A class_cse416
#SBATCH -o /gpfs/home/jayeung/projects/CSE416/seawulf_runs/AL/logs/output_raceblind_mpi_%j.out
#SBATCH -e /gpfs/home/jayeung/projects/CSE416/seawulf_runs/AL/logs/output_raceblind_mpi_%j.err

module purge
module load anaconda/3-new
module load mvapich2/gcc12.1/2.3.7
source /gpfs/software/Anaconda/etc/profile.d/conda.sh
conda activate cse416-gis-py311

cd /gpfs/home/jayeung/projects/CSE416/seawulf_runs/AL

which python
python --version
python -c "import mpi4py, gerrychain, geopandas; print('imports ok')"

mkdir -p /gpfs/home/jayeung/projects/CSE416/seawulf_runs/AL/output_raceblind_mpi

mpirun -np 2 python -u scripts/run_recom_mpi.py input/config_raceblind.json final /gpfs/home/jayeung/projects/CSE416/seawulf_runs/AL/output_raceblind_mpi