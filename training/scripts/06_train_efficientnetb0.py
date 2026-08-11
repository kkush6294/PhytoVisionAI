"""
06_train_efficientnetb0.py
==========================
Train EfficientNetB0 (transfer learning) on the fixed 30-class final dataset.

Controlled experiment with MobileNetV2 (05_train_mobilenetv2.py):
  - Same fixed split (70/15/15, seed=42) via common.py
  - Same physical split directories (dataset/final_split/)
  - Same augmentation policy, class weighting, callbacks
  - Architecture-specific official preprocessing (efficientnet.preprocess_input)

Two-stage transfer learning:
  Stage 1: frozen ImageNet base + new classification head
  Stage 2: fine-tune upper base layers at lower LR

The TEST set is NEVER used here (no checkpoint selection, no tuning).
Best model is selected by VALIDATION accuracy via ModelCheckpoint.
"""
import os
import sys
import json
import time
import datetime

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, optimizers, callbacks
from tensorflow.keras.applications.efficientnet import (
    EfficientNetB0, preprocess_input as efficientnet_preprocess,
)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MODEL_NAME = "efficientnetb0"
OUT_DIR = os.path.join(common.MODEL_DIR, MODEL_NAME)
os.makedirs(OUT_DIR, exist_ok=True)
BEST_MODEL_PATH = os.path.join(OUT_DIR, "efficientnetb0_best.keras")
HISTORY_PATH = os.path.join(OUT_DIR, "history.json")
CONFIG_PATH = os.path.join(OUT_DIR, "config.json")
CLASS_MAP_PATH = os.path.join(OUT_DIR, "class_mapping.json")
ENV_PATH = os.path.join(OUT_DIR, "environment.json")


def build_model(num_classes):
    """EfficientNetB0 transfer-learning model (224x224, 30 classes)."""
    base = EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(common.IMG_SIZE, common.IMG_SIZE, 3),
        pooling="avg",
    )
    base.trainable = False  # frozen for stage 1

    inputs = keras.Input(shape=(common.IMG_SIZE, common.IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="classifier")(x)
    model = keras.Model(inputs, outputs)
    return model, base


def main():
    common.set_seeds(common.SEED)
    t_total0 = time.time()

    # 1) Fixed split (identical for both models)
    print("=" * 70)
    print("EFFICIENTNETB0 CONTROLLED EXPERIMENT")
    print("=" * 70)
    class_names, counts = common.create_fixed_split()
    num_classes = len(class_names)
    print(f"Classes ({num_classes}): {class_names}")

    # 2) Leakage verification (MD5)
    print("\n[5/7] Verifying MD5 leakage across splits...")
    ok, overlaps = common.verify_leakage()
    print(f"  Leakage-NONE: {ok}  |  overlaps: {len(overlaps)}")
    if not ok:
        print("FATAL: leakage detected. Aborting.")
        sys.exit(1)

    # 3) Split counts summary
    for split in ("train", "val", "test"):
        total_s = sum(counts[split].values())
        print(f"  {split:>6}: {total_s} images")

    # 4) Class weights (inverse frequency, same as MobileNetV2)
    class_weight = common.compute_class_weights("train", class_names)

    # 5) Datasets (architecture-specific preprocessing)
    train_ds = common.build_dataset("train", class_names, efficientnet_preprocess, augment=True)
    val_ds = common.build_dataset("val", class_names, efficientnet_preprocess, augment=False)
    test_ds = common.build_dataset("test", class_names, efficientnet_preprocess, augment=False)

    # 6) Build model
    print("\n[6/7] Building EfficientNetB0 transfer-learning model...")
    model, base = build_model(num_classes)
    total_params, _ = common.model_parameter_count(model)
    print(f"  Total params (stage start): {total_params:,}")

    callbacks_list = [
        callbacks.EarlyStopping(
            monitor="val_loss", patience=common.PATIENCE,
            restore_best_weights=True, verbose=1),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=common.REDUCE_PATIENCE,
            min_lr=1e-7, verbose=1),
        callbacks.ModelCheckpoint(
            BEST_MODEL_PATH, monitor="val_accuracy", save_best_only=True, verbose=1),
        callbacks.CSVLogger(os.path.join(OUT_DIR, "training_log.csv")),
    ]

    # ---- STAGE 1: train head (base frozen) ----
    print("\n[STAGE 1] Training classification head (base frozen)...")
    model.compile(
        optimizer=optimizers.Adam(learning_rate=common.LR_HEAD),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    h1 = model.fit(
        train_ds, validation_data=val_ds,
        epochs=common.EPOCHS_HEAD, callbacks=callbacks_list,
        class_weight=class_weight, verbose=1,
    )

    # ---- STAGE 2: fine-tune upper layers ----
    print("\n[STAGE 2] Fine-tuning upper layers...")
    base.trainable = True
    # Freeze early layers, fine-tune last 40 base layers (EfficientNetB0)
    for layer in base.layers[:-40]:
        layer.trainable = False
    model.compile(
        optimizer=optimizers.Adam(learning_rate=common.LR_FINE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    h2 = model.fit(
        train_ds, validation_data=val_ds,
        epochs=common.EPOCHS_FINE, callbacks=callbacks_list,
        class_weight=class_weight, verbose=1,
    )

    # Load best model (by val accuracy) and compile for evaluation
    best = keras.models.load_model(BEST_MODEL_PATH, compile=False)
    best.compile(
        optimizer=optimizers.Adam(learning_rate=common.LR_FINE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    best_params, best_trainable = common.model_parameter_count(best)

    # ---- VALIDATION metrics (for reporting; test handled separately) ----
    val_loss, val_acc = best.evaluate(val_ds, verbose=0)

    history = {
        "stage1": h1.history,
        "stage2": h2.history,
        "val_accuracy_final": float(val_acc),
        "val_loss_final": float(val_loss),
    }

    # ---- Save artifacts ----
    common.save_json(history, HISTORY_PATH)
    common.save_json({i: c for i, c in enumerate(class_names)}, CLASS_MAP_PATH)

    config = {
        "model": MODEL_NAME,
        "architecture": "EfficientNetB0 (ImageNet, transfer learning)",
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
        "preprocessing": "efficientnet.preprocess_input",
        "augmentation": "flip_h, rotation0.2, zoom0.15, translate0.1, brightness0.15, contrast0.1",
        "num_classes": num_classes,
        "total_params": best_params,
        "trainable_params": best_trainable,
        "frozen_layers_stage1": len(base.layers),
        "fine_tuned_base_layers": 40,
        "best_model_path": BEST_MODEL_PATH,
        "training_time_s": round(time.time() - t_total0, 2),
        "training_date": datetime.datetime.now().isoformat(),
        "val_accuracy": float(val_acc),
        "val_loss": float(val_loss),
    }
    common.save_json(config, CONFIG_PATH)

    env = common.record_environment({
        "model": MODEL_NAME,
        "dataset_version": "final_30class_5382",
        "split_counts": counts,
    })
    common.save_json(env, ENV_PATH)

    # Best model file size
    size_mb = os.path.getsize(BEST_MODEL_PATH) / (1024 * 1024)

    print("\n" + "=" * 70)
    print("EFFICIENTNETB0 TRAINING COMPLETE")
    print("=" * 70)
    print(f"  Best val accuracy: {val_acc:.4f}")
    print(f"  Best val loss    : {val_loss:.4f}")
    print(f"  Total params     : {best_params:,}")
    print(f"  Trainable params : {best_trainable:,}")
    print(f"  Model file       : {size_mb:.2f} MB")
    print(f"  Training time    : {config['training_time_s']:.1f} s")
    print(f"  Best model saved : {BEST_MODEL_PATH}")
    print("NOTE: test set untouched — evaluated in 07_evaluate_models.py")


if __name__ == "__main__":
    main()
