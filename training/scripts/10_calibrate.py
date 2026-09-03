"""
10_calibrate.py
===============
Confidence calibration for BOTH trained models (Phase 11).

Methodological guarantees (per project requirements):
  - Temperature scaling is fitted on VALIDATION logits ONLY.
  - OOD / unknown-rejection threshold is fitted on the VALIDATION
    confidence distribution ONLY.
  - The untouched TEST set is used ONLY for final unbiased reporting
    (ECE, reliability, rejection behaviour) -- never for fitting.
  - No retraining, no dataset modification, no checkpoint modification.

Approach
--------
1. Generate validation predictions (y_true, y_proba) for each model by
   running inference on dataset/final_split/val (deterministic, using the
   architecture-specific preprocess_input exactly as during training).
2. Fit a single temperature T on validation logits by minimising the
   negative log-likelihood (NLL) of the validation set.
3. Compute Expected Calibration Error (ECE) on validation (fitting) and
   on test (unbiased reporting).
4. Fit an unknown/unsupported-image rejection threshold on the VALIDATION
   calibrated max-probability distribution. We use a conservative
   percentile of the correctly-classified validation samples so that
   low-confidence predictions are rejected. (No true OOD test set exists;
   this is documented as a limitation.)
5. Apply temperature to test predictions and report final calibrated
   ECE / reliability / rejection behaviour on the untouched test set.

Outputs (reports/models/calibration/):
  - calibration_results.json   : all numbers (T, ECE val/test, thresholds)
  - reliability_<model>.csv    : reliability-diagram bin data
  - confidence_<model>.csv     : per-sample calibrated confidence + label
  - reliability_<model>.png    : reliability diagram
  - confidence_hist_<model>.png: confidence distribution histogram
  - ece_comparison.png         : ECE bar chart (both models, val & test)
"""
import os
import sys
import json
import csv

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

from tensorflow import keras  # noqa: E402

MODELS = {
    "mobilenetv2": {"name": "mobilenetv2_best.keras", "preprocess": "mobilenet_v2"},
    "efficientnetb0": {"name": "efficientnetb0_best.keras", "preprocess": "efficientnet"},
}

CAL_DIR = os.path.join(common.REPORT_DIR, "calibration")
os.makedirs(CAL_DIR, exist_ok=True)

# Number of bins for ECE / reliability diagram
N_BINS = 10
# Percentile of correctly-classified validation calibrated confidence used
# to set the unknown/unsupported-image rejection threshold (conservative).
REJECT_PERCENTILE = 5.0


def get_preprocess(name):
    if name == "mobilenet_v2":
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        return preprocess_input
    from tensorflow.keras.applications.efficientnet import preprocess_input
    return preprocess_input


def generate_val_predictions(model, preprocess_fn, class_names):
    """Run inference on the validation split (deterministic, no training)."""
    val_ds = common.build_dataset("val", class_names, preprocess_fn, augment=False)
    y_true = []
    y_proba = []
    for imgs, labels in val_ds:
        probs = model.predict(imgs, verbose=0)
        y_proba.extend(probs)
        y_true.extend(labels.numpy().tolist())
    return np.array(y_true), np.array(y_proba)


def load_test_predictions(model_key):
    """Load the untouched test predictions saved by 07_evaluate_models.py."""
    p = os.path.join(common.REPORT_DIR, "test_predictions_" + model_key + ".npz")
    if not os.path.exists(p):
        return None
    d = np.load(p)
    return d["y_true"], d["y_proba"]


def temperature_scale(logits, T):
    """Apply temperature scaling to logits -> calibrated probabilities."""
    return np.exp(logits / T) / np.sum(np.exp(logits / T), axis=1, keepdims=True)


def nll_from_logits(logits, y_true, T):
    """Negative log-likelihood of the validation set under temperature T."""
    logits_T = logits / T
    log_probs = logits_T - np.log(np.sum(np.exp(logits_T), axis=1, keepdims=True))
    n = len(y_true)
    return -np.sum(log_probs[np.arange(n), y_true]) / n


def fit_temperature(logits, y_true):
    """Fit temperature T on validation logits by minimising NLL."""
    from scipy.optimize import minimize_scalar
    res = minimize_scalar(
        lambda T: nll_from_logits(logits, y_true, T),
        bounds=(0.1, 10.0),
        method="bounded",
    )
    return float(res.x)


def compute_ece(y_true, y_proba, n_bins=N_BINS):
    """Expected Calibration Error (adaptive binning on confidence)."""
    conf = np.max(y_proba, axis=1)
    pred = np.argmax(y_proba, axis=1)
    acc = (pred == y_true).astype(float)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    bin_data = []
    for i in range(n_bins):
        lo, hi = bin_edges[i], bin_edges[i + 1]
        mask = (conf >= lo) & (conf < hi)
        if i == n_bins - 1:
            mask = (conf >= lo) & (conf <= hi)
        if mask.sum() == 0:
            continue
        bin_conf = conf[mask].mean()
        bin_acc = acc[mask].mean()
        bin_count = int(mask.sum())
        ece += (bin_count / len(conf)) * abs(bin_acc - bin_conf)
        bin_data.append({
            "bin": i + 1,
            "bin_low": round(lo, 3),
            "bin_high": round(hi, 3),
            "count": bin_count,
            "avg_confidence": round(float(bin_conf), 4),
            "avg_accuracy": round(float(bin_acc), 4),
            "gap": round(float(abs(bin_acc - bin_conf)), 4),
        })
    return ece, bin_data


def fit_rejection_threshold(val_conf_correct):
    """
    Fit unknown/unsupported-image rejection threshold on VALIDATION data.
    Uses the REJECT_PERCENTILE of the calibrated max-probability of
    CORRECTLY-classified validation samples. Predictions below this
    threshold are considered 'unsupported / unknown'.
    """
    if len(val_conf_correct) == 0:
        return 0.0
    return float(np.percentile(val_conf_correct, REJECT_PERCENTILE))


def plot_reliability(bin_data, model, title):
    """Reliability diagram (calibrated)."""
    confs = [b["avg_confidence"] for b in bin_data]
    accs = [b["avg_accuracy"] for b in bin_data]
    counts = [b["count"] for b in bin_data]
    plt.figure(figsize=(6, 5))
    plt.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    if confs:
        plt.plot(confs, accs, "o-", color="#4C72B0", label="Model")
        ax2 = plt.gca().twinx()
        ax2.bar(confs, counts, alpha=0.15, color="gray", width=0.08)
        ax2.set_ylabel("Samples per bin")
    plt.xlabel("Confidence")
    plt.ylabel("Accuracy")
    plt.title(title)
    plt.legend(loc="upper left")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(CAL_DIR, f"reliability_{model}.png"), dpi=200, bbox_inches="tight")
    plt.close()


def plot_confidence_hist(conf, model, title):
    """Confidence distribution histogram."""
    plt.figure(figsize=(6, 4))
    if len(conf):
        plt.hist(conf, bins=20, range=(0, 1), color="#DD8452", alpha=0.8, edgecolor="white")
    plt.xlabel("Calibrated max-probability (confidence)")
    plt.ylabel("Count")
    plt.title(title)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(CAL_DIR, f"confidence_hist_{model}.png"), dpi=200, bbox_inches="tight")
    plt.close()


def plot_ece_comparison(results):
    """ECE bar chart (val & test for both models)."""
    models = list(results.keys())
    val_ece = [results[m]["ece_val"] for m in models]
    test_ece = [results[m]["ece_test"] for m in models]
    x = np.arange(len(models))
    w = 0.35
    plt.figure(figsize=(6, 4.5))
    plt.bar(x - w / 2, val_ece, w, label="Validation (fitting)", color="#4C72B0")
    plt.bar(x + w / 2, test_ece, w, label="Test (unbiased)", color="#DD8452")
    for i, (v, t) in enumerate(zip(val_ece, test_ece)):
        if v is not None:
            plt.text(i - w / 2, v + 0.001, f"{v:.4f}", ha="center", fontsize=8)
        if t is not None:
            plt.text(i + w / 2, t + 0.001, f"{t:.4f}", ha="center", fontsize=8)
    plt.xticks(x, models)
    plt.ylabel("ECE")
    plt.title("Expected Calibration Error (temperature-scaled)")
    plt.legend()
    plt.grid(alpha=0.3, axis="y")
    plt.tight_layout()
    plt.savefig(os.path.join(CAL_DIR, "ece_comparison.png"), dpi=200, bbox_inches="tight")
    plt.close()


def main():
    print("=" * 60)
    print("CONFIDENCE CALIBRATION (temperature scaling + OOD threshold)")
    print("=" * 60)
    class_names = common.get_class_names()
    results = {}

    for key, cfg in MODELS.items():
        model_path = os.path.join(common.MODEL_DIR, key, cfg["name"])
        if not os.path.exists(model_path):
            print(f"[SKIP] {key}: model not found at {model_path}")
            continue
        print(f"\n=== Calibrating {key} ===")
        model = keras.models.load_model(model_path, compile=False)
        preprocess_fn = get_preprocess(cfg["preprocess"])
        if model.output_shape[-1] != len(class_names):
            print(f"  [SKIP] {key}: model output size {model.output_shape[-1]} != dataset classes {len(class_names)}")
            continue

        # 1) Validation predictions (for fitting ONLY)
        val_y_true, val_y_proba = generate_val_predictions(model, preprocess_fn, class_names)
        print(f"  Validation samples: {len(val_y_true)}")

        # 2) Fit temperature on validation logits
        val_logits = np.log(np.clip(val_y_proba, 1e-12, 1.0))
        T = fit_temperature(val_logits, val_y_true)
        print(f"  Fitted temperature T = {T:.4f} (validation NLL minimised)")

        # 3) Calibrated validation probabilities
        val_cal = temperature_scale(val_logits, T)

        # 4) ECE on validation (fitting)
        ece_val, val_bins = compute_ece(val_y_true, val_cal)

        # 5) Fit OOD/unknown-rejection threshold on validation
        val_pred = np.argmax(val_cal, axis=1)
        val_conf = np.max(val_cal, axis=1)
        correct_mask = val_pred == val_y_true
        reject_threshold = fit_rejection_threshold(val_conf[correct_mask])
        print(f"  Rejection threshold (val {REJECT_PERCENTILE:.0f}th pct of correct): "
              f"{reject_threshold:.4f}")

        # 6) Apply temperature to TEST predictions (unbiased reporting)
        test_data = load_test_predictions(key)
        test_y_true = None
        test_cal = None
        ece_test = None
        test_bins = []
        if test_data is None:
            print(f"  [WARN] No test predictions for {key}; skipping test reporting")
        else:
            test_y_true, test_y_proba = test_data
            test_logits = np.log(np.clip(test_y_proba, 1e-12, 1.0))
            test_cal = temperature_scale(test_logits, T)
            ece_test, test_bins = compute_ece(test_y_true, test_cal)
            print(f"  Test ECE (unbiased) = {ece_test:.4f}")

        # 7) Rejection behaviour on test (reporting only)
        test_reject_rate = None
        test_known_acc = None
        if test_cal is not None:
            test_conf = np.max(test_cal, axis=1)
            test_pred = np.argmax(test_cal, axis=1)
            reject_mask = test_conf < reject_threshold
            test_reject_rate = float(reject_mask.mean())
            known_mask = ~reject_mask
            if known_mask.sum() > 0:
                test_known_acc = float((test_pred[known_mask] == test_y_true[known_mask]).mean())
            else:
                test_known_acc = None

        # 8) Save per-sample confidence CSV
        conf_csv = os.path.join(CAL_DIR, f"confidence_{key}.csv")
        with open(conf_csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["true_class", "pred_class", "calibrated_confidence", "correct"])
            if test_cal is not None:
                test_pred = np.argmax(test_cal, axis=1)
                test_conf = np.max(test_cal, axis=1)
                for i in range(len(test_y_true)):
                    w.writerow([
                        class_names[test_y_true[i]],
                        class_names[test_pred[i]],
                        round(float(test_conf[i]), 4),
                        int(test_pred[i] == test_y_true[i]),
                    ])

        # 9) Reliability diagram + confidence histogram (test, unbiased)
        if test_cal is not None:
            plot_reliability(test_bins, key, f"{key} Reliability Diagram (Test, T={T:.2f})")
            plot_confidence_hist(np.max(test_cal, axis=1), key,
                                 f"{key} Calibrated Confidence (Test)")

        # 10) Save reliability bin CSV
        rel_csv = os.path.join(CAL_DIR, f"reliability_{key}.csv")
        with open(rel_csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["bin", "bin_low", "bin_high", "count",
                                              "avg_confidence", "avg_accuracy", "gap"])
            w.writeheader()
            w.writerows(test_bins if test_cal is not None else val_bins)

        results[key] = {
            "temperature": round(T, 4),
            "n_val": int(len(val_y_true)),
            "ece_val": round(ece_val, 4),
            "ece_test": round(ece_test, 4) if ece_test is not None else None,
            "reject_threshold": round(reject_threshold, 4),
            "reject_percentile": REJECT_PERCENTILE,
            "test_reject_rate": round(test_reject_rate, 4) if test_reject_rate is not None else None,
            "test_known_accuracy": round(test_known_acc, 4) if test_known_acc is not None else None,
            "n_test": int(len(test_y_true)) if test_cal is not None else 0,
            "reliability_csv": os.path.relpath(rel_csv, common.ROOT),
            "confidence_csv": os.path.relpath(conf_csv, common.ROOT),
        }
        print(f"  Saved calibration artifacts for {key}")

    # 11) ECE comparison figure
    if len(results) >= 2:
        plot_ece_comparison(results)

    # 12) Save all results
    out_path = os.path.join(CAL_DIR, "calibration_results.json")
    common.save_json(results, out_path)
    print("\n" + "=" * 60)
    print("CALIBRATION COMPLETE")
    print("=" * 60)
    for key, r in results.items():
        print(f"  {key:<18} T={r['temperature']} ECE_val={r['ece_val']} "
              f"ECE_test={r['ece_test']} reject_thr={r['reject_threshold']} "
              f"test_reject={r['test_reject_rate']} known_acc={r['test_known_accuracy']}")
    print(f"  Results : {os.path.relpath(out_path, common.ROOT)}")
    print(f"  Figures : {os.path.relpath(CAL_DIR, common.ROOT)}")


if __name__ == "__main__":
    main()

