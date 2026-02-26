import json
import os
import sys

from gerrychain import Graph, MarkovChain, Partition, accept
from gerrychain.updaters import Tally, cut_edges
from gerrychain.constraints import within_percent_of_ideal_population
from gerrychain.proposals import recom
from functools import partial

def load_config(path):
    with open(path, "r") as f:
        return json.load(f)

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def main():
    if len(sys.argv) < 3:
        print("Usage: python run_recom.py <config.json> <mode:test|final>")
        sys.exit(1)

    cfg_path = sys.argv[1]
    mode = sys.argv[2].lower()
    cfg = load_config(cfg_path)

    steps = cfg["steps_test"] if mode == "test" else cfg["steps_final"]
    outdir = cfg["output_dir"]
    ensure_dir(outdir)

    G = Graph.from_json(cfg["graph_path"])

    pop_col = cfg["pop_col"]
    assignment_col = cfg["assignment_col"]
    num_districts = int(cfg["num_districts"])
    eps = float(cfg["pop_tolerance"])

    updaters = {
        "population": Tally(pop_col, alias="population"),
        "cut_edges": cut_edges,
    }

    # Optional election tallies if present
    node0_attrs = next(iter(G.nodes(data=True)))[1]
    if "votes_dem" in node0_attrs:
        updaters["dem"] = Tally("votes_dem", alias="dem")
    if "votes_rep" in node0_attrs:
        updaters["rep"] = Tally("votes_rep", alias="rep")

    # VRA config + keys
    vra_cfg = cfg.get("vra", {})
    vra_enabled = vra_cfg.get("enabled", False)

    group_key = vra_cfg["group_key"] if vra_enabled else None
    chosen_thr = None
    chosen_party = None

    if vra_enabled:
        updaters[f"min_{group_key}"] = Tally(group_key, alias=f"min_{group_key}")

    initial = Partition(G, assignment=assignment_col, updaters=updaters)

    pop_constraint = within_percent_of_ideal_population(initial, eps, pop_key="population")
    constraints = [pop_constraint]

    def district_minority_pct(part, dist, group_key):
        pop = part["population"][dist]
        if pop <= 0:
            return 0.0
        m = part[f"min_{group_key}"][dist]
        return float(m) / float(pop)

    def opp_count(part, thr, group_key):
        return sum(
            1 for dist in part.parts
            if district_minority_pct(part, dist, group_key) >= thr
        )

    def effective_count(part, thr, group_key, party):
        # effective = opportunity + party-of-choice wins district (simple version)
        if ("dem" not in part.updaters) or ("rep" not in part.updaters):
            return 0

        c = 0
        for dist in part.parts:
            if district_minority_pct(part, dist, group_key) < thr:
                continue
            dem = part["dem"][dist]
            rep = part["rep"][dist]
            winner = "D" if dem > rep else "R"
            if winner == party:
                c += 1
        return c

    def seat_count(part):
        if ("dem" not in part.updaters) or ("rep" not in part.updaters):
            return None, None
        dem_seats = 0
        for dist in part.parts:
            if part["dem"][dist] > part["rep"][dist]:
                dem_seats += 1
        rep_seats = len(part.parts) - dem_seats
        return dem_seats, rep_seats

    def plan_metrics(part, *, vra_enabled, group_key=None, thr=None, party=None):
        dem_seats, rep_seats = seat_count(part)
        cut = len(part["cut_edges"]) if "cut_edges" in part.updaters else None

        metrics = {
            "dem_seats": dem_seats,
            "rep_seats": rep_seats,
            "cut_edges": cut,
        }

        if vra_enabled and group_key is not None and thr is not None:
            metrics["opp_districts"] = opp_count(part, thr, group_key)
            if party is not None:
                metrics["eff_districts"] = effective_count(part, thr, group_key, party)

        return metrics

    # ---------------- VRA constraints (if enabled) ----------------
    if vra_enabled:
        thresholds = vra_cfg.get("auto_thresholds", [0.50, 0.45, 0.40, 0.35, 0.30])

        enacted_opp = 0
        for thr in thresholds:
            k = opp_count(initial, float(thr), group_key)
            if k > 0:
                chosen_thr = float(thr)
                enacted_opp = k
                break
        if chosen_thr is None:
            chosen_thr = float(thresholds[-1])
            enacted_opp = opp_count(initial, chosen_thr, group_key)

        target_k_opp = vra_cfg.get("min_opportunity_districts")
        if target_k_opp is None:
            target_k_opp = enacted_opp

        def vra_opp_constraint(part):
            return opp_count(part, chosen_thr, group_key) >= int(target_k_opp)

        constraints.append(vra_opp_constraint)

        eff_cfg = vra_cfg.get("effectiveness", {})
        eff_enabled = eff_cfg.get("enabled", False)

        if eff_enabled:
            chosen_party = eff_cfg.get("party_of_choice", "D")
            enacted_eff = effective_count(initial, chosen_thr, group_key, chosen_party)

            target_k_eff = eff_cfg.get("min_effective_districts")
            if target_k_eff is None:
                target_k_eff = enacted_eff

            def vra_eff_constraint(part):
                return effective_count(part, chosen_thr, group_key, chosen_party) >= int(target_k_eff)

            constraints.append(vra_eff_constraint)

        if mode == "test":
            msg = f"[VRA] group={group_key} thr={chosen_thr} opp_K={target_k_opp}"
            if eff_enabled:
                msg += f" eff_party={chosen_party} eff_K={target_k_eff}"
            print(msg)

    # ---------------- chain ----------------
    ideal_pop = sum(initial["population"].values()) / num_districts

    proposal = partial(
        recom,
        pop_col=pop_col,
        pop_target=ideal_pop,
        epsilon=eps,
        node_repeats=3,
    )

    chain = MarkovChain(
        proposal=proposal,
        constraints=constraints,
        accept=accept.always_accept,
        initial_state=initial,
        total_steps=steps,
    )
    plans_path = os.path.join(outdir, f"plans_{mode}.jsonl")
    summary_path = os.path.join(outdir, f"summary_{mode}.json")

    plans_written = 0
    seat_splits = {}

    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    save_first_n = int(cfg.get("save_assignments_first_n", 10))
    save_every = int(cfg.get("save_assignments_every", 0))

    with open(plans_path, "w") as fout:
        for i, part in enumerate(chain):
            rec = {"step": i}

            metrics = plan_metrics(
                part,
                vra_enabled=vra_enabled,
                group_key=group_key if vra_enabled else None,
                thr=chosen_thr if vra_enabled else None,
                party=chosen_party if vra_enabled else None,
            )
            rec.update({k: v for k, v in metrics.items() if v is not None})

            # only sometimes store the full assignment
            store_assignment = (i < save_first_n) or (save_every and i % save_every == 0)
            if store_assignment:
                rec["assignment"] = {
                    n: (int(d) if str(d).isdigit() else str(d))
                    for n, d in part.assignment.items()
                }

            # histograms
            if metrics["dem_seats"] is not None:
                seat_splits[str(metrics["dem_seats"])] = seat_splits.get(str(metrics["dem_seats"]), 0) + 1

            if "opp_districts" in metrics:
                k = str(metrics["opp_districts"])
                opp_hist[k] = opp_hist.get(k, 0) + 1

            if "eff_districts" in metrics:
                k = str(metrics["eff_districts"])
                eff_hist[k] = eff_hist.get(k, 0) + 1

            if metrics.get("cut_edges") is not None:
                k = str(metrics["cut_edges"])
                cut_hist[k] = cut_hist.get(k, 0) + 1

            fout.write(json.dumps(rec) + "\n")
            plans_written += 1

    summary = {
        "state": cfg.get("state"),
        "mode": mode,
        "steps": steps,
        "pop_tolerance": eps,
        "plans_file": plans_path,
        "plans_written": plans_written,
        "seat_splits_dem_seats": seat_splits,
        "vra": {
            "enabled": vra_enabled,
            "group_key": group_key,
            "threshold": chosen_thr,
            "party_of_choice": chosen_party,
            "opp_hist": opp_hist,
            "eff_hist": eff_hist,
        },
        "cut_edges_hist": cut_hist,
    }

    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print("Wrote:", plans_path)
    print("Wrote:", summary_path)

if __name__ == "__main__":
    main()