import json
import os
import sys
from functools import partial
from pathlib import Path

from gerrychain import Graph, MarkovChain, Partition, accept
from gerrychain.constraints import UpperBound, within_percent_of_ideal_population
from gerrychain.constraints.compactness import L1_reciprocal_polsby_popper
from gerrychain.proposals import recom
from gerrychain.tree import bipartition_tree
from gerrychain.updaters import Tally, cut_edges
from gerrychain.metrics import polsby_popper

# ── Shared helpers ────────────────────────────────────────────────────────
_SHARED = Path(__file__).resolve().parents[2] / "shared"
sys.path.insert(0, str(_SHARED))

from chain_metrics import (  # noqa: E402
    district_minority_pct,
    effective_count,
    opp_count,
    plan_metrics,
    seat_count,
)
from io_utils import ensure_dir  # noqa: E402


def load_config(path):
    with open(path, "r") as f:
        return json.load(f)


def district_effectiveness_record(part, dist, group_key, thr, party):
    pop = part["population"][dist]
    minority = part["min_{}".format(group_key)][dist]
    pct = 0.0 if pop <= 0 else float(minority) / float(pop)

    dem = part["dem"][dist] if "dem" in part.updaters else None
    rep = part["rep"][dist] if "rep" in part.updaters else None

    winner = None
    if dem is not None and rep is not None:
        winner = "D" if dem > rep else "R"

    effective = (pct >= thr) and (winner == party if party is not None else True)

    return {
        "district": int(dist) if str(dist).isdigit() else str(dist),
        "group_key": group_key,
        "minority_population": minority,
        "total_population": pop,
        "minority_pct": pct,
        "threshold": thr,
        "party_of_choice": party,
        "dem_votes": dem,
        "rep_votes": rep,
        "winner": winner,
        "effectiveness_score": 1 if effective else 0,
        "is_effective": effective,
    }


# ── Interesting-plan helpers ──────────────────────────────────────────────

def _matches_criterion(value, op_dict):
    """
    Check a single metric value against an operator dict.
    Supported keys: eq, gte, gt, lte, lt.
    All specified operators must be satisfied.
    """
    if value is None:
        return False
    ops = {
        "eq":  lambda v, t: v == t,
        "gte": lambda v, t: v >= t,
        "gt":  lambda v, t: v > t,
        "lte": lambda v, t: v <= t,
        "lt":  lambda v, t: v < t,
    }
    for op, target in op_dict.items():
        if op not in ops or not ops[op](value, target):
            return False
    return True


def _plan_matches_criteria(metrics, criteria):
    """
    Return True if all criteria fields in the dict match metrics.
    Each criteria value is either a literal (equality check) or an
    operator dict like {"gte": 3}.
    """
    for field, spec in criteria.items():
        val = metrics.get(field)
        if isinstance(spec, dict):
            if not _matches_criterion(val, spec):
                return False
        else:
            if val != spec:
                return False
    return True


def save_interesting_plan(outdir, plan_def, step, metrics, part):
    """Write a single interesting plan record to disk."""
    plan_id = plan_def["id"]
    outpath = os.path.join(outdir, "interesting_plan_{}.json".format(plan_id))
    assignment = {
        n: (int(d) if str(d).isdigit() else str(d))
        for n, d in part.assignment.items()
    }
    record = {
        "plan_id": plan_id,
        "description": plan_def.get("description", ""),
        "step": step,
        "metrics": metrics,
        "assignment": assignment,
    }
    with open(outpath, "w") as f:
        json.dump(record, f)
    print("[interesting] Saved '{}' at step {} → {}".format(plan_id, step, outpath))


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
        "polsby_popper": polsby_popper,
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

    # ---------------- box/whisker analysis groups ----------------
    boxwhisker_group_keys = cfg.get("boxwhisker_group_keys", [])
    boxwhisker_thresholds = cfg.get("boxwhisker_thresholds", {})
    boxwhisker_parties = cfg.get("boxwhisker_parties_of_choice", {})

    if not boxwhisker_group_keys:
        legacy_group = cfg.get("boxwhisker_group_key")
        if legacy_group is not None:
            boxwhisker_group_keys = [legacy_group]
            boxwhisker_thresholds = {
                legacy_group: cfg.get("boxwhisker_threshold")
            }
            boxwhisker_parties = {
                legacy_group: cfg.get("boxwhisker_party_of_choice")
            }

    if vra_enabled and group_key is not None and group_key not in boxwhisker_group_keys:
        boxwhisker_group_keys.append(group_key)

    for gk in boxwhisker_group_keys:
        updater_name = "min_{}".format(gk)
        if updater_name not in updaters:
            updaters[updater_name] = Tally(gk, alias=updater_name)

    initial = Partition(G, assignment=assignment_col, updaters=updaters)

    pop_constraint = within_percent_of_ideal_population(initial, eps, pop_key="population")
    initial_l1 = L1_reciprocal_polsby_popper(initial)
    compactness_bound = UpperBound(L1_reciprocal_polsby_popper, 1.5 * initial_l1)
    constraints = [pop_constraint, compactness_bound]

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

        boxwhisker_thresholds[group_key] = chosen_thr
        boxwhisker_parties[group_key] = chosen_party if eff_enabled else boxwhisker_parties.get(group_key)

        if mode == "test":
            msg = "[VRA] group={} thr={} opp_K={}".format(group_key, chosen_thr, target_k_opp)
            if eff_enabled:
                msg += " eff_party={} eff_K={}".format(chosen_party, target_k_eff)
            print(msg)

    # ---------------- interesting plan targets ----------------
    interesting_defs = cfg.get("interesting_plans", [])
    # Track which targets have been found: id -> True once saved
    interesting_found = {d["id"]: False for d in interesting_defs}

    # ---------------- chain ----------------
    ideal_pop = sum(initial["population"].values()) / num_districts

    proposal = partial(
        recom,
        pop_col=pop_col,
        pop_target=ideal_pop,
        epsilon=eps,
        node_repeats=3,
        method=partial(
            bipartition_tree,
            max_attempts=5000,
            allow_pair_reselection=True,
        ),
    )

    chain = MarkovChain(
        proposal=proposal,
        constraints=constraints,
        accept=accept.always_accept,
        initial_state=initial,
        total_steps=steps,
    )

    plans_path = os.path.join(outdir, "plans_{}.jsonl".format(mode))
    summary_path = os.path.join(outdir, "summary_{}.json".format(mode))
    box_path = os.path.join(outdir, "boxwhisker_raw_{}.jsonl".format(mode))
    district_eff_path = os.path.join(outdir, "district_effectiveness_{}.jsonl".format(mode))
    district_eff_written = 0
    box_written = 0
    plans_written = 0
    seat_splits = {}

    opp_hist = {}
    eff_hist = {}
    cut_hist = {}

    save_first_n = int(cfg.get("save_assignments_first_n", 10))
    save_every = int(cfg.get("save_assignments_every", 0))

    with open(plans_path, "w") as fout, \
     open(box_path, "w") as fbox, \
     open(district_eff_path, "w") as feff:
        for i, part in enumerate(chain):
            rec = {"step": i}

            metrics_group = None
            metrics_thr = None
            metrics_party = None

            if vra_enabled and group_key is not None:
                metrics_group = group_key
                metrics_thr = chosen_thr
                metrics_party = chosen_party
            elif boxwhisker_group_keys:
                metrics_group = boxwhisker_group_keys[0]
                metrics_thr = boxwhisker_thresholds.get(metrics_group)
                metrics_party = boxwhisker_parties.get(metrics_group)

            metrics = plan_metrics(
                part,
                group_key=metrics_group,
                thr=metrics_thr,
                party=metrics_party,
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

            # ---- box/whisker raw data for every configured group ----
            dists = sorted(part.parts.keys(), key=lambda x: int(x) if str(x).isdigit() else str(x))

            for bw_group in boxwhisker_group_keys:
                district_pcts_sorted = sorted(
                    district_minority_pct(part, d, bw_group) for d in dists
                )

                fbox.write(json.dumps({
                    "step": i,
                    "group_key": bw_group,
                    "threshold": boxwhisker_thresholds.get(bw_group),
                    "party_of_choice": boxwhisker_parties.get(bw_group),
                    "district_pcts_sorted": district_pcts_sorted
                }) + "\n")
                box_written += 1

            # ---- per-district effectiveness records ----
            for bw_group in boxwhisker_group_keys:
                bw_threshold = boxwhisker_thresholds.get(bw_group)
                bw_party = boxwhisker_parties.get(bw_group)

                if bw_threshold is None:
                    continue

                for d in dists:
                    eff_rec = district_effectiveness_record(
                        part,
                        d,
                        bw_group,
                        bw_threshold,
                        bw_party,
                    )
                    eff_rec["step"] = i
                    feff.write(json.dumps(eff_rec) + "\n")
                    district_eff_written += 1

            fout.write(json.dumps(rec) + "\n")
            plans_written += 1

            # ---- check interesting plan criteria ----
            step_metrics = dict(metrics)
            step_metrics["step"] = i

            for plan_def in interesting_defs:
                pid = plan_def["id"]
                criteria = plan_def.get("criteria", {})
                if _plan_matches_criteria(step_metrics, criteria):
                    # Always overwrite — keeps the LAST matching plan in the chain
                    # so the saved plan comes from as far into the run as possible,
                    # producing more natural-looking district shapes.
                    save_interesting_plan(outdir, plan_def, i, step_metrics, part)
                    interesting_found[pid] = True

    # Report any targets not found
    for plan_def in interesting_defs:
        if not interesting_found[plan_def["id"]]:
            print("[interesting] WARNING: '{}' was never found in {} steps.".format(
                plan_def["id"], steps
            ))

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
        "analysis": {
            "boxwhisker_group_keys": boxwhisker_group_keys,
            "boxwhisker_thresholds": boxwhisker_thresholds,
            "boxwhisker_parties_of_choice": boxwhisker_parties,
        },
        "cut_edges_hist": cut_hist,
        "interesting_plans": {
            pid: interesting_found[pid] for pid in interesting_found
        },
    }
    summary["boxwhisker_raw_file"] = box_path
    summary["boxwhisker_plans_written"] = box_written
    summary["district_effectiveness_file"] = district_eff_path
    summary["district_effectiveness_rows_written"] = district_eff_written

    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print("Wrote:", plans_path)
    print("Wrote:", summary_path)


if __name__ == "__main__":
    main()
