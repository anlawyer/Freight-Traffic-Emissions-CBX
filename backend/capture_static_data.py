
import requests
import json
import os

BASE_URL = "http://localhost:8000"
OUTPUT_DIR = "../frontend/public/static_api"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_json(filename, data):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {filename}")

def main():
    # 0. Baseline & GeoJSON
    print("Fetching Baseline...")
    try:
        r = requests.get(f"{BASE_URL}/baseline")
        r.raise_for_status()
        save_json("baseline.json", r.json())
    except Exception as e:
        print(f"Skipping baseline (maybe not implemented?): {e}")

    print("Fetching Soundview GeoJSON...")
    try:
        r = requests.get(f"{BASE_URL}/geojson/soundview")
        r.raise_for_status()
        save_json("soundview.geojson", r.json())
    except Exception as e:
        print(f"Skipping geojson (maybe not implemented?): {e}")

    # Simulate (Legacy/Simple)
    print("Fetching Simulation (tax=44)...")
    try:
        r = requests.post(f"{BASE_URL}/simulate", json={"tax_amount": 44})
        r.raise_for_status()
        save_json("simulation.json", r.json())
    except Exception as e:
        print(f"Skipping simulation: {e}")

    # 1. Technical Docs
    print("Fetching Technical Docs...")
    r = requests.get(f"{BASE_URL}/analytics/technical-docs")
    r.raise_for_status()
    save_json("technical_docs.json", r.json())

    # 2. Model Info
    print("Fetching Model Info...")
    r = requests.get(f"{BASE_URL}/model/info")
    r.raise_for_status()
    save_json("model_info.json", r.json())

    # 3. Current Traffic
    print("Fetching Current Traffic...")
    r = requests.get(f"{BASE_URL}/traffic/current")
    r.raise_for_status()
    save_json("current_traffic.json", r.json())

    # 4. Predictions (50mph)
    print("Fetching Prediction (50mph)...")
    payload_50 = {"speed_limit_scenario": "current_50mph", "prediction_hours": 24}
    r = requests.post(f"{BASE_URL}/traffic/predict", json=payload_50)
    r.raise_for_status()
    pred_50 = r.json()
    save_json("prediction_50.json", pred_50)

    # 5. Predictions (60mph)
    print("Fetching Prediction (60mph)...")
    payload_60 = {"speed_limit_scenario": "optimized_60mph", "prediction_hours": 24}
    r = requests.post(f"{BASE_URL}/traffic/predict", json=payload_60)
    r.raise_for_status()
    pred_60 = r.json()
    save_json("prediction_60.json", pred_60)

    # 6. HMM Prediction (using 50mph speeds)
    print("Fetching HMM Prediction...")
    predicted_speeds = pred_50["predicted_speeds"]
    hmm_payload = {
        "predicted_speeds": predicted_speeds,
        "prediction_hours": 24,
        "baseline_pm25": 13.2
    }
    r = requests.post(f"{BASE_URL}/analytics/hmm/predict", json=hmm_payload)
    r.raise_for_status()
    save_json("hmm_prediction.json", r.json())

    # 7. Monte Carlo (tax=44)
    print("Fetching Monte Carlo (tax=44)...")
    mc_payload = {"tax_amount": 44, "num_iterations": 10000}
    r = requests.post(f"{BASE_URL}/analytics/monte-carlo", json=mc_payload)
    r.raise_for_status()
    save_json("monte_carlo.json", r.json())

    print("Success! All static data captured.")

if __name__ == "__main__":
    main()
