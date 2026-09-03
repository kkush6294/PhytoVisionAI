"""
common.py — Shared utilities for the Phase 6 controlled experiment.

Guarantees IDENTICAL experimental conditions for MobileNetV2 and EfficientNetB0:
  - Same fixed stratified split (70/15/15, seed=42) from dataset/final/
  - Same physical split directories (both models read the SAME files)
  - MD5 leakage verification (no image in >1 split)
  - Same augmentation policy (training only; val/test deterministic)
  - Same class-weighting strategy (inverse frequency)
  - Shared evaluation helpers (top-1/3/5, macro/weighted metrics, per-class)
  - Seed-setting for reproducibility

The ONLY per-model difference is the official preprocess_input function,
which is architecture-specific and applied at the data-pipeline level.
"""
import os
import sys
import csv
import json
import time
import hashlib
import random
import shutil
import platform
from collections import Counter

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FINAL_DATASET = os.path.join(ROOT, "dataset", "final")
SPLIT_DIR = os.path.join(ROOT, "dataset", "final_split")
REPORT_DIR = os.path.join(ROOT, "reports", "models")
FIG_DIR = os.path.join(ROOT, "research", "figures", "models")
MODEL_DIR = os.path.join(ROOT, "training", "models")

for d in (REPORT_DIR, FIG_DIR, MODEL_DIR):
    os.makedirs(d, exist_ok=True)

# ---------------------------------------------------------------------------
# Fixed experiment config
# ---------------------------------------------------------------------------
IMG_SIZE = 224
BATCH_SIZE = 32
SEED = 42
TRAIN_R = 0.70
VAL_R = 0.15
TEST_R = 0.15
EPOCHS_HEAD = 25
EPOCHS_FINE = 20
LR_HEAD = 1e-4
LR_FINE = 1e-5
PATIENCE = 5
REDUCE_PATIENCE = 3
AUTOTUNE = tf.data.AUTOTUNE


def set_seeds(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)


def get_class_names():
    """Alphabetically sorted class list (fixed order for both models)."""
    return sorted(d for d in os.listdir(FINAL_DATASET)
                  if os.path.isdir(os.path.join(FINAL_DATASET, d)))


def md5sum(path, blocksize=1024 * 1024):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(blocksize), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Fixed split creation
# ---------------------------------------------------------------------------
def create_fixed_split(force=False):
    """
    Create the fixed 70/15/15 stratified split under dataset/final_split/.
    idempotent; refuses to clobber unless force=True.
    Returns (class_names, counts) and writes split manifests.
    """
    if os.path.isdir(os.path.join(SPLIT_DIR, "train")) and not force:
        print("[common] Fixed split already exists — reusing it.")
        return _load_split_manifests()

    class_names = get_class_names()
    rng = random.Random(SEED)

    for split in ("train", "val", "test"):
        shutil.rmtree(os.path.join(SPLIT_DIR, split), ignore_errors=True)
        os.makedirs(os.path.join(SPLIT_DIR, split), exist_ok=True)

    manifest_rows = []  # (split, class, filename, abs_path)

    for ci, cls in enumerate(class_names):
        src_dir = os.path.join(FINAL_DATASET, cls)
        files = sorted(os.listdir(src_dir))
        rng.shuffle(files)
        n = len(files)
        n_train = int(round(n * TRAIN_R))
        n_val = int(round(n * VAL_R))
        # ensure test gets remainder; recompute to be exact
        n_train = int(np.floor(n * TRAIN_R))
        n_val = int(np.floor(n * VAL_R))
        n_test = n - n_train - n_val
        # adjust rounding so all n are covered
        while n_train + n_val + n_test < n:
            n_train += 1
        while n_train + n_val + n_test < n:
            n_val += 1
        while n_train + n_val + n_test < n:
            n_test += 1

        train_files = files[:n_train]
        val_files = files[n_train:n_train + n_val]
        test_files = files[n_train + n_val:]

        for split, flist in [("train", train_files), ("val", val_files), ("test", test_files)]:
            dst_dir = os.path.join(SPLIT_DIR, split, cls)
            os.makedirs(dst_dir, exist_ok=True)
            for fn in flist:
                src = os.path.join(src_dir, fn)
                dst = os.path.join(dst_dir, fn)
                shutil.copy2(src, dst)
                manifest_rows.append((split, cls, fn, dst))

        print(f"  {cls:>14}: train={n_train} val={n_val} test={n_test}")

    # Write manifests
    for split in ("train", "val", "test"):
        mpath = os.path.join(REPORT_DIR, f"{split}_manifest.csv")
        with open(mpath, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["split", "class", "filename", "path"])
            for row in manifest_rows:
                if row[0] == split:
                    w.writerow(row)

    # Per-class split counts
    counts = {}
    for split in ("train", "val", "test"):
        counts[split] = {}
        split_root = os.path.join(SPLIT_DIR, split)
        for cls in class_names:
            d = os.path.join(split_root, cls)
            counts[split][cls] = len(os.listdir(d)) if os.path.isdir(d) else 0

    return class_names, counts


def _load_split_manifests():
    class_names = get_class_names()
    counts = {}
    for split in ("train", "val", "test"):
        mpath = os.path.join(REPORT_DIR, f"{split}_manifest.csv")
        counts[split] = {}
        if os.path.exists(mpath):
            with open(mpath, encoding="utf-8") as f:
                rd = csv.DictReader(f)
                for row in rd:
                    counts[split][row["class"]] = counts[split].get(row["class"], 0) + 1
        else:
            split_root = os.path.join(SPLIT_DIR, split)
            for cls in class_names:
                d = os.path.join(split_root, cls)
                counts[split][cls] = len(os.listdir(d)) if os.path.isdir(d) else 0
    return class_names, counts


def verify_leakage():
    """
    Verify no image appears in more than one split (by MD5).
    Returns (ok, overlap_report).
    """
    seen = {}  # md5 -> split
    overlaps = []
    for split in ("test", "val", "train"):
        split_root = os.path.join(SPLIT_DIR, split)
        for cls in get_class_names():
            d = os.path.join(split_root, cls)
            if not os.path.isdir(d):
                continue
            for fn in os.listdir(d):
                p = os.path.join(d, fn)
                md5 = md5sum(p)
                if md5 in seen and seen[md5] != split:
                    overlaps.append((md5, seen[md5], split, cls, fn))
                else:
                    seen[md5] = split
    return len(overlaps) == 0, overlaps


# ---------------------------------------------------------------------------
# Data pipelines
# ---------------------------------------------------------------------------
def make_augmentation():
    """Same augmentation policy for BOTH models (training only)."""
    return keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.15),
        layers.RandomTranslation(0.1, 0.1),
        layers.RandomBrightness(0.15),
        layers.RandomContrast(0.1),
    ])


def build_dataset(split, class_names, preprocess_fn, augment=False, batch_size=BATCH_SIZE):
    """
    Build a tf.data dataset from dataset/final_split/<split>/.
    augment=True ONLY for training. val/test are deterministic.
    """
    split_root = os.path.join(SPLIT_DIR, split)
    ds = keras.utils.image_dataset_from_directory(
        split_root,
        labels="inferred",
        label_mode="int",
        class_names=class_names,
        color_mode="rgb",
        batch_size=batch_size,
        image_size=(IMG_SIZE, IMG_SIZE),
        shuffle=True if augment else False,
        seed=SEED,
    )

    def _pp(x, y):
        x = tf.cast(x, tf.float32)
        x = preprocess_fn(x)
        return x, y

    if augment:
        aug = make_augmentation()
        ds = ds.map(lambda x, y: (aug(x, training=True), y), num_parallel_calls=AUTOTUNE)
    ds = ds.map(_pp, num_parallel_calls=AUTOTUNE)
    ds = ds.prefetch(AUTOTUNE)
    return ds


def compute_class_weights(split="train", class_names=None):
    """Inverse-frequency class weights normalized to mean 1.0."""
    class_names = class_names or get_class_names()
    split_root = os.path.join(SPLIT_DIR, split)
    counts = Counter()
    for cls in class_names:
        d = os.path.join(split_root, cls)
        counts[cls] = len(os.listdir(d)) if os.path.isdir(d) else 0
    total = sum(counts.values())
    n = len(class_names)
    weights = {}
    for i, cls in enumerate(class_names):
        c = counts.get(cls, 1)
        weights[i] = total / (n * c)
    return weights


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
def evaluate_model(model, ds_test, class_names, batch_size=BATCH_SIZE):
    """
    Full evaluation. Returns dict with all requested metrics.
    ds_test must be the untouched test set (deterministic).
    """
    from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                                 f1_score, classification_report, confusion_matrix)

    y_true = []
    y_pred = []
    y_proba = []
    # Inference timing
    t0 = time.time()
    for imgs, labels in ds_test:
        probs = model.predict(imgs, verbose=0)
        y_proba.extend(probs)
        y_true.extend(labels.numpy().tolist())
        y_pred.extend(np.argmax(probs, axis=1).tolist())
    total_infer = time.time() - t0

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_proba = np.array(y_proba)
    n = len(y_true)

    # Top-1/3/5
    top1 = accuracy_score(y_true, y_pred)
    topk = np.argsort(y_proba, axis=1)[:, ::-1][:, :5]
    top3 = np.mean([y_true[i] in topk[i, :3] for i in range(n)])
    top5 = np.mean([y_true[i] in topk[i, :5] for i in range(n)])

    macro_p = precision_score(y_true, y_pred, average="macro", zero_division=0)
    macro_r = recall_score(y_true, y_pred, average="macro", zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    weighted_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    weighted_p = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    weighted_r = recall_score(y_true, y_pred, average="weighted", zero_division=0)

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))

    # Per-class metrics
    per_class = {}
    report = classification_report(y_true, y_pred, labels=list(range(len(class_names))),
                                   target_names=class_names, output_dict=True, zero_division=0)
    for i, cls in enumerate(class_names):
        mask = y_true == i
        acc = float((y_pred[mask] == i).mean()) if mask.sum() > 0 else 0.0
        per_class[cls] = {
            "precision": round(report[cls]["precision"], 4),
            "recall": round(report[cls]["recall"], 4),
            "f1": round(report[cls]["f1-score"], 4),
            "support": int(report[cls]["support"]),
            "accuracy": round(acc, 4),
        }

    return {
        "n_test": n,
        "top1_accuracy": round(float(top1), 4),
        "top3_accuracy": round(float(top3), 4),
        "top5_accuracy": round(float(top5), 4),
        "macro_precision": round(macro_p, 4),
        "macro_recall": round(macro_r, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_precision": round(weighted_p, 4),
        "weighted_recall": round(weighted_r, 4),
        "weighted_f1": round(weighted_f1, 4),
        "confusion_matrix": cm.tolist(),
        "per_class": per_class,
        "inference_total_s": round(total_infer, 3),
        "inference_per_image_ms": round(total_infer / max(n, 1) * 1000, 4),
        "y_true": y_true.tolist(),
        "y_pred": y_pred.tolist(),
        "y_proba": y_proba.tolist(),
    }


def model_parameter_count(model):
    total = model.count_params()
    trainable = sum(w.shape.num_elements() for w in model.trainable_weights)
    return total, trainable


def model_file_size(path):
    return os.path.getsize(path) / (1024 * 1024)  # MB


def save_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def record_environment(extra=None):
    """Record the exact training environment."""
    env = {
        "python_version": platform.python_version(),
        "tensorflow_version": tf.__version__,
        "keras_version": keras.__version__,
        "numpy_version": np.__version__,
        "platform": platform.platform(),
        "processor": platform.processor(),
        "gpu_devices": [g.name for g in tf.config.list_physical_devices("GPU")],
        "cpu_cores": os.cpu_count(),
        "dataset_root": FINAL_DATASET,
        "dataset_image_size": IMG_SIZE,
        "batch_size": BATCH_SIZE,
        "split_seed": SEED,
        "split_ratios": {"train": TRAIN_R, "val": VAL_R, "test": TEST_R},
    }
    if extra:
        env.update(extra)
    return env
