#!/bin/bash
#SBATCH -p debug-28core
#SBATCH -N 4
#SBATCH --ntasks=4
#SBATCH -c 28
#SBATCH -t 00:30:00
#SBATCH -J OR_MPI_VRA
#SBATCH -A class_cse416
#SBATCH -o /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/output_vra_mpi_%j.out
#SBATCH -e /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/output_vra_mpi_%j.err

module purge
module load anaconda/3-new
module load mvapich2/gcc12.1/2.3.7
source /gpfs/software/Anaconda/etc/profile.d/conda.sh
conda activate cse416-gis-py311

cd /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR

which python
python --version
python -c "import mpi4py, gerrychain, geopandas; print('imports ok')"

mkdir -p /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/output_vra_mpi

mpirun -np 2 python -u scripts/run_recom_mpi.py input/config_vra.json final /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/output_vra_mpi