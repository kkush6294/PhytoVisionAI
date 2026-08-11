"""
09_generate_graphs.py
=====================
Generate publication-quality research figures (Phase 9) from:
  - training histories (training/models/<model>/history.json)
  - test-set evaluation results (reports/models/eval_results.json)

Outputs high-resolution PNG figures into research/figures/models/ and also
saves the raw data used for each figure as CSV in research/figures/models/data/.

Graphs produced:
  1. training_accuracy.png        : train accuracy vs epoch (both models)
  2. validation_accuracy.png      : val accuracy vs epoch
  3. training_loss.png            : train loss vs epoch
  4. validation_loss.png          : val loss vs epoch
  5/6. confusion matrix (per model)
  7/8. per-class F1 (per model)
  9-12. accuracy/precision/recall/F1 comparison bar charts
  13. topk_comparison.png         : top-1/3/5
  14. params_comparison.png       : parameter count
  15. model_size_comparison.png   : file size MB
  16. inference_time_comparison.png
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

FIG_DIR = os.path.join(common.FIG_DIR)
DATA_DIR = os.path.join(FIG_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

MODELS = ["mobilenetv2", "efficientnetb0"]
STYLE = {"dpi": 200, "bbox_inches": "tight"}
plt.rcParams.update({"font.size": 9, "axes.titlesize": 11, "axes.labelsize": 10})


def load_history(model):
    p = os.path.join(common.MODEL_DIR, model, "history.json")
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_eval():
    p = os.path.join(common.REPORT_DIR, "eval_results.json")
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_data(rows, name):
    path = os.path.join(DATA_DIR, name)
    if rows and isinstance(rows[0], dict):
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    else:
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            for r in rows:
                w.writerow(r)
    return path


def plot_curves(metric, title, fname):
    plt.figure(figsize=(6, 4.5))
    rows = []
    for m in MODELS:
        h = load_history(m)
        if not h:
            continue
        # Combine stage1+stage2 series for the metric
        s1 = h.get("stage1", {}).get(metric, [])
        s2 = h.get("stage2", {}).get(metric, [])
        series = list(s1) + list(s2)
        if not series:
            continue
        epochs = list(range(1, len(series) + 1))
        plt.plot(epochs, series, label=m, marker=".")
        for e, v in zip(epochs, series):
            rows.append({"model": m, "epoch": e, metric: v})
    plt.xlabel("Epoch")
    plt.ylabel(metric.replace("_", " ").title())
    plt.title(title)
    plt.legend()
    plt.grid(alpha=0.3)
    save_data(rows, fname.replace(".png", ".csv"))
    plt.savefig(os.path.join(FIG_DIR, fname), **STYLE)
    plt.close()
    print(f"  saved {fname}")


def plot_confusion(model):
    ev = load_eval()
    if not ev or model not in ev:
        return
    cm = np.array(ev[model].get("confusion_matrix", []))
    if cm.size == 0:
        return
    class_names = common.get_class_names()
    plt.figure(figsize=(14, 12))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(label="Count")
    tick = range(len(class_names))
    plt.xticks(tick, class_names, rotation=90, fontsize=6)
    plt.yticks(tick, class_names, fontsize=6)
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, int(cm[i, j]), ha="center", va="center",
                     fontsize=5, color="white" if cm[i, j] > thresh else "black")
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.title(f"{model} Confusion Matrix (Test)")
    fname = f"{model}_confusion_matrix.png"
    cm_rows = []
    for i in range(len(class_names)):
        row = {"true_class": class_names[i]}
        for j in range(len(class_names)):
            row[class_names[j]] = int(cm[i, j])
        cm_rows.append(row)
    save_data(cm_rows, fname.replace(".png", ".csv"))
    plt.savefig(os.path.join(FIG_DIR, fname), **STYLE)
    plt.close()
    print(f"  saved {fname}")


def plot_per_class_f1(model):
    ev = load_eval()
    if not ev or model not in ev:
        return
    pc = ev[model].get("per_class", {})
    class_names = common.get_class_names()
    f1s = [pc.get(c, {}).get("f1", 0) for c in class_names]
    plt.figure(figsize=(12, 5))
    bars = plt.bar(range(len(class_names)), f1s, color="steelblue")
    plt.xticks(range(len(class_names)), class_names, rotation=90, fontsize=6)
    plt.ylim(0, 1.05)
    plt.ylabel("F1")
    plt.title(f"{model} Per-class F1 (Test)")
    for b, v in zip(bars, f1s):
        plt.text(b.get_x() + b.get_width() / 2, v + 0.01, f"{v:.2f}",
                 ha="center", va="bottom", fontsize=5)
    fname = f"{model}_per_class_f1.png"
    save_data([{"class": c, "f1": v} for c, v in zip(class_names, f1s)],
              fname.replace(".png", ".csv"))
    plt.savefig(os.path.join(FIG_DIR, fname), **STYLE)
    plt.close()
    print(f"  saved {fname}")


def plot_bar(metric, title, fname, ylabel=None):
    ev = load_eval()
    if not ev:
        return
    vals = [ev.get(m, {}).get(metric, 0) for m in MODELS]
    plt.figure(figsize=(5, 4))
    bars = plt.bar(MODELS, vals, color=["#4C72B0", "#DD8452"])
    for b, v in zip(bars, vals):
        plt.text(b.get_x() + b.get_width() / 2, v + (max(vals) * 0.01), f"{v:.3f}",
                 ha="center", va="bottom", fontsize=8)
    plt.ylabel(ylabel or metric.replace("_", " ").title())
    plt.title(title)
    plt.ylim(0, max(vals) * 1.15)
    save_data([{"model": m, metric: v} for m, v in zip(MODELS, vals)],
              fname.replace(".png", ".csv"))
    plt.savefig(os.path.join(FIG_DIR, fname), **STYLE)
    plt.close()
    print(f"  saved {fname}")


def plot_topk():
    ev = load_eval()
    if not ev:
        return
    ks = ["top1_accuracy", "top3_accuracy", "top5_accuracy"]
    labels = ["Top-1", "Top-3", "Top-5"]
    x = np.arange(len(labels))
    w = 0.35
    plt.figure(figsize=(6, 4.5))
    for i, m in enumerate(MODELS):
        vals = [ev.get(m, {}).get(k, 0) for k in ks]
        plt.bar(x + (i - 0.5) * w, vals, w, label=m)
    plt.xticks(x, labels)
    plt.ylabel("Accuracy")
    plt.ylim(0, 1.05)
    plt.title("Top-1 / Top-3 / Top-5 Accuracy")
    plt.legend()
    rows = []
    for m in MODELS:
        for k, lab in zip(ks, labels):
            rows.append({"model": m, "metric": lab, "value": ev.get(m, {}).get(k, 0)})
    save_data(rows, "topk_comparison.csv")
    plt.savefig(os.path.join(FIG_DIR, "topk_comparison.png"), **STYLE)
    plt.close()
    print("  saved topk_comparison.png")


def main():
    print("=" * 60)
    print("GENERATING RESEARCH GRAPHS")
    print("=" * 60)
    plot_curves("accuracy", "Training Accuracy", "training_accuracy.png")
    plot_curves("val_accuracy", "Validation Accuracy", "validation_accuracy.png")
    plot_curves("loss", "Training Loss", "training_loss.png")
    plot_curves("val_loss", "Validation Loss", "validation_loss.png")
    for m in MODELS:
        plot_confusion(m)
        plot_per_class_f1(m)
    plot_bar("top1_accuracy", "Test Accuracy Comparison", "accuracy_comparison.png", "Accuracy")
    plot_bar("macro_precision", "Test Macro Precision", "precision_comparison.png", "Precision")
    plot_bar("macro_recall", "Test Macro Recall", "recall_comparison.png", "Recall")
    plot_bar("macro_f1", "Test Macro F1", "f1_comparison.png", "Macro F1")
    plot_topk()
    plot_bar("total_parameters", "Model Parameter Comparison", "params_comparison.png", "Parameters")
    plot_bar("model_size_mb", "Model Size Comparison (MB)", "model_size_comparison.png", "MB")
    plot_bar("inference_per_image_ms", "Inference Time Comparison", "inference_time_comparison.png", "ms/image")
    print("=" * 60)
    print(f"Figures in {FIG_DIR}")
    print(f"Data CSVs in {DATA_DIR}")


if __name__ == "__main__":
    main()
