import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]

RXC_FILE = ROOT / "AL_data" / "ei_AL_rxc_full.json"
OUT = ROOT / "AL_data" / "ei_AL_party_of_choice.json"


def main():
    data = json.loads(RXC_FILE.read_text())
    groups = data["groups"]

    results = {}

    for group_name, group_data in groups.items():
        if group_name == "Unaccounted":
            continue

        dem_draws = np.array(group_data["posterior_sample_preview"]["dem"], dtype=float)

        mean_support = float(np.mean(dem_draws))
        confidence = float(np.mean(dem_draws > 0.5))
        party = "D" if mean_support > 0.5 else "R"

        results[group_name] = {
            "mean_support_dem": mean_support,
            "party_of_choice": party,
            "confidence": confidence,
        }

    OUT.write_text(json.dumps(results, indent=2))
    print("Saved:", OUT)
    for group, r in results.items():
        print(f"  {group}: party_of_choice={r['party_of_choice']}  mean_dem={r['mean_support_dem']:.3f}  confidence={r['confidence']:.3f}")


if __name__ == "__main__":
    main()
