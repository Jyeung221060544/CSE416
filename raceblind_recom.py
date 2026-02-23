import json
import random
from pathlib import Path
from functools import partial

from gerrychain import Graph, Partition, MarkovChain, accept
from gerrychain.updaters import Tally, cut_edges
from gerrychain.proposals import recom
from gerrychain.constraints import within_percent_of_ideal_population


def seats_dem(part):
    """Count Dem seats under simple plurality using votes_dem vs votes_rep."""
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
    Runs a race-blind ReCom Markov chain and writes per-step stats to JSONL.
    Also optionally saves full plan assignments at selected steps.
    """

    # Paths
    if graph_path is None:
        graph_path = f"{state}_data/{state}_graph.json"
    if out_jsonl_path is None:
        out_jsonl_path = f"{state}_data/{state}_raceblind_stats.jsonl"

    # District count (kept consistent with your script)
    n_districts = 6 if state == "OR" else 7 if state == "AL" else None
    if n_districts is None:
        raise ValueError(f"Unknown state '{state}'. Please provide AL or OR (or extend mapping).")

    random.seed(seed)

    # 1) Load graph
    G = Graph.from_json(graph_path)

    # 2) Updaters: population + election tallies + cut edges proxy for compactness
    updaters = {
        "pop": Tally(pop_col, alias="pop"),
        "dem": Tally(dem_col, alias="dem"),
        "rep": Tally(rep_col, alias="rep"),
        "cut_edges": cut_edges,
    }

    # 3) Initial partition (enacted plan on precinct graph)
    initial_partition = Partition(G, assignment=assign_col, updaters=updaters)

    # Sanity: compute ideal pop
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

    # 4) Constraint: population within EPSILON of ideal
    pop_constraint = within_percent_of_ideal_population(
        initial_partition, epsilon, pop_key="pop"
    )

    # 5) ReCom proposal
    proposal = partial(
        recom,
        pop_col=pop_col,
        pop_target=ideal_pop,
        epsilon=epsilon,
        node_repeats=node_repeats,
    )

    # 6) Markov chain
    chain = MarkovChain(
        proposal=proposal,
        constraints=[pop_constraint],
        accept=accept.always_accept,
        initial_state=initial_partition,
        total_steps=n_steps,
    )

    # 7) Output stats per plan
    out_path = Path(out_jsonl_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    save_plan_steps_set = set(save_plan_steps) if save_plan_steps else set()

    with out_path.open("w") as f:
        for step, part in enumerate(chain):
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

            if step % 50 == 0:
                print("step", step, "seats_dem", record["seats_dem"], "cut_edges", record["cut_edges"])
                num_changed = sum(
                    1 for n in part.graph.nodes
                    if part.assignment[n] != initial_partition.assignment[n]
                )
                print("\tchanged nodes vs enacted:", num_changed)

            if step in save_plan_steps_set:
                plan = {str(n): int(part.assignment[n]) for n in part.graph.nodes}
                plan_path = f"{state}_data/{state}_raceblind_plan_{step}.json"
                with open(plan_path, "w") as pf:
                    json.dump(plan, pf)

    print("Saved:", out_jsonl_path)
    return out_jsonl_path


# Example usage:
if __name__ == "__main__":
    run_raceblind_recom("AL")
    run_raceblind_recom("OR")