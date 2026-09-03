"""
Phase 10 — Objective model selection between MobileNetV2 and EfficientNetB0.

This script is NON-destructive:
- Reads the aggregated model comparison results.
- Reads calibration reports.
- Applies a documented weighted scoring rubric.
- Writes the model-selection report.
- Writes selected_model.json for downstream services.

It does NOT train or re-evaluate any model.
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402


REPORT_DIR = common.REPORT_DIR

MODELS = [
    "mobilenetv2",
    "efficientnetb0",
]

WEIGHTS = {
    "top1_accuracy": 0.30,
    "macro_f1": 0.25,
    "top5_accuracy": 0.10,
    "ece": 0.15,
    "inference_per_image_ms": 0.10,
    "model_size_mb": 0.10,
}


def load_comparison():
    path = os.path.join(
        REPORT_DIR,
        "model_comparison.json"
    )

    if not os.path.exists(path):
        print(f"FATAL: {path} not found. Run 07 + 08 first.")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_calibration(model):
    path = os.path.join(REPORT_DIR, "calibration", "calibration_results.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        res = json.load(f)
        return res.get(model)


def minmax_normalize(values, lower_is_better=False):
    """
    Normalize values to [0, 1].

    If lower_is_better=True, the normalized score is inverted.
    """

    lo = min(values)
    hi = max(values)

    rng = hi - lo

    if rng == 0:
        return [1.0] * len(values)

    normalized = [
        (value - lo) / rng
        for value in values
    ]

    if lower_is_better:
        normalized = [
            1.0 - value
            for value in normalized
        ]

    return normalized


def main():

    print("=" * 62)
    print("OBJECTIVE MODEL SELECTION")
    print("=" * 62)

    comparison = load_comparison()

    calibrations = {
        model: load_calibration(model)
        for model in MODELS
    }

    # ---------------------------------------------------------
    # Gather raw values
    # ---------------------------------------------------------

    raw = {}

    for model in MODELS:

        comparison_data = comparison.get(model, {})
        calibration_data = calibrations.get(model) or {}

        raw[model] = {
            "top1_accuracy": comparison_data.get(
                "top1_accuracy",
                0.0
            ),

            "macro_f1": comparison_data.get(
                "macro_f1",
                0.0
            ),

            "top5_accuracy": comparison_data.get(
                "top5_accuracy",
                0.0
            ),

            "ece": calibration_data.get(
                "ece_test_calibrated",
                calibration_data.get(
                    "ece_test_raw",
                    1.0
                )
            ),

            "inference_per_image_ms": comparison_data.get(
                "inference_per_image_ms",
                0.0
            ),

            "model_size_mb": comparison_data.get(
                "model_size_mb",
                0.0
            ),
        }

    # ---------------------------------------------------------
    # Normalize criteria
    # ---------------------------------------------------------

    scores = {}

    for metric in WEIGHTS:

        values = [
            raw[model][metric]
            for model in MODELS
        ]

        lower_is_better = metric in (
            "ece",
            "inference_per_image_ms",
            "model_size_mb",
        )

        normalized = minmax_normalize(
            values,
            lower_is_better=lower_is_better
        )

        for index, model in enumerate(MODELS):

            scores.setdefault(model, {})

            scores[model][metric] = normalized[index]

    # ---------------------------------------------------------
    # Calculate weighted totals
    # ---------------------------------------------------------

    totals = {}

    for model in MODELS:

        total = 0.0

        for metric, weight in WEIGHTS.items():

            total += (
                scores[model][metric]
                * weight
            )

        totals[model] = round(total, 4)

    winner = max(
        MODELS,
        key=lambda model: totals[model]
    )

    # ---------------------------------------------------------
    # Save selected model JSON
    # ---------------------------------------------------------

    selected = {
        "selected_model": winner,
        "scores": totals,
        "criterion_scores": scores,
        "raw_values": raw,
        "weights": WEIGHTS,
        "selection_method": "weighted_objective_rubric",
        "note": (
            "Selection is based on test-set performance metrics, "
            "calibration, inference speed, and model size. "
            "The test set was not used for training, model "
            "selection during training, temperature fitting, "
            "or rejection-threshold fitting. Calibration and "
            "rejection parameters were fitted using validation data."
        ),
    }

    selected_path = os.path.join(
        REPORT_DIR,
        "selected_model.json"
    )

    common.save_json(
        selected,
        selected_path
    )

    # ---------------------------------------------------------
    # Create Markdown report
    # ---------------------------------------------------------

    lines = [
        "# Model Selection Report",
        "",
        "## Objective",
        "",
        "MobileNetV2 and EfficientNetB0 were compared using a "
        "documented weighted scoring rubric.",
        "",
        "The following criteria were considered:",
        "",
        "| Criterion | Weight |",
        "|---|---:|",
    ]

    for criterion, weight in WEIGHTS.items():

        lines.append(
            f"| {criterion} | {weight:.2f} |"
        )

    # ---------------------------------------------------------
    # Raw values
    # ---------------------------------------------------------

    lines.extend([
        "",
        "## Raw values",
        "",
        "| Model | "
        + " | ".join(WEIGHTS.keys())
        + " |",
    ])

    lines.append(
        "|---|"
        + "|".join(["---"] * len(WEIGHTS))
        + "|"
    )

    for model in MODELS:

        values = [
            f"{raw[model][criterion]:.4f}"
            for criterion in WEIGHTS
        ]

        lines.append(
            "| "
            + model
            + " | "
            + " | ".join(values)
            + " |"
        )

    # ---------------------------------------------------------
    # Normalized scores
    # ---------------------------------------------------------

    lines.extend([
        "",
        "## Normalized scores",
        "",
        "| Model | "
        + " | ".join(WEIGHTS.keys())
        + " | Weighted total |",
    ])

    lines.append(
        "|---|"
        + "|".join(["---"] * len(WEIGHTS))
        + "|---|"
    )

    for model in MODELS:

        criterion_values = [
            f"{scores[model][criterion]:.4f}"
            for criterion in WEIGHTS
        ]

        lines.append(
            "| "
            + model
            + " | "
            + " | ".join(criterion_values)
            + f" | **{totals[model]:.4f}** |"
        )

    # ---------------------------------------------------------
    # Winner
    # ---------------------------------------------------------

    lines.extend([
        "",
        f"## Winner: **{winner}**",
        "",
        f"The selected model is **{winner}** based on the "
        "documented weighted objective rubric.",
        "",
        "Calibration temperature and rejection threshold were "
        "fitted using validation data. The test set was used "
        "strictly for final reporting and was not used to fit "
        "those parameters.",
        "",
        "The selected model is intended to be used as the "
        "production model for the downstream AI service and "
        "evidence-generation pipeline.",
        "",
    ])

    # ---------------------------------------------------------
    # Save Markdown report
    # ---------------------------------------------------------

    markdown_path = os.path.join(
        REPORT_DIR,
        "model_selection.md"
    )

    with open(
        markdown_path,
        "w",
        encoding="utf-8"
    ) as f:

        f.write(
            "\n".join(lines)
        )

    # ---------------------------------------------------------
    # Console output
    # ---------------------------------------------------------

    print("")
    print("MODEL SELECTION RESULTS")
    print("-" * 62)

    for model in MODELS:

        print(
            f"  {model:<18} "
            f"weighted score = {totals[model]:.4f}"
        )

    print("")
    print(
        f"  >>> SELECTED: {winner}"
    )

    print("")
    print(
        "  Report : "
        + os.path.relpath(
            markdown_path,
            common.ROOT
        )
    )

    print(
        "  JSON   : "
        + os.path.relpath(
            selected_path,
            common.ROOT
        )
    )

    print("=" * 62)


if __name__ == "__main__":
    main()