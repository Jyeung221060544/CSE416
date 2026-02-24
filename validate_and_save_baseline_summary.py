import json
from gerrychain import Graph, Partition
from gerrychain.updaters import Tally

AL_graph = Graph.from_json("AL_data/AL_graph.json")
OR_graph = Graph.from_json("OR_data/OR_graph.json")

REQUIRED = ["VAP", "votes_dem", "votes_rep", "enacted_cd", "region_type"]

def check_graph_attrs(G, name):
    missing = {k: 0 for k in REQUIRED}
    for _, data in G.nodes(data=True):
        for k in REQUIRED:
            if k not in data or data[k] in (None, ""):
                missing[k] += 1
    print(f"\n== {name} attr missing counts ==")
    print(missing)

check_graph_attrs(AL_graph, "AL")
check_graph_attrs(OR_graph, "OR")

updaters = {
    "pop": Tally("VAP", alias="pop"),
    "dem": Tally("votes_dem", alias="dem"),
    "rep": Tally("votes_rep", alias="rep"),
}

AL_part = Partition(AL_graph, assignment="enacted_cd", updaters=updaters)
OR_part = Partition(OR_graph, assignment="enacted_cd", updaters=updaters)

print("\n== Enacted partition QA ==")
print("AL districts:", len(AL_part.parts))
print("OR districts:", len(OR_part.parts))
print("AL total VAP:", sum(AL_part["pop"].values()))
print("OR total VAP:", sum(OR_part["pop"].values()))

print("AL nodes:", len(AL_graph.nodes), "AL VAP sum:", sum(d["VAP"] for _, d in AL_graph.nodes(data=True)))
print("OR nodes:", len(OR_graph.nodes), "OR VAP sum:", sum(d["VAP"] for _, d in OR_graph.nodes(data=True)))

def save_enacted_baseline(graph_path, out_json, out_json2, num_districts):
    G = Graph.from_json(graph_path)

    updaters = {
        "pop": Tally("VAP"),
        "dem": Tally("votes_dem"),
        "rep": Tally("votes_rep"),
    }

    part = Partition(G, assignment="enacted_cd", updaters=updaters)

    districts = {}
    dem_seats = 0

    for d, nodes in part.parts.items():
        pop = part["pop"][d]
        dem = part["dem"][d]
        rep = part["rep"][d]

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

    summary = {
        "num_districts": num_districts,
        "total_population": sum(part["pop"].values()),
        "dem_seats": dem_seats,
        "rep_seats": num_districts - dem_seats,
        "districts": districts,
    }

    with open(out_json, "w") as f:
        json.dump(summary, f, indent=2)
    with open(out_json2, "w") as f:
        json.dump(summary, f, indent=2)

    print("Saved baseline summary:", out_json)

save_enacted_baseline("AL_data/AL_graph.json", "AL_data/AL_enacted_baseline.json", "seawulf_runs/AL/input/AL_enacted_baseline.json", num_districts=7)
save_enacted_baseline("OR_data/OR_graph.json", "OR_data/OR_enacted_baseline.json", "seawulf_runs/OR/input/OR_enacted_baseline.json", num_districts=6)

