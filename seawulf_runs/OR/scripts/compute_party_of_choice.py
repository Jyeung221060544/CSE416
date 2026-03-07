import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]

FILES = {
    "Black": ROOT / "OR_data" / "ei_OR_black_2x2.json",
    "Latino": ROOT / "OR_data" / "ei_OR_latino_2x2.json",
    "White": ROOT / "OR_data" / "ei_OR_white_2x2.json",
    "Asian": ROOT / "OR_data" / "ei_OR_asian_2x2.json",
    "Other": ROOT / "OR_data" / "ei_OR_other_2x2.json"
}

OUT = ROOT / "OR_data/ei_OR_party_of_choice.json"

def load_samples(path):
    data = json.loads(path.read_text())
    return np.array(data["posterior_sample_preview"]["beta"])

def main():

    results = {}

    for group, path in FILES.items():

        beta = load_samples(path)

        mean_support = float(np.mean(beta))
        confidence = float(np.mean(beta > 0.5))

        party = "D" if mean_support > 0.5 else "R"

        results[group] = {
            "mean_support_dem": mean_support,
            "party_of_choice": party,
            "confidence": confidence
        }

    OUT.write_text(json.dumps(results, indent=2))
    print("Saved:", OUT)


if __name__ == "__main__":
    main()