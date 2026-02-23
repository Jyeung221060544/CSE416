import json
from gerrychain import Graph, Partition
from gerrychain.updaters import Tally


def build_enacted_boxwhisker(state):
    GRAPH_PATH = f"{state}_data/{state}_graph.json"
    OUT_JSON = f"{state}_data/{state}_enacted_boxwhisker.json"

    # Load graph
    G = Graph.from_json(GRAPH_PATH)

    # Updaters
    updaters = {
        "VAP": Tally("VAP"),
        "BLACK": Tally("NH_BLACK_ANY_VAP"),
        "LATINO": Tally("HVAP"),
        "WHITE": Tally("NH_WHITE_ANY_VAP"),
    }

    # Enacted partition
    part = Partition(G, assignment="enacted_cd", updaters=updaters)

    results = []

    for d in sorted(part.parts):
        vap = part["VAP"][d]
        record = {
            "district": int(d),
            "VAP": int(vap),
            "pct_black": part["BLACK"][d] / vap,
            "pct_latino": part["LATINO"][d] / vap,
            "pct_white": part["WHITE"][d] / vap,
            "pct_other": 1
                - (part["BLACK"][d] + part["LATINO"][d] + part["WHITE"][d]) / vap,
        }
        results.append(record)

    with open(OUT_JSON, "w") as f:
        json.dump(results, f, indent=2)

    print("Saved:", OUT_JSON)

build_enacted_boxwhisker("AL")
build_enacted_boxwhisker("OR")
