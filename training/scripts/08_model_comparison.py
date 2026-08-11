"""
08_model_comparison.py
======================
Aggregate the per-model test-set evaluation results (written by
07_evaluate_models.py) into a single comparison artifact set:

    - model_comparison.csv
    - model_comparison.json
    - model_comparison.md

This script only reads the evaluation JSONs produced by 07; it does NOT
re-run any inference, so it is safe to run once both models are evaluated.
"""
import os
import sys
import json
import csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

REPORT_DIR = common.REPORT_DIR
EVAL_PATH = os.path.join(REPORT_DIR, "eval_results.json")

# Keys that go into the summary table (numeric, single-value per model)
SUMMARY_KEYS = [
    "top1_accuracy", "top3_accuracy", "top5_accuracy",
    "macro_precision", "macro_recall", "macro_f1",
    "weighted_precision", "weighted_recall", "weighted_f1",
    "inference_total_s", "inference_per_image_ms",
    "total_parameters", "trainable_parameters", "model_size_mb",
]


def load_eval():
    if not os.path.exists(EVAL_PATH):
        print(f"FATAL: {EVAL_PATH} not found. Run 07_evaluate_models.py first.")
        sys.exit(1)
    with open(EVAL_PATH, encoding="utf-8") as f:
        return json.load(f)


def make_summary_rows(results):
    rows = []
    for model, r in results.items():
        row = {"model": model}
        for k in SUMMARY_KEYS:
            v = r.get(k, "")
            if isinstance(v, float):
                v = round(v, 4)
            row[k] = v
        rows.append(row)
    return rows


def make_md(summary_rows, results, class_names):
    lines = []
    lines.append("# Model Comparison (Test Set)")
    lines.append("")
    lines.append(f"Evaluated on the untouched test set. Classes: **{len(class_names)}**")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| Model | Top-1 Acc | Top-3 Acc | Top-5 Acc | Macro F1 | Weighted F1 | Test n |")
    lines.append("|-------|-----------|-----------|-----------|----------|-------------|--------|")
    for r in summary_rows:
        m = results[r["model"]]
        lines.append(
            f"| {r['model']} | {r['top1_accuracy']} | {r['top3_accuracy']} | "
            f"{r['top5_accuracy']} | {r['macro_f1']} | {r['weighted_f1']} | {m.get('n_test','')} |"
        )
    lines.append("")
    if len(summary_rows) >= 2:
        best_top1 = max(summary_rows, key=lambda r: float(r["top1_accuracy"]))
        best_f1 = max(summary_rows, key=lambda r: float(r["macro_f1"]))
        lines.append("## Objective note (reporting only; final selection in Phase 10)")
        lines.append("")
        lines.append(f"- Highest test Top-1 accuracy: **{best_top1['model']}** ({best_top1['top1_accuracy']})")
        lines.append(f"- Highest macro F1: **{best_f1['model']}** ({best_f1['macro_f1']})")
        lines.append("")
        lines.append("Model selection must also consider calibration, per-class performance, "
                     "inference speed, model size and unknown-image rejection (Phases 9-12).")
    return "\n".join(lines)


def per_class_md(results, class_names):
    lines = ["## Per-class F1 (macro basis)", "", "| Class | " + " | ".join(results.keys()) + " |",
             "|-------|" + "|".join(["---"] * len(results)) + "|"]
    for cls in class_names:
        cells = []
        for r in results.values():
            pc = r.get("per_class", {})
            v = pc.get(cls, {}).get("f1", "") if pc else ""
            cells.append(str(v))
        lines.append(f"| {cls} | " + " | ".join(cells) + " |")
    return lines


def md_link(path):
    return os.path.relpath(path, common.ROOT)


def main():
    results = load_eval()
    class_names = common.get_class_names()
    summary_rows = make_summary_rows(results)

    # CSV
    csv_path = os.path.join(REPORT_DIR, "model_comparison.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["model"] + SUMMARY_KEYS)
        w.writeheader()
        for r in summary_rows:
            w.writerow(r)

    # Per-class CSV
    pc_path = os.path.join(REPORT_DIR, "model_comparison_per_class.csv")
    with open(pc_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["class"] + [f"{m}_precision" for m in results] +
                   [f"{m}_recall" for m in results] + [f"{m}_f1" for m in results] +
                   [f"{m}_accuracy" for m in results])
        for cls in class_names:
            row = [cls]
            for m, r in results.items():
                pc = r.get("per_class", {}).get(cls, {})
                row += [pc.get("precision", ""), pc.get("recall", ""), pc.get("f1", ""), pc.get("accuracy", "")]
            w.writerow(row)

    # JSON
    json_path = os.path.join(REPORT_DIR, "model_comparison.json")
    common.save_json(results, json_path)

    # MD
    md_path = os.path.join(REPORT_DIR, "model_comparison.md")
    md = make_md(summary_rows, results, class_names)
    md += "\n" + "\n".join(per_class_md(results, class_names)) + "\n"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)

    print("=" * 60)
    print("MODEL COMPARISON AGGREGATED")
    print("=" * 60)
    for r in summary_rows:
        print(f"  {r['model']:<18} top1={r['top1_accuracy']} top3={r['top3_accuracy']} "
              f"top5={r['top5_accuracy']} macroF1={r['macro_f1']}")
    print(f"  CSV  : {md_link(csv_path)}")
    print(f"  JSON : {md_link(json_path)}")
    print(f"  MD   : {md_link(md_path)}")





if __name__ == "__main__":
    main()
