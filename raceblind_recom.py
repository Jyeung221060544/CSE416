import json
import random
from pathlib import Path
from functools import partial

from gerrychain import Graph, Partition, MarkovChain, accept
from gerrychain.updaters import Tally, cut_edges
from gerrychain.proposals import recom
from gerrychain.constraints import within_percent_of_ideal_population

# -----------------------------
# Config (edit STATE: AL or OR)
# -----------------------------
STATE = "AL"
GRAPH_PATH = f"{STATE}_data/{STATE}_graph.json"
OUT_JSONL = f"{STATE}_data/{STATE}_raceblind_stats.jsonl"


N_STEPS = 500          # start with 200-500 locally; scale up on SeaWulf
EPSILON = 0.035
SEED = 416

POP_COL = "VAP"
ASSIGN_COL = "enacted_cd"   # your baseline assignment
N_DISTRICTS = 6 if STATE == "OR" else 7 if STATE == "AL" else 0

# Election columns
DEM_COL = "votes_dem"
REP_COL = "votes_rep"


def seats_dem(part):
    """Count Dem seats under simple plurality using votes_dem vs votes_rep."""
    s = 0
    for d in part.parts.keys():
        if part["dem"][d] > part["rep"][d]:
            s += 1
    return s


def main():
    random.seed(SEED)

    # 1) Load graph
    G = Graph.from_json(GRAPH_PATH)

    # 2) Updaters: population + election tallies + cut edges proxy for compactness
    updaters = {
        "pop": Tally(POP_COL, alias="pop"),
        "dem": Tally(DEM_COL, alias="dem"),
        "rep": Tally(REP_COL, alias="rep"),
        "cut_edges": cut_edges,
    }

    # 3) Initial partition (enacted plan on precinct graph)
    initial_partition = Partition(G, assignment=ASSIGN_COL, updaters=updaters)

    # Sanity: compute ideal pop
    total_pop = sum(initial_partition["pop"].values())
    ideal_pop = total_pop / N_DISTRICTS

    pops = list(initial_partition["pop"].values())
    dev = max(abs(p - ideal_pop) / ideal_pop for p in pops)
    print("enacted pop min/max:", min(pops), max(pops))
    print("enacted max deviation:", dev)

    print(f"== {STATE} race-blind ReCom setup ==")
    print("nodes:", len(G.nodes))
    print("initial districts:", len(initial_partition.parts))
    print("total pop:", total_pop)
    print("ideal pop:", ideal_pop)

    # 4) Constraint: population within EPSILON of ideal
    pop_constraint = within_percent_of_ideal_population(initial_partition, EPSILON, pop_key="pop")

    # 5) ReCom proposal
    proposal = partial(
        recom,
        pop_col=POP_COL,
        pop_target=ideal_pop,
        epsilon=EPSILON,
        node_repeats=2,
    )


    # 6) Markov chain
    chain = MarkovChain(
        proposal=proposal,
        constraints=[pop_constraint],
        accept=accept.always_accept,
        initial_state=initial_partition,
        total_steps=N_STEPS,
    )

    # 7) Output stats per plan
    out_path = Path(OUT_JSONL)
    out_path.parent.mkdir(parents=True, exist_ok=True)

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
                
            if step in {0, 100, 200, 300, 400}:
                plan = {str(n): int(part.assignment[n]) for n in part.graph.nodes}
                with open(f"{STATE}_data/{STATE}_raceblind_plan_{step}.json", "w") as pf:
                    json.dump(plan, pf)

    
    print("Saved:", OUT_JSONL)


if __name__ == "__main__":
    main()
