"""
validate_and_save_baseline_summary.py
======================================
Validates the precinct adjacency graphs and enacted district partitions for
Alabama and Oregon, then generates and saves enacted-plan baseline summaries
used as the reference point for ensemble comparison.

Script sections
---------------
1. Load AL and OR graphs from JSON and check for missing required node attributes.
2. Build enacted partitions using the VAP, votes_dem, and votes_rep tallies;
   print district counts and total population as sanity checks.
3. `save_enacted_baseline` — for each state, compute per-district stats
   (population, votes, winner, Dem share) and a state-level summary
   (total population, Dem seats, Rep seats), then write to two JSON paths
   (local data dir + seawulf input dir).

Dependencies: json, gerrychain
"""

import json
from gerrychain import Graph, Partition
from gerrychain.updaters import Tally

# ── Step 0: Load precinct adjacency graphs ────────────────────────────────
AL_graph = Graph.from_json("AL_data/AL_graph.json")
OR_graph = Graph.from_json("OR_data/OR_graph.json")

# ── Step 1: Required node attributes ─────────────────────────────────────
# These must be present on every precinct node for the chain and analytics
REQUIRED = ["VAP", "votes_dem", "votes_rep", "enacted_cd", "region_type"]


def check_graph_attrs(G, name):
    """
    Print a count of missing values for each required node attribute across
    all nodes in the graph. A value is considered missing if the key is absent
    or the value is None or an empty string.

    Parameters
    ----------
    G    : gerrychain.Graph  Precinct adjacency graph to validate.
    name : str               Label for the printed output.
    """
    # Step 0: Initialize missing counts for each required attribute
    missing = {k: 0 for k in REQUIRED}
    for _, data in G.nodes(data=True):
        for k in REQUIRED:
            if k not in data or data[k] in (None, ""):
                missing[k] += 1
    print(f"\n== {name} attr missing counts ==")
    print(missing)


# Step 2: Validate attribute completeness for both graphs
check_graph_attrs(AL_graph, "AL")
check_graph_attrs(OR_graph, "OR")

# ── Step 3: Build enacted partitions for QA ───────────────────────────────
updaters = {
    "pop": Tally("VAP", alias="pop"),
    "dem": Tally("votes_dem", alias="dem"),
    "rep": Tally("votes_rep", alias="rep"),
}

AL_part = Partition(AL_graph, assignment="enacted_cd", updaters=updaters)
OR_part = Partition(OR_graph, assignment="enacted_cd", updaters=updaters)

# Step 4: Print enacted partition QA
print("\n== Enacted partition QA ==")
print("AL districts:", len(AL_part.parts))
print("OR districts:", len(OR_part.parts))
print("AL total VAP:", sum(AL_part["pop"].values()))
print("OR total VAP:", sum(OR_part["pop"].values()))

# Step 5: Cross-check node-level VAP sums against partition tallies
print("AL nodes:", len(AL_graph.nodes), "AL VAP sum:", sum(d["VAP"] for _, d in AL_graph.nodes(data=True)))
print("OR nodes:", len(OR_graph.nodes), "OR VAP sum:", sum(d["VAP"] for _, d in OR_graph.nodes(data=True)))


# ── Step 6: Enacted baseline summary writer ───────────────────────────────

def save_enacted_baseline(graph_path, out_json, out_json2, num_districts):
    """
    Compute and save the enacted plan baseline summary for a state.

    For each district in the enacted partition, records:
    - population : Total VAP assigned to the district.
    - votes_dem  : Total Democratic votes in the district.
    - votes_rep  : Total Republican votes in the district.
    - winner     : "D" or "R" under simple plurality.
    - dem_share  : Dem share of the two-party vote (or None if no votes).

    The state-level summary includes total population, Dem seat count,
    and Rep seat count.

    Parameters
    ----------
    graph_path    : str  Path to the precinct adjacency graph JSON.
    out_json      : str  Primary output path for the baseline summary JSON.
    out_json2     : str  Secondary output path (e.g. seawulf input directory).
    num_districts : int  Expected number of congressional districts.
    """
    # Step 6a: Load graph and build updaters
    G = Graph.from_json(graph_path)

    updaters = {
        "pop": Tally("VAP"),
        "dem": Tally("votes_dem"),
        "rep": Tally("votes_rep"),
    }

    # Step 6b: Build enacted partition
    part = Partition(G, assignment="enacted_cd", updaters=updaters)

    districts = {}
    dem_seats = 0

    # Step 6c: Compute per-district stats
    for d, nodes in part.parts.items():
        pop = part["pop"][d]
        dem = part["dem"][d]
        rep = part["rep"][d]

        # Determine winner under simple plurality
        winner = "D" if dem > rep else "R"
        if winner == "D":
            dem_seats += 1

        districts[int(d)] = {
            "population": pop,
            "votes_dem": dem,
            "votes_rep": rep,
            "winner": winner,
            "dem_share": dem / (dem + rep) if (dem + rep) > 0 else None,
        }

    # Step 6d: Assemble state-level summary
    summary = {
        "num_districts": num_districts,
        "total_population": sum(part["pop"].values()),
        "dem_seats": dem_seats,
        "rep_seats": num_districts - dem_seats,
        "districts": districts,
    }

    # Step 6e: Write to both output paths
    with open(out_json, "w") as f:
        json.dump(summary, f, indent=2)
    with open(out_json2, "w") as f:
        json.dump(summary, f, indent=2)

    print("Saved baseline summary:", out_json)


# ── Step 7: Generate and save baselines for AL and OR ────────────────────
save_enacted_baseline(
    "AL_data/AL_graph.json",
    "AL_data/AL_enacted_baseline.json",
    "seawulf_runs/AL/input/AL_enacted_baseline.json",
    num_districts=7,
)
save_enacted_baseline(
    "OR_data/OR_graph.json",
    "OR_data/OR_enacted_baseline.json",
    "seawulf_runs/OR/input/OR_enacted_baseline.json",
    num_districts=6,
)
