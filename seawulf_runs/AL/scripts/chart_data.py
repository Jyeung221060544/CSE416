import json

def load_summary(path):
    with open(path, "r") as f:
        return json.load(f)

def seats_to_label(dem_seats, num_districts):
    dem_seats = int(dem_seats)
    rep_seats = num_districts - dem_seats
    return f"R{rep_seats}/D{dem_seats}"

def build_split_bars(raceblind_summary_path, vra_summary_path, num_districts):
    rb = load_summary(raceblind_summary_path)
    vra = load_summary(vra_summary_path)

    rb_hist = {int(k): int(v) for k, v in rb.get("seat_splits_dem_seats", {}).items()}
    vra_hist = {int(k): int(v) for k, v in vra.get("seat_splits_dem_seats", {}).items()}

    all_dem_bins = sorted(set(rb_hist.keys()) | set(vra_hist.keys()))
    bars = []

    for d in all_dem_bins:
        bars.append({
            "split": seats_to_label(d, num_districts),
            "dem_seats": d,
            "raceblind_count": rb_hist.get(d, 0),
            "vra_count": vra_hist.get(d, 0),
        })

    # This is what your GUI bar chart can consume directly
    return {
        "state": rb.get("state") or vra.get("state"),
        "num_districts": num_districts,
        "bars": bars,
        "raceblind_total": sum(rb_hist.values()),
        "vra_total": sum(vra_hist.values()),
    }

data = build_split_bars(
    raceblind_summary_path="output_raceblind/summary_test_20260223_033556.json",
    vra_summary_path="output_vra/summary_test_20260223_033656.json",
    num_districts=7,
)

print(json.dumps(data, indent=2))