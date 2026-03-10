import json
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent

CONFIGS = [
    {
        "state": "AL",
        "graph_path": ROOT / "AL_data" / "AL_graph.json",
        "plans_path": ROOT / "cse416_seawulf_results" / "AL_output_raceblind" / "plans_final.jsonl",
        "output_path": ROOT / "AL_data" / "AL_seat_vote_curve.json",
    },
    {
        "state": "OR",
        "graph_path": ROOT / "OR_data" / "OR_graph.json",
        "plans_path": ROOT / "cse416_seawulf_results" / "OR_output_raceblind" / "plans_final.jsonl",
        "output_path": ROOT / "OR_data" / "OR_seat_vote_curve.json",
    },
]

MIN_SWING = -0.30
MAX_SWING = 0.30
STEP = 0.025


def load_graph_votes(graph_path: Path):
    with open(graph_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "nodes" not in data:
        raise ValueError(f"{graph_path} is missing 'nodes'.")

    precinct_votes = {}

    for node in data["nodes"]:
        node_id = node.get("id")
        if node_id is None:
            continue

        dem = node.get("votes_dem")
        rep = node.get("votes_rep")
        if dem is None or rep is None:
            continue

        precinct_votes[str(node_id)] = {
            "dem": float(dem),
            "rep": float(rep),
        }

    if not precinct_votes:
        raise ValueError(f"No precinct vote data found in {graph_path}.")

    return precinct_votes


def iter_saved_plans(plans_path: Path):
    with open(plans_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue

            rec = json.loads(line)
            assignment = rec.get("assignment")
            if assignment:
                yield {
                    "step": rec.get("step"),
                    "assignment": {str(k): str(v) for k, v in assignment.items()},
                }


def apply_uniform_swing(dem: float, rep: float, swing: float):
    total = dem + rep
    if total <= 0:
        return 0.0, 0.0

    dem_share = dem / total
    new_dem_share = max(0.0, min(1.0, dem_share + swing))
    new_dem = new_dem_share * total
    new_rep = total - new_dem
    return new_dem, new_rep


def make_swings(min_swing: float, max_swing: float, step: float):
    swings = []
    x = min_swing
    while x <= max_swing + 1e-12:
        swings.append(round(x, 6))
        x += step
    return swings


def compute_plan_curve(plan_assignment, precinct_votes, swings):
    district_votes = {}
    matched_precincts = 0
    missing_assignments = 0

    for precinct_id, votes in precinct_votes.items():
        district = plan_assignment.get(precinct_id)
        if district is None:
            missing_assignments += 1
            continue

        matched_precincts += 1
        if district not in district_votes:
            district_votes[district] = {"dem": 0.0, "rep": 0.0}

        district_votes[district]["dem"] += votes["dem"]
        district_votes[district]["rep"] += votes["rep"]

    if matched_precincts == 0:
        raise ValueError("Plan assignment matched zero precinct IDs.")

    total_seats = len(district_votes)
    results = []

    for swing in swings:
        swung_state_dem = 0.0
        swung_state_rep = 0.0
        dem_seats = 0

        for dv in district_votes.values():
            new_dem, new_rep = apply_uniform_swing(dv["dem"], dv["rep"], swing)
            swung_state_dem += new_dem
            swung_state_rep += new_rep
            if new_dem > new_rep:
                dem_seats += 1

        state_total = swung_state_dem + swung_state_rep
        vote_share = 0.0 if state_total <= 0 else swung_state_dem / state_total
        seat_share = 0.0 if total_seats <= 0 else dem_seats / total_seats

        results.append({
            "swing": swing,
            "vote_share": vote_share,
            "seat_share": seat_share,
            "dem_seats": dem_seats,
            "total_seats": total_seats,
        })

    return results, {
        "matched_precincts": matched_precincts,
        "missing_assignments": missing_assignments,
        "total_seats": total_seats,
    }


def build_seat_vote_curve_for_state(state_cfg):
    state = state_cfg["state"]
    graph_path = state_cfg["graph_path"]
    plans_path = state_cfg["plans_path"]
    output_path = state_cfg["output_path"]

    print(f"\nProcessing {state}...")
    print(f"Graph: {graph_path}")
    print(f"Plans: {plans_path}")

    precinct_votes = load_graph_votes(graph_path)
    saved_plans = list(iter_saved_plans(plans_path))
    swings = make_swings(MIN_SWING, MAX_SWING, STEP)

    if not saved_plans:
        raise ValueError(f"No saved assignments found in {plans_path}.")

    per_plan_curves = []
    diagnostics = []

    for idx, plan in enumerate(saved_plans):
        curve, diag = compute_plan_curve(plan["assignment"], precinct_votes, swings)
        per_plan_curves.append({
            "plan_index": idx,
            "step": plan.get("step"),
            "curve": curve,
        })
        diagnostics.append(diag)

    averaged_points = []
    for i, swing in enumerate(swings):
        vote_shares = [plan["curve"][i]["vote_share"] for plan in per_plan_curves]
        seat_shares = [plan["curve"][i]["seat_share"] for plan in per_plan_curves]
        dem_seats = [plan["curve"][i]["dem_seats"] for plan in per_plan_curves]
        total_seats_vals = [plan["curve"][i]["total_seats"] for plan in per_plan_curves]

        averaged_points.append({
            "swing": swing,
            "mean_vote_share": mean(vote_shares),
            "mean_seat_share": mean(seat_shares),
            "mean_dem_seats": mean(dem_seats),
            "total_seats": round(mean(total_seats_vals)),
        })

    output = {
        "state": state,
        "graph_file": str(graph_path),
        "plans_file": str(plans_path),
        "plans_used": len(per_plan_curves),
        "swing_method": "uniform partisan swing on district two-party vote shares",
        "swing_range": {
            "min": MIN_SWING,
            "max": MAX_SWING,
            "step": STEP,
        },
        "curve_points": averaged_points,
        "vote_share": [pt["mean_vote_share"] for pt in averaged_points],
        "seat_share": [pt["mean_seat_share"] for pt in averaged_points],
        "mean_dem_seats": [pt["mean_dem_seats"] for pt in averaged_points],
        "per_plan_curves": per_plan_curves,
        "diagnostics": {
            "avg_matched_precincts": mean(d["matched_precincts"] for d in diagnostics),
            "avg_missing_assignments": mean(d["missing_assignments"] for d in diagnostics),
            "district_counts_seen": sorted({d["total_seats"] for d in diagnostics}),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote: {output_path}")
    print(f"Plans used: {len(per_plan_curves)}")
    print(f"District counts seen: {output['diagnostics']['district_counts_seen']}")
    print(f"Avg missing assignments: {output['diagnostics']['avg_missing_assignments']}")


def main():
    for cfg in CONFIGS:
        build_seat_vote_curve_for_state(cfg)

    print("\nDone. Generated seat-vote curves for all states.")


if __name__ == "__main__":
    main()