#!/usr/bin/env python3
"""
02_clean_dataset.py
===================
Phase 4: Dataset cleaning & quarantine for PhytoVisionAI_Research (NEW project only).

Purpose:
  - Keep dataset/raw/ completely untouched (read-only source).
  - Copy KEPT images into dataset/cleaned/<class>/ ...
  - Move rejected images into dataset/cleaned/rejected/<reason>/<class>/ ...
  - NEVER delete files permanently — quarantine with a machine-readable record.
  - Re-check all images for:
        * invalid / unsupported format        -> reject (invalid_format)
        * corrupted / unreadable image        -> reject (corrupted)
        * exact duplicate (MD5)               -> reject (duplicate)
        * non-image / suspicious file         -> reject (invalid_file)
        * extremely low quality (tiny or blank) -> reject (low_quality)
  - Generate reports:
        reports/dataset/cleaning_report.csv   (every rejected/quarantined file + reason)
        reports/dataset/cleaning_report.md    (summary + per-class keep/reject counts)
        reports/dataset/cleaning_summary.json (machine-readable)
  - Report the final UNIQUE image count per class.

This script is fully reproducible (deterministic ordering) and does NOT train any model.
It does NOT import or reuse anything from the old project.

Rejection reasons (single source of truth):
    invalid_format : file has an unsupported image extension OR PIL cannot verify format
    corrupted      : PIL cannot load/read pixel data
    invalid_file   : file is not a supported image file (e.g. stray .txt/.db)
    duplicate      : exact byte-identical duplicate (MD5); the first seen is kept
    low_quality    : image is too small (min_dim < 50px) OR near-blank (stddev < 1.0)
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # PhytoVisionAI_Research/

DEFAULT_RAW_DIR = PROJECT_ROOT / "dataset" / "raw"
DEFAULT_CLEANED_DIR = PROJECT_ROOT / "dataset" / "cleaned"
DEFAULT_REPORTS_DIR = PROJECT_ROOT / "reports" / "dataset"

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

# Quality thresholds
MIN_DIM_PX = 50          # minimum width AND height to keep (extremely low resolution)
MIN_STDDEV = 1.0         # below this -> near-blank image (contrast proxy) -> reject

# Rejection reasons
REASON_INVALID_FORMAT = "invalid_format"
REASON_CORRUPTED = "corrupted"
REASON_INVALID_FILE = "invalid_file"
REASON_DUPLICATE = "duplicate"
REASON_LOW_QUALITY = "low_quality"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean/quarantine the raw medicinal plant dataset (Phase 4).")
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR,
                        help="Path to the raw dataset directory (read-only).")
    parser.add_argument("--cleaned-dir", type=Path, default=DEFAULT_CLEANED_DIR,
                        help="Directory to write cleaned data + rejected/quarantine.")
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS_DIR,
                        help="Directory to write CSV/MD/JSON reports.")
    return parser.parse_args()


def find_class_dirs(raw_dir: Path) -> list[Path]:
    """Find directories that directly contain image files at the shallowest level (classes)."""
    image_dirs = []
    for root, dirs, files in os.walk(raw_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        if any(Path(f).suffix.lower() in SUPPORTED_IMAGE_EXTS for f in files):
            image_dirs.append(Path(root))
    if not image_dirs:
        return []
    min_depth = min(len(p.relative_to(raw_dir).parts) for p in image_dirs)
    return [p for p in image_dirs if len(p.relative_to(raw_dir).parts) == min_depth]


def md5_hex(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def inspect_image(path: Path):
    """Return (readable: bool, width:int|None, height:int|None, stddev:float|None, err:str|None)."""
    try:
        from PIL import Image, ImageStat
        with Image.open(path) as im:
            im.load()
            w, h = im.size
            if im.mode in ("RGB", "RGBA"):
                rgb = im.convert("RGB")
                stat = ImageStat.Stat(rgb)
                stddev = float(sum(stat.stddev) / len(stat.stddev))
            else:
                stat = ImageStat.Stat(im.convert("L"))
                stddev = float(stat.stddev[0])
            return True, w, h, stddev, None
    except FileNotFoundError:
        return False, None, None, None, "missing"
    except Exception as exc:  # noqa: BLE001
        return False, None, None, None, str(exc)[:200]


def main() -> int:
    args = parse_args()
    raw_dir: Path = args.raw_dir
    cleaned_dir: Path = args.cleaned_dir
    reports_dir: Path = args.reports_dir

    if not raw_dir.exists():
        print(f"[ERROR] Raw directory does not exist: {raw_dir}")
        return 1

    print(f"[INFO] Cleaning dataset. Raw (read-only): {raw_dir}")
    print(f"[INFO] Cleaned output: {cleaned_dir}")

    class_dirs = find_class_dirs(raw_dir)
    if not class_dirs:
        print("[ERROR] No class directories found in raw.")
        return 1
    print(f"[INFO] Found {len(class_dirs)} class directories.")

    # ------------------------------------------------------------------
    # Clean (destructively if the cleaned dir already exists, we rebuild it)
    # ------------------------------------------------------------------
    if cleaned_dir.exists():
        shutil.rmtree(cleaned_dir)
    (cleaned_dir / "rejected").mkdir(parents=True, exist_ok=True)

    rejected_rows: list[dict] = []          # records for cleaning_report.csv
    kept_per_class: Counter[str] = Counter()
    rejected_per_class: Counter[str] = Counter()
    seen_md5: dict[str, str] = {}           # md5 -> kept relative target path (within clean)
    stat_counts: Counter[str] = Counter()

    # Deterministic ordering
    for cd in sorted(class_dirs):
        files = sorted(f for f in cd.iterdir() if f.is_file())
        cls = cd.name
        if not cls:
            continue

        for f in files:
            rel = f.relative_to(raw_dir).as_posix()
            suffix = f.suffix.lower()

            # 1) Suspicious / non-image file
            if suffix not in SUPPORTED_IMAGE_EXTS:
                reason = REASON_INVALID_FILE
                stat_counts[reason] += 1
                rejected_per_class[cls] += 1
                rejected_rows.append({
                    "relative_path": rel, "class_name": cls,
                    "filename": f.name, "reason": reason,
                    "keep": False,
                })
                # quarantine
                dest = cleaned_dir / "rejected" / reason / cls / f.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dest)
                continue

            # 2) Corrupted / unreadable
            readable, w, h, stddev, err = inspect_image(f)
            if not readable:
                reason = REASON_CORRUPTED
                stat_counts[reason] += 1
                rejected_per_class[cls] += 1
                rejected_rows.append({
                    "relative_path": rel, "class_name": cls,
                    "filename": f.name, "reason": reason,
                    "keep": False, "detail": err,
                })
                dest = cleaned_dir / "rejected" / reason / cls / f.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dest)
                continue

            # 3) Extremely low quality: tiny resolution or near-blank
            if w is not None and h is not None:
                if min(w, h) < MIN_DIM_PX:
                    reason = REASON_LOW_QUALITY
                    stat_counts[reason] += 1
                    rejected_per_class[cls] += 1
                    rejected_rows.append({
                        "relative_path": rel, "class_name": cls,
                        "filename": f.name, "reason": reason,
                        "keep": False, "detail": f"min_dim={min(w,h)}px < {MIN_DIM_PX}px",
                    })
                    dest = cleaned_dir / "rejected" / reason / cls / f.name
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(f, dest)
                    continue
                if stddev is not None and stddev < MIN_STDDEV:
                    reason = REASON_LOW_QUALITY
                    stat_counts[reason] += 1
                    rejected_per_class[cls] += 1
                    rejected_rows.append({
                        "relative_path": rel, "class_name": cls,
                        "filename": f.name, "reason": reason,
                        "keep": False, "detail": f"stddev={stddev:.2f} < {MIN_STDDEV} (near-blank)",
                    })
                    dest = cleaned_dir / "rejected" / reason / cls / f.name
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(f, dest)
                    continue

            # 4) Exact duplicate (MD5) — keep first seen (per dataset), reject later
            digest = md5_hex(f)
            if digest in seen_md5:
                reason = REASON_DUPLICATE
                stat_counts[reason] += 1
                rejected_per_class[cls] += 1
                rejected_rows.append({
                    "relative_path": rel, "class_name": cls,
                    "filename": f.name, "reason": reason,
                    "keep": False,
                    "detail": f"identical to kept file {seen_md5[digest]}",
                })
                dest = cleaned_dir / "rejected" / reason / cls / f.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dest)
                continue

            # 5) Keep
            seen_md5[digest] = rel
            kept_per_class[cls] += 1
            dest = cleaned_dir / cls / f.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)

    # ------------------------------------------------------------------
    # Reports
    # ------------------------------------------------------------------
    reports_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now().isoformat(timespec="seconds")

    # cleaning_report.csv
    csv_path = reports_dir / "cleaning_report.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["relative_path", "class_name", "filename", "reason", "keep", "detail"]
        )
        writer.writeheader()
        for row in rejected_rows:
            writer.writerow(row)

    total_raw = sum(len([x for x in c.iterdir() if x.is_file()]) for c in class_dirs)
    total_kept = sum(kept_per_class.values())
    total_rejected = len(rejected_rows)

    # cleaning_report.md
    md_path = reports_dir / "cleaning_report.md"
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write("# Cleaning Report\n\n")
        fh.write(f"_Generated: {now}_\n\n")
        fh.write(f"_Raw directory: `{raw_dir}`_\n\n")
        fh.write(f"_Cleaned directory: `{cleaned_dir}`_\n\n")

        fh.write("## 1. Summary\n\n")
        fh.write(f"- **Classes:** {len(class_dirs)}\n")
        fh.write(f"- **Raw image files found:** {total_raw}\n")
        fh.write(f"- **Kept unique images:** {total_kept}\n")
        fh.write(f"- **Rejected/quarantined files:** {total_rejected}\n\n")

        fh.write("### Rejection reasons\n\n")
        fh.write("| Reason | Count |\n|---|---|\n")
        for reason in [REASON_INVALID_FILE, REASON_CORRUPTED, REASON_LOW_QUALITY, REASON_DUPLICATE]:
            fh.write(f"| {reason} | {stat_counts[reason]} |\n")

        fh.write("\n## 2. Per-class keep/reject counts\n\n")
        fh.write("| Class | Kept | Rejected | Total |\n|---|---|---|---|\n")
        for cls in sorted(set(kept_per_class) | set(rejected_per_class)):
            k = kept_per_class[cls]
            r = rejected_per_class[cls]
            fh.write(f"| {cls} | {k} | {r} | {k+r} |\n")

        fh.write("\n## 3. Final unique image count per class (kept)\n\n")
        fh.write("| Class | Unique images |\n|---|---|\n")
        for cls in sorted(kept_per_class):
            fh.write(f"| {cls} | {kept_per_class[cls]} |\n")

        fh.write("\n## 4. Notes\n\n")
        fh.write("- `dataset/raw/` was NOT modified; only copies were written under `dataset/cleaned/`.\n")
        fh.write("- Rejected files are quarantined under `dataset/cleaned/rejected/<reason>/<class>/`.\n")
        fh.write("- No image was permanently deleted.\n")
        fh.write("- No augmented images counted; only original files.\n")
        fh.write("- No images duplicated to reach a quota.\n")

    # cleaning_summary.json
    summary = {
        "generated_at": now,
        "raw_dir": str(raw_dir),
        "cleaned_dir": str(cleaned_dir),
        "num_classes": len(class_dirs),
        "raw_files": total_raw,
        "kept_unique_images": total_kept,
        "rejected_files": total_rejected,
        "rejection_reasons": {r: stat_counts[r] for r in [REASON_INVALID_FILE, REASON_CORRUPTED, REASON_LOW_QUALITY, REASON_DUPLICATE]},
        "kept_per_class": dict(sorted(kept_per_class.items())),
        "rejected_per_class": dict(sorted(rejected_per_class.items())),
        "reports": {
            "csv": str(csv_path),
            "markdown": str(md_path),
        },
    }
    with open(reports_dir / "cleaning_summary.json", "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2)

    # ------------------------------------------------------------------
    # Console report
    # ------------------------------------------------------------------
    print("=" * 70)
    print("CLEANING SUMMARY (Phase 4)")
    print("=" * 70)
    print(f"Classes              : {len(class_dirs)}")
    print(f"Raw files found      : {total_raw}")
    print(f"Kept unique          : {total_kept}")
    print(f"Rejected/quarantined : {total_rejected}")
    print(f"  invalid_format     : {stat_counts[REASON_INVALID_FORMAT]}")
    print(f"  invalid_file       : {stat_counts[REASON_INVALID_FILE]}")
    print(f"  corrupted          : {stat_counts[REASON_CORRUPTED]}")
    print(f"  low_quality        : {stat_counts[REASON_LOW_QUALITY]}")
    print(f"  duplicate          : {stat_counts[REASON_DUPLICATE]}")
    print(f"\nKept images/class:")
    for cls, cnt in sorted(kept_per_class.items()):
        print(f"  {cls:>14}: {cnt}")
    print(f"\n[INFO] cleaning_report.csv : {csv_path}")
    print(f"[INFO] cleaning_report.md  : {md_path}")
    print(f"[INFO] cleaning_summary.json: {reports_dir/'cleaning_summary.json'}")
    print("[INFO] Cleaning complete. Raw untouched. Stopping before Phase 5/6.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

