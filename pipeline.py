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
6. generate_effectiveness      — Build AL/OR-effectiveness.json from seawulf plans
7. compute_boxwhisker          — Compute box-and-whisker percentile data from JSONL plans
8. generate_seat_vote_curves   — Compute seat–vote curves from ensemble plans
9. gingles_regression          — Fit Gingles non-linear regression curves
10. ei_rxc_al                  — Run RxC ecological inference for Alabama (MCMC, slow)
11. ei_rxc_or                  — Run RxC ecological inference for Oregon (MCMC, slow)
12. export_*                   — Export all JSON payloads for the backend (10 scripts)

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
import importlib.util
from pathlib import Path

# Ensure sub-packages are importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "preprocessing"))
sys.path.insert(0, str(ROOT / "analytics"))

# ── Stage definitions ─────────────────────────────────────────────────────
# Stages can be either:
#   ("label", "dotted.module.path")   — imported via importlib.import_module
#   ("label", Path(...))              — loaded from file via spec_from_file_location

SEAWULF = ROOT / "seawulf_runs"

PREPROCESSING_STAGES = [
    ("assign_enacted_districts",    "preprocessing.assign_enacted_districts"),
    ("mergingData",                 "preprocessing.mergingData"),
    ("precinctGraph",               "preprocessing.precinctGraph"),
    ("validate_and_save_baseline",  "preprocessing.validate_and_save_baseline_summary"),
    ("attach_baseline_with_geojson","preprocessing.attach_baseline_with_geojson"),
]

ANALYTICS_STAGES = [
    ("generate_effectiveness",           "analytics.generate_effectiveness_json"),
    ("extract_interesting_plans",        "analytics.extract_interesting_plans"),
    ("generate_plan_geojson",            "analytics.generate_plan_geojson"),
    ("compute_boxwhisker",               "analytics.compute_boxwhisker"),
    ("generate_seat_vote_curves",        "analytics.generate_seat_vote_curves"),
    ("gingles_regression",               "analytics.gingles_regression"),
    ("ei_rxc_al",                        SEAWULF / "AL/scripts/run_ei_statewide_rxc_al.py"),
    ("ei_rxc_or",                        SEAWULF / "OR/scripts/run_ei_statewide_rxc_or.py"),
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
    """Import *module_path* and call its ``main()`` function.

    *module_path* may be a dotted module string (e.g. ``"analytics.foo"``)
    or a :class:`pathlib.Path` pointing directly to a ``.py`` script file.
    """
    import importlib
    print(f"\n{'='*60}")
    print(f"  STAGE: {label}")
    print(f"{'='*60}")
    if isinstance(module_path, Path):
        spec = importlib.util.spec_from_file_location(label, module_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    else:
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
