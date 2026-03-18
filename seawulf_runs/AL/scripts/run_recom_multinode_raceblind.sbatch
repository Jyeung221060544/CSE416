#!/bin/bash
#SBATCH --job-name=multi_test
#SBATCH --partition=medium-28core
#SBATCH --nodes=2
#SBATCH --ntasks=2
#SBATCH --cpus-per-task=1
#SBATCH --time=00:05:00
#SBATCH --output=multi_test_%j.out
#SBATCH --error=multi_test_%j.err

srun hostname