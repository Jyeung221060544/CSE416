"""
pipeline.py
===========
Top-level orchestrator for the CSE416 redistricting data preprocessing pipeline.

Run this script once (after BASE_FILES are in place) to produce all data files
needed by the Spring Boot backend. Each stage corresponds to one activity box
in the UML activity diagram and calls the `main()` function of its module.

Stages
------
1. assign_enacted_districts   — Spatial join: precinct → enacted congressional district
2. mergingData                — Merge VAP census, RUCA region type, and income data
3. precinctGraph              — Build precinct adjacency graph (GerryChain-compatible JSON)
4. validate_and_save_baseline — Validate graphs; save enacted-plan baseline summaries
5. attach_baseline_with_geojson — Attach baseline stats to official district GeoJSONs

Analytics (run after seawulf ensemble is generated):
6. compute_boxwhisker         — Compute box-and-whisker percentile data from JSONL plans
7. generate_seat_vote_curves  — Compute seat–vote curves from ensemble plans
8. gingles_regression         — Fit Gingles non-linear regression curves
9. export_*                   — Export all JSON payloads for the backend (10 scripts)

Usage
-----
Run the full pipeline:
    python pipeline.py

Run a single named stage:
    python pipeline.py assign_enacted_districts
    python pipeline.py analytics

The seawulf ensemble generation (run on Seawulf HPC) is NOT part of this script.
See seawulf_runs/AL/scripts/ and seawulf_runs/OR/scripts/ for those runners.
"""

import sys
from pathlib import Path

# Ensure sub-packages are importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "preprocessing"))
sys.path.insert(0, str(ROOT / "analytics"))

# ── Stage definitions ─────────────────────────────────────────────────────

PREPROCESSING_STAGES = [
    ("assign_enacted_districts",    "preprocessing.assign_enacted_districts"),
    ("mergingData",                 "preprocessing.mergingData"),
    ("precinctGraph",               "preprocessing.precinctGraph"),
    ("validate_and_save_baseline",  "preprocessing.validate_and_save_baseline_summary"),
    ("attach_baseline_with_geojson","preprocessing.attach_baseline_with_geojson"),
]

ANALYTICS_STAGES = [
    ("compute_boxwhisker",               "analytics.compute_boxwhisker"),
    ("generate_seat_vote_curves",        "analytics.generate_seat_vote_curves"),
    ("gingles_regression",               "analytics.gingles_regression"),
    ("export_state_summary",             "analytics.export_state_summary_real_data"),
    ("export_district_summary",          "analytics.export_district_summary_real_data"),
    ("export_gingles_precinct",          "analytics.export_gingles_precinct_real_data"),
    ("export_ei",                        "analytics.export_ei_real_data"),
    ("export_ei_compare",                "analytics.export_ei_compare_real_data"),
    ("export_ensemble_summary",          "analytics.export_ensemble_summary_real_data"),
    ("export_boxwhisker",                "analytics.export_boxwhisker_real_data"),
    ("export_heatmap_census",            "analytics.export_heatmap_census_real_data"),
    ("export_heatmap_precinct",          "analytics.export_heatmap_precinct_real_data"),
    ("export_splits",                    "analytics.export_splits_real_data"),
    ("export_vote_seat_share",           "analytics.export_vote_seat_share_real_data"),
]

ALL_STAGES = PREPROCESSING_STAGES + ANALYTICS_STAGES


def run_stage(label, module_path):
    """Import *module_path* and call its ``main()`` function."""
    import importlib
    print(f"\n{'='*60}")
    print(f"  STAGE: {label}")
    print(f"{'='*60}")
    mod = importlib.import_module(module_path)
    mod.main()
    print(f"  ✓ {label} complete")


def run_all(stages):
    for label, module_path in stages:
        run_stage(label, module_path)
    print("\nPipeline complete.")


def main():
    if len(sys.argv) == 1:
        # Default: run full pipeline
        run_all(ALL_STAGES)
        return

    target = sys.argv[1].lower()

    if target == "preprocessing":
        run_all(PREPROCESSING_STAGES)
    elif target == "analytics":
        run_all(ANALYTICS_STAGES)
    else:
        # Run a single named stage
        matches = [(lbl, mod) for lbl, mod in ALL_STAGES if lbl.lower() == target.lower()]
        if not matches:
            print(f"Unknown stage: {target!r}")
            print("Available stages:")
            for lbl, _ in ALL_STAGES:
                print(f"  {lbl}")
            sys.exit(1)
        for lbl, mod in matches:
            run_stage(lbl, mod)


if __name__ == "__main__":
    main()
