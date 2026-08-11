#!/usr/bin/env python3
"""
03_split_dataset.py
===================
Phase 5: Stratified train/validation/test split for PhytoVisionAI_Research (NEW project only).

Purpose:
  - Source: dataset/cleaned/ (post-cleaning unique images; raw untouched).
  - Create a reproducible 70/15/15 stratified split with a FIXED random seed (42).
  - Keep ALL 40 classes (temporary research baseline).
  - Prevent image leakage between train/validation/test:
        * split BEFORE any augmentation
        * each original image appears in exactly ONE split
        * verify no MD5 hash overlaps across splits (exact-duplicate leakage check)
  - Write copies to:
        dataset/train/<class>/...
        dataset/validation/<class>/...
        dataset/test/<class>/...
  - Generate reports:
        reports/dataset/split_statistics.csv   (per-class train/val/test counts)
        reports/dataset/split_report.md        (totals + leakage check)
        reports/dataset/split_summary.json     (machine-readable)
  - Generate a paper-quality figure: research/figures/dataset/split_distribution.png

This script does NOT train anything. It does NOT apply augmentation (augmentation is
deferred to the training phase ONLY and must never touch validation/test images).

IMPORTANT: This is a temporary research split for a 40-class baseline experiment.
It does NOT satisfy the original 25-30 classes x 500+ ORIGINAL images requirement.
No images are duplicated to reach a quota.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import random
import shutil
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # PhytoVisionAI_Research/

DEFAULT_CLEANED_DIR = PROJECT_ROOT / "dataset" / "cleaned"
DEFAULT_TRAIN_DIR = PROJECT_ROOT / "dataset" / "train"
DEFAULT_VAL_DIR = PROJECT_ROOT / "dataset" / "validation"
DEFAULT_TEST_DIR = PROJECT_ROOT / "dataset" / "test"
DEFAULT_REPORTS_DIR = PROJECT_ROOT / "reports" / "dataset"
DEFAULT_FIGURES_DIR = PROJECT_ROOT / "research" / "figures" / "dataset"

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15
SEED = 42


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stratified train/val/test split (Phase 5).")
    parser.add_argument("--cleaned-dir", type=Path, default=DEFAULT_CLEANED_DIR,
                        help="Cleaned dataset source.")
    parser.add_argument("--train-dir", type=Path, default=DEFAULT_TRAIN_DIR)
    parser.add_argument("--val-dir", type=Path, default=DEFAULT_VAL_DIR)
    parser.add_argument("--test-dir", type=Path, default=DEFAULT_TEST_DIR)
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS_DIR)
    parser.add_argument("--figures-dir", type=Path, default=DEFAULT_FIGURES_DIR)
    parser.add_argument("--seed", type=int, default=SEED)
    return parser.parse_args()


def md5_hex(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    args = parse_args()
    cleaned_dir: Path = args.cleaned_dir
    train_dir: Path = args.train_dir
    val_dir: Path = args.val_dir
    test_dir: Path = args.test_dir
    reports_dir: Path = args.reports_dir
    figures_dir: Path = args.figures_dir
    seed = args.seed

    if not cleaned_dir.exists():
        print(f"[ERROR] Cleaned directory does not exist: {cleaned_dir}")
        print("[INFO] Run 02_clean_dataset.py first.")
        return 1

    # class dirs = immediate children of cleaned_dir that contain images (exclude rejected/)
    class_dirs = []
    for d in sorted(cleaned_dir.iterdir()):
        if not d.is_dir() or d.name == "rejected":
            continue
        if any(f.suffix.lower() in SUPPORTED_IMAGE_EXTS for f in d.iterdir()):
            class_dirs.append(d)
    if not class_dirs:
        print("[ERROR] No class directories found in cleaned.")
        return 1

    print(f"[INFO] Splitting {len(class_dirs)} classes from {cleaned_dir} (seed={seed}).")

    rng = random.Random(seed)

    # Rebuild split dirs
    for d in (train_dir, val_dir, test_dir):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)

    # Per-class assignment
    class_split = {}   # class_name -> ("train"|"validation"|"test", filename)
    per_class_counts = {c.name: {"train": 0, "validation": 0, "test": 0} for c in class_dirs}

    for cd in class_dirs:
        files = sorted(
            f for f in cd.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS
        )
        rng.shuffle(files)
        n = len(files)
        n_test = int(round(n * TEST_RATIO))
        n_val = int(round(n * VAL_RATIO))
        n_train = n - n_test - n_val
        # edge: tiny classes -> ensure at least 1 test & 1 val if possible
        if n_val < 1 and n >= 2:
            n_val = 1
            n_train = n - n_test - n_val
        if n_test < 1 and n >= 2:
            n_test = 1
            n_train = n - n_val - n_test
        if n_train < 0:
            # fallback: give all to train if n too small
            n_train = n
            n_val = 0
            n_test = 0

        assignment = (
            ["train"] * n_train
            + ["validation"] * n_val
            + ["test"] * n_test
        )
        rng.shuffle(assignment)  # shuffle assignment order among files
        for f, split in zip(files, assignment):
            class_split.setdefault(cd.name, []).append((split, f))
            per_class_counts[cd.name][split] += 1

    # ------------------------------------------------------------------
    # Write copies
    # ------------------------------------------------------------------
    for cls, assignments in class_split.items():
        for split, f in assignments:
            dest_root = {"train": train_dir, "validation": val_dir, "test": test_dir}[split]
            dest = dest_root / cls / f.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)

    # ------------------------------------------------------------------
    # Leakage check: MD5 sets across the three splits must be disjoint
    # ------------------------------------------------------------------
    print("[INFO] Computing MD5 hashes for leakage check (read-only)...")
    split_hashes = {"train": set(), "validation": set(), "test": set()}
    for split, root in (("train", train_dir), ("validation", val_dir), ("test", test_dir)):
        for f in root.rglob("*"):
            if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS:
                split_hashes[split].add(md5_hex(f))

    overlap_tr_val = split_hashes["train"] & split_hashes["validation"]
    overlap_tr_test = split_hashes["train"] & split_hashes["test"]
    overlap_val_test = split_hashes["validation"] & split_hashes["test"]
    total_overlap = len(overlap_tr_val) + len(overlap_tr_test) + len(overlap_val_test)
    leakage_detected = total_overlap > 0

    # ------------------------------------------------------------------
    # Totals
    # ------------------------------------------------------------------
    train_total = sum(per_class_counts[c]["train"] for c in per_class_counts)
    val_total = sum(per_class_counts[c]["validation"] for c in per_class_counts)
    test_total = sum(per_class_counts[c]["test"] for c in per_class_counts)
    grand_total = train_total + val_total + test_total

    # ------------------------------------------------------------------
    # Reports
    # ------------------------------------------------------------------
    reports_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now().isoformat(timespec="seconds")

    # split_statistics.csv
    csv_path = reports_dir / "split_statistics.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["class_name", "train", "validation", "test", "total"])
        for cls in sorted(per_class_counts):
            c = per_class_counts[cls]
            writer.writerow([cls, c["train"], c["validation"], c["test"], c["train"] + c["validation"] + c["test"]])

    # split_report.md
    md_path = reports_dir / "split_report.md"
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write("# Split Report\n\n")
        fh.write(f"_Generated: {now}_\n\n")
        fh.write(f"_Source: `{cleaned_dir}`_ (cleaned unique images)\n\n")
        fh.write(f"**Seed:** `{seed}`\n\n")
        fh.write(f"**Split:** {TRAIN_RATIO*100:.0f}% train / {VAL_RATIO*100:.0f}% validation / {TEST_RATIO*100:.0f}% test\n\n")

        fh.write("## 1. Summary\n\n")
        fh.write(f"- **Classes:** {len(class_dirs)}\n")
        fh.write(f"- **Cleaned source images:** {sum(len(v) for v in class_split.values())}\n")
        fh.write(f"- **Train:** {train_total}\n")
        fh.write(f"- **Validation:** {val_total}\n")
        fh.write(f"- **Test:** {test_total}\n")
        fh.write(f"- **Total in splits:** {grand_total}\n\n")

        fh.write("## 2. Per-class split counts\n\n")
        fh.write("| Class | Train | Validation | Test | Total |\n|---|---|---|---|---|\n")
        for cls in sorted(per_class_counts):
            c = per_class_counts[cls]
            fh.write(f"| {cls} | {c['train']} | {c['validation']} | {c['test']} | {c['train']+c['validation']+c['test']} |\n")

        fh.write("\n## 3. Leakage check (exact MD5 overlap across splits)\n\n")
        fh.write(f"- Train ∩ Validation overlap: {len(overlap_tr_val)}\n")
        fh.write(f"- Train ∩ Test overlap: {len(overlap_tr_test)}\n")
        fh.write(f"- Validation ∩ Test overlap: {len(overlap_val_test)}\n")
        fh.write(f"- **Total overlapping images: {total_overlap} -> {'LEAKAGE DETECTED' if leakage_detected else 'NO LEAKAGE'}**\n\n")

        fh.write("## 4. Notes\n\n")
        fh.write("- Split is performed BEFORE any augmentation.\n")
        fh.write("- Augmentation is deferred to the training phase ONLY and will NOT be applied to validation/test.\n")
        fh.write("- This is a temporary research split for a 40-class baseline experiment.\n")
        fh.write("- It does NOT satisfy the original 25-30 classes x 500+ ORIGINAL images requirement.\n")
        fh.write("- No images were duplicated; each original appears in exactly one split.\n")

    # split_summary.json
    summary = {
        "generated_at": now,
        "seed": seed,
        "split_ratios": {"train": TRAIN_RATIO, "validation": VAL_RATIO, "test": TEST_RATIO},
        "num_classes": len(class_dirs),
        "source_images": sum(len(v) for v in class_split.values()),
        "train_total": train_total,
        "val_total": val_total,
        "test_total": test_total,
        "grand_total": grand_total,
        "per_class": {cls: per_class_counts[cls] for cls in sorted(per_class_counts)},
        "leakage": {
            "train_val_overlap": len(overlap_tr_val),
            "train_test_overlap": len(overlap_tr_test),
            "val_test_overlap": len(overlap_val_test),
            "total_overlap": total_overlap,
            "leakage_detected": leakage_detected,
        },
        "reports": {"csv": str(csv_path), "markdown": str(md_path)},
    }
    with open(reports_dir / "split_summary.json", "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2)

    # ------------------------------------------------------------------
    # Figure: stacked bar of train/validation/test per class
    # ------------------------------------------------------------------
    figure_created = None
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        classes = sorted(per_class_counts)
        tr = [per_class_counts[c]["train"] for c in classes]
        val = [per_class_counts[c]["validation"] for c in classes]
        te = [per_class_counts[c]["test"] for c in classes]

        fig, ax = plt.subplots(figsize=(14, 6))
        x = np.arange(len(classes))
        width = 0.6
        b1 = ax.bar(x, tr, width, label="Train (70%)", color="#2a9d8f")
        b2 = ax.bar(x, val, width, bottom=tr, label="Validation (15%)", color="#e9c46a")
        bottoms = [tr[i] + val[i] for i in range(len(classes))]
        b3 = ax.bar(x, te, width, bottom=bottoms, label="Test (15%)", color="#e76f51")

        ax.set_ylabel("Number of images")
        ax.set_title(f"Stratified split distribution (seed={seed}) — {len(classes)} classes")
        ax.set_xticks(x)
        ax.set_xticklabels(classes, rotation=90)
        ax.legend()
        ax.grid(axis="y", alpha=0.3)
        fig.tight_layout()
        out = figures_dir / "split_distribution.png"
        fig.savefig(out, dpi=150)
        plt.close(fig)
        figure_created = str(out)
        print(f"[INFO] Split figure: {out}")
    except ImportError:
        print("[WARN] matplotlib not installed; skipping split figure.")

    # ------------------------------------------------------------------
    # Console
    # ------------------------------------------------------------------
    print("=" * 70)
    print("SPLIT SUMMARY (Phase 5)")
    print("=" * 70)
    print(f"Seed            : {seed}")
    print(f"Classes         : {len(class_dirs)}")
    print(f"Source images   : {sum(len(v) for v in class_split.values())}")
    print(f"Train           : {train_total}")
    print(f"Validation      : {val_total}")
    print(f"Test            : {test_total}")
    print(f"Total in splits : {grand_total}")
    print(f"Leakage detected: {leakage_detected} (total overlap {total_overlap})")
    print(f"\n[INFO] split_statistics.csv : {csv_path}")
    print(f"[INFO] split_report.md      : {md_path}")
    print(f"[INFO] split_summary.json   : {reports_dir/'split_summary.json'}")
    if figure_created:
        print(f"[INFO] Split figure         : {figure_created}")
    print("[INFO] Split complete. Stopping before Phase 6 (training).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
