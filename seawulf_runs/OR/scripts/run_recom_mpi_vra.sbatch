#!/bin/bash
#SBATCH -p debug-28core
#SBATCH -N 4
#SBATCH --ntasks=4
#SBATCH -c 28
#SBATCH -t 00:30:00
#SBATCH -J OR_RECOM_VRA
#SBATCH -A class_cse416
#SBATCH -o /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/recom_final_vra_%j.out
#SBATCH -e /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR/logs/recom_final_vra_%j.err

module purge
module load anaconda/3-new
source /gpfs/software/Anaconda/etc/profile.d/conda.sh
conda activate cse416-gis-py311

cd /gpfs/home/jayeung/projects/CSE416/seawulf_runs/OR

which python
python --version
python -c "import gerrychain, geopandas; print('imports ok')"

mpirun -np 4 python -u scripts/run_recom_mpi.py input/config_vra.json final