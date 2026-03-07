import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]

FILES = {
    "Black": ROOT / "AL_data" / "ei_AL_black_2x2.json",
    "Latino": ROOT / "AL_data" / "ei_AL_latino_2x2.json",
    "White": ROOT / "AL_data" / "ei_AL_white_2x2.json",
    "Asian": ROOT / "AL_data" / "ei_AL_white_2x2.json",
    "Other": ROOT / "AL_data" / "ei_AL_white_2x2.json"
}

OUT = ROOT / "AL_data/ei_AL_party_of_choice.json"

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