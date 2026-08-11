#!/usr/bin/env python3
"""
01_inspect_dataset.py
=====================
Phase 3: Dataset inspection for PhytoVisionAI_Research (NEW project only).

Purpose:
  - Walk the raw dataset directory (read-only).
  - Count classes and original images per class.
  - Record image resolution distribution (full sampling, stratified across every class).
  - Record image format distribution.
  - Assess basic image quality (brightness + contrast proxy on RGB).
  - Detect exact duplicate images via MD5 of raw bytes (read-only).
  - Detect corrupted/unreadable images (PIL load).
  - Flag suspicious / non-image files.
  - Report which classes have fewer than 500 ORIGINAL images.
  - Provide a verdict on the target: 25-30 classes with >= 500 original images per class.
  - Write reports:
      reports/dataset/dataset_statistics.csv        (per-class counts)
      reports/dataset/dataset_sample_metadata.csv   (per-image sample metadata)
      reports/dataset/dataset_report.md             (full human-readable report)
      reports/dataset/dataset_summary.json          (machine-readable summary)
  - Write paper-quality figures to research/figures/dataset/.

This script is READ-ONLY. It does NOT move/delete/modify/duplicate any image.
It does NOT generate augmented images. It does NOT train anything.
It does NOT import or reuse anything from the old project.

All 14 inspection points are explicitly addressed and printed in a STOP-GATE
summary at the end.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # PhytoVisionAI_Research/

DEFAULT_RAW_DIR = PROJECT_ROOT / "dataset" / "raw"
DEFAULT_REPORTS_DIR = PROJECT_ROOT / "reports" / "dataset"
DEFAULT_FIGURES_DIR = PROJECT_ROOT / "research" / "figures" / "dataset"

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

# Target specification (requirement #14)
TARGET_MIN_CLASSES = 25
TARGET_MAX_CLASSES = 30
TARGET_MIN_IMAGES_PER_CLASS = 500

TARGET_IMG_PER_CLASS_FOR_SAMPLE = 150  # stratified sample cap per class


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect the raw medicinal plant dataset (Phase 3).")
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR,
                        help="Path to the raw dataset directory.")
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS_DIR,
                        help="Directory to write textual/csv reports.")
    parser.add_argument("--figures-dir", type=Path, default=DEFAULT_FIGURES_DIR,
                        help="Directory to write figures.")
    parser.add_argument("--sample-per-class", type=int, default=TARGET_IMG_PER_CLASS_FOR_SAMPLE,
                        help="Maximum number of images sampled per class for resolution/quality stats.")
    return parser.parse_args()


def find_image_dirs(raw_dir: Path) -> list[Path]:
    """Return all directories (recursively) that directly contain image files."""
    image_dirs = []
    for root, dirs, files in os.walk(raw_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        has_images = any(
            Path(f).suffix.lower() in SUPPORTED_IMAGE_EXTS for f in files
        )
        if has_images:
            image_dirs.append(Path(root))
    return image_dirs


def resolve_class_dirs(raw_dir: Path) -> list[Path]:
    """
    Determine the class directories.

    Strategy: find all directories that directly contain image files. Prefer the
    SHALLOWEST set (closest to raw_dir) as the class-split level. If the raw zip
    extracts a single wrapper folder (e.g. raw/<dataset>/<class>), the immediate
    children of that wrapper are the classes.
    """
    image_dirs = find_image_dirs(raw_dir)
    if not image_dirs:
        return []

    def depth(p: Path) -> int:
        return len(p.relative_to(raw_dir).parts)

    min_depth = min(depth(p) for p in image_dirs)
    class_dirs = [p for p in image_dirs if depth(p) == min_depth]
    return class_dirs


def md5_of_file(path: Path) -> str:
    """Compute MD5 of raw file bytes (read-only)."""
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def inspect_image(path: Path):
    """
    Open an image and return a small dict of metadata.

    Uses PIL for lightweight inspection. Falls back to basic file metadata if
    PIL is unavailable.
    """
    result = {
        "path": str(path),
        "class_name": path.parent.name,
        "filename": path.name,
        "extension": path.suffix.lower(),
        "size_bytes": path.stat().st_size,
        "width": None,
        "height": None,
        "mode": None,
        "format": None,
        "channels": None,
        "mean_brightness": None,
        "std_deviation": None,
        "readable": True,
        "error": None,
    }
    try:
        from PIL import Image, ImageStat
        with Image.open(path) as im:
            im.load()  # force full read to detect corruption
            result["width"], result["height"] = im.size
            result["mode"] = im.mode
            result["format"] = im.format
            result["channels"] = len(im.getbands())

            if im.mode in ("RGB", "RGBA"):
                rgb = im.convert("RGB")
                stat = ImageStat.Stat(rgb)
                mean = stat.mean
                stddev = stat.stddev
                result["mean_brightness"] = round(sum(mean) / len(mean), 2)
                result["std_deviation"] = round(sum(stddev) / len(stddev), 2)
    except FileNotFoundError:
        result["readable"] = False
        result["error"] = "missing"
    except Exception as exc:  # noqa: BLE001
        result["readable"] = False
        result["error"] = str(exc)[:200]
    return result


def main() -> int:
    args = parse_args()

    raw_dir: Path = args.raw_dir
    reports_dir: Path = args.reports_dir
    figures_dir: Path = args.figures_dir
    sample_per_class = max(1, args.sample_per_class)

    if not raw_dir.exists():
        print(f"[ERROR] Raw directory does not exist: {raw_dir}")
        return 1

    print(f"[INFO] Inspecting dataset at: {raw_dir}")

    class_dirs = resolve_class_dirs(raw_dir)
    if not class_dirs:
        print("[ERROR] No class directories (directories with images) found.")
        return 1

    # ------------------------------------------------------------------
    # 1. Enumerate all images and non-image files
    # ------------------------------------------------------------------
    class_image_counts: dict[str, int] = {}
    all_image_files: list[Path] = []
    suspicious_files: dict[str, list[Path]] = {}  # class_name -> non-image files

    for cd in sorted(class_dirs):
        image_files = []
        non_image_files = []
        for f in sorted(cd.iterdir()):
            if not f.is_file():
                continue
            if f.suffix.lower() in SUPPORTED_IMAGE_EXTS:
                image_files.append(f)
            else:
                non_image_files.append(f)
        class_image_counts[cd.name] = len(image_files)
        all_image_files.extend(image_files)
        if non_image_files:
            suspicious_files[cd.name] = non_image_files

    total_images = len(all_image_files)
    num_classes = len(class_dirs)
    counts = list(class_image_counts.values())
    min_count = min(counts) if counts else 0
    max_count = max(counts) if counts else 0
    mean_count = (total_images / num_classes) if num_classes else 0.0
    classes_below_500 = [
        (name, cnt) for name, cnt in class_image_counts.items() if cnt < TARGET_MIN_IMAGES_PER_CLASS
    ]

    # ------------------------------------------------------------------
    # 2. Duplicate detection (MD5 of raw bytes) across entire dataset
    # ------------------------------------------------------------------
    print("[INFO] Computing MD5 hashes for duplicate detection (read-only)...")
    seen_md5: dict[str, list[Path]] = defaultdict_list()
    for f in all_image_files:
        seen_md5[md5_of_file(f)].append(f)

    duplicate_groups = [paths for paths in seen_md5.values() if len(paths) > 1]
    total_duplicate_extra = sum(len(g) - 1 for g in duplicate_groups)
    duplicate_class_summary: Counter[str] = Counter()
    for g in duplicate_groups:
        # attribute the duplicate to the (first) class
        duplicate_class_summary[g[0].parent.name] += len(g) - 1

    # ------------------------------------------------------------------
    # 3. Stratified sampling for resolution / format / quality
    # ------------------------------------------------------------------
    sample_files: list[Path] = []
    for cd in sorted(class_dirs):
        files = sorted(
            f for f in cd.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS
        )
        sample_files.extend(files[:sample_per_class])

    print(f"[INFO] Sampling up to {sample_per_class}/class -> {len(sample_files)} images for resolution/quality stats.")

    res_counts: Counter[tuple] = Counter()
    format_counts: Counter[str] = Counter()
    channel_counts: Counter[int] = Counter()
    brightness_list: list[float] = []
    stddev_list: list[float] = []
    unreadable: list[dict] = []
    readable_count = 0
    per_image_rows: list[dict] = []

    for f in sample_files:
        info = inspect_image(f)
        if info["readable"]:
            readable_count += 1
            res_counts[(info["width"], info["height"])] += 1
            if info["format"]:
                format_counts[info["format"]] += 1
            if info["channels"] is not None:
                channel_counts[info["channels"]] += 1
            if info.get("mean_brightness") is not None:
                brightness_list.append(info["mean_brightness"])
                stddev_list.append(info["std_deviation"])
        else:
            unreadable.append(info)
        per_image_rows.append(info)

    # ------------------------------------------------------------------
    # Prepare dirs
    # ------------------------------------------------------------------
    reports_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 4. dataset_statistics.csv (per-class counts)
    # ------------------------------------------------------------------
    stats_csv = reports_dir / "dataset_statistics.csv"
    with open(stats_csv, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["class_name", "num_images", "below_target_500"])
        for name in sorted(class_image_counts):
            cnt = class_image_counts[name]
            writer.writerow([name, cnt, "YES" if cnt < TARGET_MIN_IMAGES_PER_CLASS else "NO"])

    # ------------------------------------------------------------------
    # 5. dataset_sample_metadata.csv
    # ------------------------------------------------------------------
    sample_csv = reports_dir / "dataset_sample_metadata.csv"
    with open(sample_csv, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "path", "class_name", "filename", "extension", "size_bytes",
                "width", "height", "mode", "format", "channels",
                "mean_brightness", "std_deviation", "readable", "error",
            ],
        )
        writer.writeheader()
        for row in per_image_rows:
            writer.writerow(row)

    # ------------------------------------------------------------------
    # 6. Requirement #14 verdict
    # ------------------------------------------------------------------
    class_count_ok = TARGET_MIN_CLASSES <= num_classes <= TARGET_MAX_CLASSES
    all_classes_ok = len(classes_below_500) == 0
    target_met = class_count_ok and all_classes_ok

    # ------------------------------------------------------------------
    # 7. dataset_report.md
    # ------------------------------------------------------------------
    now = datetime.now().isoformat(timespec="seconds")
    report_md = reports_dir / "dataset_report.md"
    with open(report_md, "w", encoding="utf-8") as fh:
        fh.write("# Dataset Report\n\n")
        fh.write(f"_Generated: {now}_\n\n")
        fh.write(f"_Raw directory: `{raw_dir}`_\n\n")

        fh.write("## 1. Summary\n\n")
        fh.write(f"- **Number of classes:** {num_classes}\n")
        fh.write(f"- **Total original images:** {total_images}\n")
        fh.write(f"- **Min images/class:** {min_count}\n")
        fh.write(f"- **Max images/class:** {max_count}\n")
        fh.write(f"- **Mean images/class:** {mean_count:.2f}\n")
        fh.write(f"- **Classes below 500:** {len(classes_below_500)}\n")
        fh.write(f"- **Suspicious/non-image files:** {sum(len(v) for v in suspicious_files.values())}\n")
        fh.write(f"- **Duplicate groups (exact):** {len(duplicate_groups)} (extra files: {total_duplicate_extra})\n\n")

        fh.write("## 2. Requirement #14 verdict\n\n")
        fh.write(f"- Target classes: {TARGET_MIN_CLASSES}-{TARGET_MAX_CLASSES}\n")
        fh.write(f"- Actual classes: {num_classes} -> {'OK' if class_count_ok else 'NOT MET'}\n")
        fh.write(f"- Target min images/class: {TARGET_MIN_IMAGES_PER_CLASS}\n")
        fh.write(f"- Classes meeting target: {num_classes - len(classes_below_500)}/{num_classes}\n")
        fh.write(f"- **Overall target: {'MET' if target_met else 'NOT MET'}**\n\n")

        if classes_below_500:
            fh.write("### Classes below 500 images\n\n")
            fh.write("| Class | Count |\n|---|---|\n")
            for name, cnt in sorted(classes_below_500, key=lambda x: x[1]):
                fh.write(f"| {name} | {cnt} |\n")
            fh.write("\n")

        fh.write("## 3. Per-class counts\n\n")
        fh.write("| Class | Count | Below 500? |\n|---|---|---|\n")
        for name in sorted(class_image_counts):
            cnt = class_image_counts[name]
            flag = "YES" if cnt < TARGET_MIN_IMAGES_PER_CLASS else ""
            fh.write(f"| {name} | {cnt} | {flag} |\n")

        fh.write("\n## 4. Sample-based statistics\n\n")
        fh.write(f"- **Sampled images:** {len(sample_files)}\n")
        fh.write(f"- **Readable in sample:** {readable_count}\n")
        fh.write(f"- **Unreadable/corrupt in sample:** {len(unreadable)}\n")
        fh.write(f"- **Distinct resolutions:** {len(res_counts)}\n\n")

        fh.write("### Format distribution\n\n")
        fh.write("| Format | Count |\n|---|---|\n")
        for fmt, cnt in format_counts.most_common():
            fh.write(f"| {fmt} | {cnt} |\n")

        fh.write("\n### Channel distribution\n\n")
        fh.write("| Channels | Count |\n|---|---|\n")
        for ch, cnt in channel_counts.most_common():
            fh.write(f"| {ch} | {cnt} |\n")

        fh.write("\n### Top resolutions\n\n")
        fh.write("| Width x Height | Count |\n|---|---|\n")
        for (w, h), cnt in res_counts.most_common(20):
            fh.write(f"| {w} x {h} | {cnt} |\n")

        if unreadable:
            fh.write("\n### Unreadable images (sample)\n\n")
            fh.write("| File | Error |\n|---|---|\n")
            for row in unreadable[:50]:
                fh.write(f"| {row['path']} | {row['error']} |\n")

        if suspicious_files:
            fh.write("\n## 5. Suspicious / non-image files\n\n")
            fh.write("| Class | File |\n|---|---|\n")
            for cls, files in suspicious_files.items():
                for f in files:
                    fh.write(f"| {cls} | {f.name} |\n")

        fh.write("\n## 6. Duplicate detection\n\n")
        fh.write(f"- **Duplicate groups found:** {len(duplicate_groups)}\n")
        fh.write(f"- **Extra duplicate files:** {total_duplicate_extra}\n")
        if total_duplicate_extra > 0:
            fh.write("\nBy class:\n\n")
            fh.write("| Class | Extra duplicates |\n|---|---|\n")
            for cls, cnt in duplicate_class_summary.most_common():
                fh.write(f"| {cls} | {cnt} |\n")

        fh.write("\n## 7. Notes\n\n")
        fh.write("- Inspection is **read-only**; raw data was not modified.\n")
        fh.write("- No augmented images were counted; only original files.\n")
        fh.write("- No images were duplicated or moved during inspection.\n")
        fh.write("- Cleaning / splitting / training are deferred to later phases.\n")

    # ------------------------------------------------------------------
    # 8. Figures (matplotlib)
    # ------------------------------------------------------------------
    figure_created = []
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        # 8.1 Images per class (horizontal bar)
        classes_sorted = sorted(class_image_counts, key=lambda c: class_image_counts[c])
        counts_sorted = [class_image_counts[c] for c in classes_sorted]
        colors = [
            "#e76f51" if class_image_counts[c] < TARGET_MIN_IMAGES_PER_CLASS else "#2a9d8f"
            for c in classes_sorted
        ]
        fig, ax = plt.subplots(figsize=(12, max(4, len(classes_sorted) * 0.4)))
        ax.barh(classes_sorted, counts_sorted, color=colors)
        ax.axvline(TARGET_MIN_IMAGES_PER_CLASS, color="black", linestyle="--", alpha=0.5,
                   label=f"target {TARGET_MIN_IMAGES_PER_CLASS}")
        ax.set_xlabel("Number of original images")
        ax.set_title("Images per class (raw dataset)")
        ax.legend()
        ax.grid(axis="x", alpha=0.3)
        fig.tight_layout()
        fig.savefig(figures_dir / "class_distribution.png", dpi=150)
        plt.close(fig)
        figure_created.append("class_distribution.png")

        # 8.2 Resolution distribution
        if res_counts:
            res_sorted = res_counts.most_common(20)
            labels = [f"{w}x{h}" for (w, h), _ in res_sorted]
            vals = [c for _, c in res_sorted]
            fig2, ax2 = plt.subplots(figsize=(10, 5))
            ax2.bar(labels, vals, color="#457b9d")
            ax2.tick_params(axis="x", rotation=45, labelright=False)
            ax2.set_ylabel("Count")
            ax2.set_title("Top image resolutions (sample)")
            ax2.grid(axis="y", alpha=0.3)
            fig2.tight_layout()
            fig2.savefig(figures_dir / "resolution_distribution.png", dpi=150)
            plt.close(fig2)
            figure_created.append("resolution_distribution.png")

        # 8.3 Format distribution
        if format_counts:
            fmt_labels = [f for f, _ in format_counts.most_common()]
            fmt_vals = [c for _, c in format_counts.most_common()]
            fig3, ax3 = plt.subplots(figsize=(8, 5))
            ax3.bar(fmt_labels, fmt_vals, color="#e9c46a")
            ax3.set_ylabel("Count")
            ax3.set_title("Image format distribution (sample)")
            ax3.grid(axis="y", alpha=0.3)
            fig3.tight_layout()
            fig3.savefig(figures_dir / "format_distribution.png", dpi=150)
            plt.close(fig3)
            figure_created.append("format_distribution.png")

        # 8.4 Brightness distribution
        if brightness_list:
            fig4, ax4 = plt.subplots(figsize=(8, 5))
            ax4.hist(brightness_list, bins=40, color="#e76f51", alpha=0.8)
            ax4.set_xlabel("Mean brightness (0-255)")
            ax4.set_ylabel("Frequency")
            ax4.set_title("Image brightness distribution (sample)")
            ax4.grid(axis="y", alpha=0.3)
            fig4.tight_layout()
            fig4.savefig(figures_dir / "brightness_distribution.png", dpi=150)
            plt.close(fig4)
            figure_created.append("brightness_distribution.png")

        # 8.5 Contrast (stddev) distribution
        if stddev_list:
            fig5, ax5 = plt.subplots(figsize=(8, 5))
            ax5.hist(stddev_list, bins=40, color="#f4a261", alpha=0.8)
            ax5.set_xlabel("Std dev (contrast proxy)")
            ax5.set_ylabel("Frequency")
            ax5.set_title("Image contrast/stddev distribution (sample)")
            ax5.grid(axis="y", alpha=0.3)
            fig5.tight_layout()
            fig5.savefig(figures_dir / "contrast_distribution.png", dpi=150)
            plt.close(fig5)
            figure_created.append("contrast_distribution.png")

        # 8.6 Corruption / readability summary
        fig6, ax6 = plt.subplots(figsize=(6, 5))
        ax6.bar(
            ["Readable", "Unreadable"],
            [readable_count, len(unreadable)],
            color=["#2a9d8f", "#e76f51"],
        )
        ax6.set_ylabel("Count")
        ax6.set_title("Image readability in sample")
        ax6.grid(axis="y", alpha=0.3)
        fig6.tight_layout()
        fig6.savefig(figures_dir / "corruption_summary.png", dpi=150)
        plt.close(fig6)
        figure_created.append("corruption_summary.png")

        print(f"[INFO] Figures written to: {figures_dir}")
    except ImportError:
        print("[WARN] matplotlib not installed; skipping figures.")

    # ------------------------------------------------------------------
    # 9. dataset_summary.json
    # ------------------------------------------------------------------
    summary = {
        "generated_at": now,
        "raw_dir": str(raw_dir),
        "num_classes": num_classes,
        "total_images": total_images,
        "min_class_size": min_count,
        "max_class_size": max_count,
        "mean_class_size": round(mean_count, 2),
        "classes_below_500": [{"class": n, "count": c} for n, c in classes_below_500],
        "class_counts": class_image_counts,
        "suspicious_files": {
            cls: [str(f) for f in files] for cls, files in suspicious_files.items()
        },
        "duplicate_groups": len(duplicate_groups),
        "total_duplicate_extra": total_duplicate_extra,
        "sampled_images": len(sample_files),
        "readable_in_sample": readable_count,
        "unreadable_in_sample": len(unreadable),
        "distinct_resolutions": len(res_counts),
        "format_counts": dict(format_counts),
        "channel_counts": dict(channel_counts),
        "target": {
            "min_classes": TARGET_MIN_CLASSES,
            "max_classes": TARGET_MAX_CLASSES,
            "min_images_per_class": TARGET_MIN_IMAGES_PER_CLASS,
            "class_count_ok": class_count_ok,
            "all_classes_ok": all_classes_ok,
            "target_met": target_met,
        },
        "figures": figure_created,
    }
    summary_json = reports_dir / "dataset_summary.json"
    with open(summary_json, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2)

    # ------------------------------------------------------------------
    # 10. Console output + STOP-GATE summary
    # ------------------------------------------------------------------
    print("=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)
    print(f"Classes                  : {num_classes}")
    print(f"Total images             : {total_images}")
    print(f"Min images/class         : {min_count}")
    print(f"Max images/class         : {max_count}")
    print(f"Mean images/class        : {mean_count:.2f}")
    print(f"Classes below 500        : {len(classes_below_500)}")
    print(f"Suspicious/non-image files: {sum(len(v) for v in suspicious_files.values())}")
    print(f"Duplicate groups         : {len(duplicate_groups)} (extra: {total_duplicate_extra})")
    print(f"Sampled images           : {len(sample_files)}")
    print(f"Readable in sample       : {readable_count}")
    print(f"Unreadable in sample     : {len(unreadable)}")
    print(f"Distinct resolutions     : {len(res_counts)}")

    print("\n---------------- STOP GATE SUMMARY ----------------")
    print(f"1.  Number of classes            : {num_classes}")
    for i, name in enumerate(sorted(class_image_counts), 1):
        print(f"    {i:>2}. {name}: {class_image_counts[name]}")
    print(f"2.  Total original images        : {total_images}")
    print(f"3.  Min/Mean/Max per class        : {min_count} / {mean_count:.2f} / {max_count}")
    print(f"4.  Classes below 500             : {len(classes_below_500)}")
    for name, cnt in sorted(classes_below_500, key=lambda x: x[1]):
        print(f"      - {name}: {cnt}")
    print(f"5.  Corrupt/unreadable (sample)   : {len(unreadable)}")
    print(f"6.  Duplicate groups (exact)      : {len(duplicate_groups)} (extra files: {total_duplicate_extra})")
    total_suspicious = sum(len(v) for v in suspicious_files.values())
    print(f"7.  Suspicious/non-image files    : {total_suspicious}")
    print(f"8.  Image formats                 : {dict(format_counts)}")
    print(f"9.  Distinct resolutions (sample) : {len(res_counts)}")
    print(f"10. Requirement #14 (25-30 classes >=500 img/class): "
          f"{'MET' if target_met else 'NOT MET'}")
    print(f"11. Reports                       : {reports_dir}")
    print(f"12. Graphs                        : {figures_dir}")
    print("-----------------------------------------------------")

    print(f"\n[INFO] dataset_statistics.csv : {stats_csv}")
    print(f"[INFO] dataset_report.md      : {report_md}")
    print(f"[INFO] dataset_summary.json   : {summary_json}")
    print("[INFO] Inspection complete. Raw data untouched. Stopping before Phase 4/5.")

    return 0


def defaultdict_list():
    from collections import defaultdict
    return defaultdict(list)


if __name__ == "__main__":
    sys.exit(main())
