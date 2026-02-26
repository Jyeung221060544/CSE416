"""
raceblind_recom.py
==================
Runs a race-blind ReCom (Regional Compactness via Region Merging) Markov chain
over a precinct adjacency graph to generate an ensemble of redistricting plans.

Each step of the chain proposes a new partition by merging two adjacent
districts, constructing a spanning tree, and cutting it to create a new valid
split. No racial demographic constraints are applied — only population equality.

Per-step statistics (seats_dem, cut_edges, population bounds) are streamed to
a JSONL file. Full plan assignments are saved at configurable snapshot steps.

Usage (module-level __main__ block)
-------------------------------------
    python raceblind_recom.py

This runs the chain for both Alabama (7 districts) and Oregon (6 districts).

Dependencies: json, random, pathlib, functools, gerrychain
"""

import json
import random
from pathlib import Path
from functools import partial

from gerrychain import Graph, Partition, MarkovChain, accept
from gerrychain.updaters import Tally, cut_edges
from gerrychain.proposals import recom
from gerrychain.constraints import within_percent_of_ideal_population


def seats_dem(part):
    """
    Count the number of Democratic-won seats in a partition under simple
    plurality (votes_dem > votes_rep).

    Parameters
    ----------
    part : gerrychain.Partition
        Current partition with "dem" and "rep" tally updaters.

    Returns
    -------
    int
        Number of districts where Dem votes exceed Rep votes.
    """
    return sum(1 for d in part.parts.keys() if part["dem"][d] > part["rep"][d])


def run_raceblind_recom(
    state,
    n_steps=500,
    epsilon=0.035,
    seed=416,
    pop_col="VAP",
    assign_col="enacted_cd",
    dem_col="votes_dem",
    rep_col="votes_rep",
    node_repeats=2,
    save_plan_steps=(0, 100, 200, 300, 400),
    out_jsonl_path=None,
    graph_path=None,
):
    """
    Run a race-blind ReCom Markov chain and write per-step statistics to JSONL.
    Optionally saves full plan assignment JSONs at selected step indices.

    Parameters
    ----------
    state           : str        Two-letter state abbreviation ("AL" or "OR").
    n_steps         : int        Total number of Markov chain steps to run.
    epsilon         : float      Maximum allowable fractional population deviation
                                 from the ideal (e.g. 0.035 = ±3.5%).
    seed            : int        Random seed for reproducibility.
    pop_col         : str        Node attribute column for population.
    assign_col      : str        Node attribute column for the initial (enacted) assignment.
    dem_col         : str        Node attribute column for Democratic vote counts.
    rep_col         : str        Node attribute column for Republican vote counts.
    node_repeats    : int        Number of times each ReCom step re-samples a
                                 spanning tree node (GerryChain parameter).
    save_plan_steps : tuple/set  Steps at which to save the full assignment JSON.
    out_jsonl_path  : str|None   Output path for the JSONL stats file. Defaults
                                 to "{state}_data/{state}_raceblind_stats.jsonl".
    graph_path      : str|None   Path to the input graph JSON. Defaults to
                                 "{state}_data/{state}_graph.json".

    Returns
    -------
    str
        Path to the written JSONL stats file.
    """

    # Step 0: Resolve default file paths
    if graph_path is None:
        graph_path = f"{state}_data/{state}_graph.json"
    if out_jsonl_path is None:
        out_jsonl_path = f"{state}_data/{state}_raceblind_stats.jsonl"

    # Step 1: Determine district count by state
    n_districts = 6 if state == "OR" else 7 if state == "AL" else None
    if n_districts is None:
        raise ValueError(f"Unknown state '{state}'. Please provide AL or OR (or extend mapping).")

    random.seed(seed)

    # Step 2: Load graph
    G = Graph.from_json(graph_path)

    # Step 3: Define updaters — population + election tallies + cut-edge count
    updaters = {
        "pop": Tally(pop_col, alias="pop"),
        "dem": Tally(dem_col, alias="dem"),
        "rep": Tally(rep_col, alias="rep"),
        "cut_edges": cut_edges,
    }

    # Step 4: Build initial partition from the enacted plan
    initial_partition = Partition(G, assignment=assign_col, updaters=updaters)

    # Step 4a: Sanity — compute ideal pop and max deviation
    total_pop = sum(initial_partition["pop"].values())
    ideal_pop = total_pop / n_districts

    pops = list(initial_partition["pop"].values())
    dev = max(abs(p - ideal_pop) / ideal_pop for p in pops)

    print("enacted pop min/max:", min(pops), max(pops))
    print("enacted max deviation:", dev)
    print(f"== {state} race-blind ReCom setup ==")
    print("nodes:", len(G.nodes))
    print("initial districts:", len(initial_partition.parts))
    print("total pop:", total_pop)
    print("ideal pop:", ideal_pop)

    # Step 5: Population equality constraint
    pop_constraint = within_percent_of_ideal_population(
        initial_partition, epsilon, pop_key="pop"
    )

    # Step 6: ReCom proposal function (partial application of GerryChain's recom)
    proposal = partial(
        recom,
        pop_col=pop_col,
        pop_target=ideal_pop,
        epsilon=epsilon,
        node_repeats=node_repeats,
    )

    # Step 7: Construct the Markov chain
    chain = MarkovChain(
        proposal=proposal,
        constraints=[pop_constraint],
        accept=accept.always_accept,
        initial_state=initial_partition,
        total_steps=n_steps,
    )

    # Step 8: Prepare output path and step-snapshot set
    out_path = Path(out_jsonl_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    save_plan_steps_set = set(save_plan_steps) if save_plan_steps else set()

    # Step 9: Run chain, streaming stats to JSONL
    with out_path.open("w") as f:
        for step, part in enumerate(chain):
            # Step 9a: Collect per-step statistics
            record = {
                "step": step,
                "seats_dem": seats_dem(part),
                "cut_edges": len(part["cut_edges"]),
                "pop_total": int(sum(part["pop"].values())),
                "pop_min": int(min(part["pop"].values())),
                "pop_max": int(max(part["pop"].values())),
                "dem_total": int(sum(part["dem"].values())),
                "rep_total": int(sum(part["rep"].values())),
            }
            f.write(json.dumps(record) + "\n")

            # Step 9b: Periodic progress log
            if step % 50 == 0:
                print("step", step, "seats_dem", record["seats_dem"], "cut_edges", record["cut_edges"])
                num_changed = sum(
                    1 for n in part.graph.nodes
                    if part.assignment[n] != initial_partition.assignment[n]
                )
                print("\tchanged nodes vs enacted:", num_changed)

            # Step 9c: Save full assignment snapshot at designated steps
            if step in save_plan_steps_set:
                plan = {str(n): int(part.assignment[n]) for n in part.graph.nodes}
                plan_path = f"{state}_data/{state}_raceblind_plan_{step}.json"
                with open(plan_path, "w") as pf:
                    json.dump(plan, pf)

    print("Saved:", out_jsonl_path)
    return out_jsonl_path


# ── Script entry ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Step 0: Run race-blind ReCom for Alabama
    run_raceblind_recom("AL")
    # Step 1: Run race-blind ReCom for Oregon
    run_raceblind_recom("OR")
