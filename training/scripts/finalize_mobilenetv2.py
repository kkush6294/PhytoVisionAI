"""
finalize_mobilenetv2.py
=======================
One-time recovery script: MobileNetV2 training completed and saved
mobilenetv2_best.keras, but 05_train_mobilenetv2.py crashed at the final
reporting step (model loaded with compile=False and evaluate() called without
re-compiling). This script loads the trained model and generates the missing
reporting artifacts WITHOUT re-training:
    - config.json
    - history.json
    - class_mapping.json
    - environment.json
It also recomputes validation accuracy/loss on the untouched val split.
"""
import os
import sys
import time
import csv
import json
import datetime

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import optimizers
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

MODEL_NAME = "mobilenetv2"
OUT_DIR = os.path.join(common.MODEL_DIR, MODEL_NAME)
BEST_MODEL_PATH = os.path.join(OUT_DIR, "mobilenetv2_best.keras")
HISTORY_PATH = os.path.join(OUT_DIR, "history.json")
CONFIG_PATH = os.path.join(OUT_DIR, "config.json")
CLASS_MAP_PATH = os.path.join(OUT_DIR, "class_mapping.json")
ENV_PATH = os.path.join(OUT_DIR, "environment.json")


def read_csv_history(csv_path):
    """Read the training_log.csv into a dict of epoch-scoped lists."""
    out = {}
    if not os.path.exists(csv_path):
        return out
    with open(csv_path, encoding="utf-8") as f:
        rd = csv.DictReader(f)
        cols = rd.fieldnames or []
        for c in cols:
            out[c] = []
        for row in rd:
            for c in cols:
                try:
                    out[c].append(float(row[c]))
                except (TypeError, ValueError):
                    out[c].append(row[c])
    return out


def main():
    if not os.path.exists(BEST_MODEL_PATH):
        print(f"FATAL: model not found at {BEST_MODEL_PATH}")
        sys.exit(1)

    class_names = common.get_class_names()
    num_classes = len(class_names)
    class_map = {i: c for i, c in enumerate(class_names)}

    # Fixed split (reuse existing, idempotent)
    class_names2, counts = common.create_fixed_split()

    # Load model (compile=False) then compile for deterministic val eval.
    best = keras.models.load_model(BEST_MODEL_PATH, compile=False)
    best.compile(
        optimizer=optimizers.Adam(learning_rate=common.LR_FINE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    best_params, best_trainable = common.model_parameter_count(best)

    # Build val dataset (deterministic, mobilenet preprocessing)
    val_ds = common.build_dataset("val", class_names, mobilenet_preprocess, augment=False)

    # Eval on val (val is used for reporting only; test is used in 07)
    t0 = time.time()
    val_loss, val_acc = best.evaluate(val_ds, verbose=0)
    val_eval_s = round(time.time() - t0, 2)

    # History: reconstruct from training_log.csv
    log = read_csv_history(os.path.join(OUT_DIR, "training_log.csv"))
    history = {
        "stage1": {
            "loss": log.get("loss", []),
            "accuracy": log.get("accuracy", []),
            "val_loss": log.get("val_loss", []),
            "val_accuracy": log.get("val_accuracy", []),
        },
        "stage2": {
            "loss": log.get("loss", []),
            "accuracy": log.get("accuracy", []),
            "val_loss": log.get("val_loss", []),
            "val_accuracy": log.get("val_accuracy", []),
        },
        "val_accuracy_final": float(val_acc),
        "val_loss_final": float(val_loss),
        "note": "history reconstructed from training_log.csv (best-epoch restore).",
    }

    size_mb = common.model_file_size(BEST_MODEL_PATH)

    config = {
        "model": MODEL_NAME,
        "architecture": "MobileNetV2 (ImageNet, transfer learning)",
        "input_size": common.IMG_SIZE,
        "batch_size": common.BATCH_SIZE,
        "split_seed": common.SEED,
        "split_ratios": {"train": common.TRAIN_R, "val": common.VAL_R, "test": common.TEST_R},
        "epochs_stage1": common.EPOCHS_HEAD,
        "epochs_stage2": common.EPOCHS_FINE,
        "lr_stage1": common.LR_HEAD,
        "lr_stage2": common.LR_FINE,
        "early_stopping_patience": common.PATIENCE,
        "reduce_lr_patience": common.REDUCE_PATIENCE,
        "class_weight": "inverse frequency",
        "preprocessing": "mobilenet_v2.preprocess_input",
        "augmentation": "flip_h, rotation0.2, zoom0.15, translate0.1, brightness0.15, contrast0.1",
        "num_classes": num_classes,
        "total_params": best_params,
        "trainable_params": best_trainable,
        "frozen_layers_stage1": None,
        "fine_tuned_base_layers": 40,
        "best_model_path": BEST_MODEL_PATH,
        "model_file_size_mb": round(size_mb, 2),
        "training_time_s": None,  # not recorded during crashed run
        "training_date": datetime.datetime.now().isoformat(),
        "val_accuracy": float(val_acc),
        "val_loss": float(val_loss),
        "val_eval_time_s": val_eval_s,
        "recovered": True,
    }

    common.save_json(history, HISTORY_PATH)
    common.save_json(class_map, CLASS_MAP_PATH)
    common.save_json(config, CONFIG_PATH)

    env = common.record_environment({
        "model": MODEL_NAME,
        "dataset_version": "final_30class_5382",
        "split_counts": counts,
    })
    common.save_json(env, ENV_PATH)

    print("=" * 70)
    print("MOBILENETV2 FINALIZE (recovered artifacts)")
    print("=" * 70)
    print(f"  Classes           : {num_classes}")
    print(f"  Val accuracy      : {val_acc:.4f}")
    print(f"  Val loss          : {val_loss:.4f}")
    print(f"  Total params      : {best_params:,}")
    print(f"  Trainable params  : {best_trainable:,}")
    print(f"  Model file        : {size_mb:.2f} MB")
    print(f"  Config            : {CONFIG_PATH}")
    print(f"  History           : {HISTORY_PATH}")
    print(f"  Class mapping     : {CLASS_MAP_PATH}")
    print(f"  Environment       : {ENV_PATH}")
    print("NOTE: test set untouched - evaluated in 07_evaluate_models.py")


if __name__ == "__main__":
    main()

