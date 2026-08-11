"""
04_build_final_dataset.py
==========================
Build the FINAL combined medicinal-plant leaf dataset (Phase 5.5, Option A).

SOURCES (clearly licensed, verifiable, non-augmented):
  1. Base  : "Indian Medicinal Plant Image Dataset" (warcoder, Kaggle, CC BY 4.0)
             -> cleaned copy at dataset/cleaned/<class>/
  2. MMPD-30: "Multimodal Medicinal Plant Dataset" (monirhoosain, Kaggle, CC BY 4.0)
             -> dataset/external/multimodal_medicinal_plant/MMPD-30/<class>/

EXCLUDED (documented, NOT used):
  - preetam_medicinal_leaf  : license UNKNOWN
  - fuyad_bangladeshi_medic: images confirmed AUGMENTED (aug_*.jpg)
  - agaute_medicinal_leaf   : class->plant mapping obfuscated/unreliable

POLICY (from user approval, Option A):
  - No manufactured or duplicated images.
  - No augmented images used as originals.
  - Global dedup INCLUDING cross-dataset near/exact duplicates.
  - Raw sources untouched.
  - Select 25-30 classes with strongest identity + highest unique counts.
  - Document provenance for every image.
  - Honest report: classes < 500 are clearly reported as NOT MET.

OUTPUTS:
  - dataset/final/<class>/*.jpg        (copied final images)
  - reports/dataset/image_provenance.csv
  - reports/dataset/final_dataset_report.md
  - reports/dataset/final_dataset_summary.json
  - research/figures/final/*.png       (paper-quality figures)
"""
import os
import sys
import json
import hashlib
import shutil
import csv
import datetime
from collections import OrderedDict, Counter

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE_CLEANED = os.path.join(ROOT, "dataset", "cleaned")
MMPD_ROOT = os.path.join(ROOT, "dataset", "external", "multimodal_medicinal_plant", "MMPD-30")
FINAL_DIR = os.path.join(ROOT, "dataset", "final")
REPORT_DIR = os.path.join(ROOT, "reports", "dataset")
FIG_DIR = os.path.join(ROOT, "research", "figures", "final")

os.makedirs(FINAL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)
os.makedirs(FIG_DIR, exist_ok=True)

SEED = 42
CREATED = datetime.datetime.now().isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Scientific identity + MMPD mapping for the SELECTED 30 classes
# ---------------------------------------------------------------------------
# canonical_class -> (scientific_name, common_name, mmpd_class_or_None)
FINAL_CLASSES = OrderedDict([
    ("Aloevera",      ("Aloe vera",              "Aloe Vera",       None)),
    ("Amla",          ("Phyllanthus emblica",    "Amla",            None)),
    ("Ashoka",        ("Saraca asoca",           "Ashoka",          "3.Bashok")),
    ("Ashwagandha",   ("Withania somnifera",     "Ashwagandha",     None)),
    ("Betel",         ("Piper betle",            "Betel",           None)),
    ("Brahmi",        ("Bacopa monnieri",        "Brahmi",          None)),
    ("Castor",        ("Ricinus communis",       "Castor",          None)),
    ("Curry_Leaf",    ("Murraya koenigii",       "Curry Leaf",      "27.Karipata")),
    ("Doddapatre",    ("Coleus amboinicus",      "Doddapatre",      None)),
    ("Gauva",         ("Psidium guajava",        "Guava",           None)),
    ("Geranium",      ("Pelargonium graveolens", "Geranium",        None)),
    ("Henna",         ("Lawsonia inermis",       "Henna",           "18.Mehedi")),
    ("Hibiscus",      ("Hibiscus rosa-sinensis", "Hibiscus",        "12.Joba")),
    ("Honge",         ("Pongamia pinnata",       "Honge",           None)),
    ("Insulin",       ("Costus igneus",          "Insulin Plant",   None)),
    ("Jasmine",       ("Jasminum auriculatum",   "Jasmine",         None)),
    ("Lemon",         ("Citrus limon",           "Lemon",           "23.Lemon")),
    ("Lemon_grass",   ("Cymbopogon citratus",    "Lemon Grass",     None)),
    ("Mango",         ("Mangifera indica",       "Mango",           None)),
    ("Mint",          ("Mentha arvensis",        "Mint",            "20.Pudina")),
    ("Nagadali",      ("Ruta graveolens",        "Nagadali",        None)),
    ("Neem",          ("Azadirachta indica",     "Neem",            "11.Neem")),
    ("Pappaya",       ("Carica papaya",          "Papaya",          None)),
    ("Pepper",        ("Piper nigrum",           "Pepper",          None)),
    ("Pomegranate",   ("Punica granatum",        "Pomegranate",     None)),
    ("Raktachandini", ("Caesalpinia sappan",     "Raktachandini",   None)),
    ("Rose",          ("Rosa indica",            "Rose",            None)),
    ("Sapota",        ("Manilkara zapota",       "Sapota",          "9.Sofeda")),
    ("Tulasi",        ("Ocimum tenuiflorum",     "Tulsi",           "1.Tulshi")),
    ("Wood_sorel",    ("Oxalis corniculata",     "Wood Sorrel",     None)),
])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def md5sum(path, blocksize=1024 * 1024):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(blocksize), b""):
            h.update(chunk)
    return h.hexdigest()


def list_images(folder):
    if not os.path.isdir(folder):
        return []
    return [f for f in os.listdir(folder)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp"))]


def unique_dst_path(class_dir, src_name):
    """Return a non-colliding filename in class_dir."""
    candidate = src_name
    i = 1
    while os.path.exists(os.path.join(class_dir, candidate)):
        stem, ext = os.path.splitext(src_name)
        candidate = f"{stem}_dup{i}{ext}"
        i += 1
    return candidate


# ---------------------------------------------------------------------------
# Main build
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("BUILD FINAL COMBINED DATASET (Option A)")
    print("=" * 70)

    final_counts = {}
    provenance = []  # rows: image,dest_rel,class,source,orig_class,md5
    cross_duplicates = []  # (class, dest_rel, md5, sources)

    # Global MD5 registry to detect cross-dataset duplicates
    global_md5 = {}  # md5 -> (class, dest_rel, source)

    for cls, (sci, common, mmpd_cls) in FINAL_CLASSES.items():
        class_dir = os.path.join(FINAL_DIR, cls)
        os.makedirs(class_dir, exist_ok=True)
        count = 0

        # ---- Source 1: Base cleaned ----
        base_class_dir = os.path.join(BASE_CLEANED, cls)
        base_files = list_images(base_class_dir)
        if not base_files:
            print(f"[WARN] {cls}: no base images at {base_class_dir}")
        for fn in sorted(base_files):
            src_path = os.path.join(base_class_dir, fn)
            md5 = md5sum(src_path)
            if md5 in global_md5:
                cross_duplicates.append((cls, fn, md5, "base"))
                continue  # duplicate of something already copied
            dst_name = unique_dst_path(class_dir, fn)
            shutil.copy2(src_path, os.path.join(class_dir, dst_name))
            global_md5[md5] = (cls, dst_name, "base")
            count += 1
            provenance.append([dst_name, f"{cls}/{dst_name}", cls, "base", cls, md5])

        # ---- Source 2: MMPD-30 (if mapped) ----
        if mmpd_cls:
            mmpd_class_dir = os.path.join(MMPD_ROOT, mmpd_cls)
            mmpd_files = list_images(mmpd_class_dir)
            if not mmpd_files:
                print(f"[WARN] {cls}: no MMPD images at {mmpd_class_dir}")
            for fn in sorted(mmpd_files):
                src_path = os.path.join(mmpd_class_dir, fn)
                md5 = md5sum(src_path)
                if md5 in global_md5:
                    cross_duplicates.append((cls, fn, md5, "mmpd"))
                    continue  # cross-dataset duplicate -> skip
                # prefix to avoid filename collisions with base
                dst_name = unique_dst_path(class_dir, f"mmpd_{fn}")
                shutil.copy2(src_path, os.path.join(class_dir, dst_name))
                global_md5[md5] = (cls, dst_name, "mmpd")
                count += 1
                provenance.append([dst_name, f"{cls}/{dst_name}", cls, "mmpd", mmpd_cls, md5])

        final_counts[cls] = count
        base_n = len(base_files)
        mmpd_n = len(mmpd_files) if mmpd_cls else 0
        print(f"  {cls:>14}: final={count:>4}  (base={base_n:>3}, mmpd={mmpd_n:>3})")

    total = sum(final_counts.values())
    print("\n" + "=" * 70)
    print(f"TOTAL FINAL IMAGES: {total}  |  classes: {len(final_counts)}")
    print(f"Cross-dataset duplicates skipped: {len(cross_duplicates)}")
    print("=" * 70)

    # ------------------------------------------------------------------
    # Write image_provenance.csv
    # ------------------------------------------------------------------
    prov_csv = os.path.join(REPORT_DIR, "image_provenance.csv")
    with open(prov_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["filename", "path", "class", "source", "orig_class", "md5"])
        w.writerows(provenance)
    print(f"[OK] provenance -> {prov_csv} ({len(provenance)} rows)")

    # ------------------------------------------------------------------
    # Final report (markdown)
    # ------------------------------------------------------------------
    lines = []
    lines.append("# Final Dataset Report")
    lines.append("")
    lines.append(f"_Generated: {CREATED}_")
    lines.append("")
    lines.append("## 1. Objective")
    lines.append("")
    lines.append("Build a final medicinal-plant leaf dataset from clearly-licensed, verifiable, "
                 "non-augmented public sources. Target: 25-30 classes x >=500 unique original "
                 "images/class (15,000+ images).")
    lines.append("")
    lines.append("## 2. Sources (Option A)")
    lines.append("")
    lines.append("| Source | Dataset | License | Used |")
    lines.append("|---|---|---|---|")
    lines.append("| Base | Indian Medicinal Plant Image Dataset (warcoder, Kaggle) | CC BY 4.0 | YES |")
    lines.append("| MMPD-30 | Multimodal Medicinal Plant Dataset (monirhoosain, Kaggle) | CC BY 4.0 | YES |")
    lines.append("| Preetam | medicinal-plant-leaf (preetam009) | **Unknown** | NO |")
    lines.append("| Fuyad | Bangladeshi Medicinal Plant Classification | CC BY-NC-SA 4.0 | NO (augmented) |")
    lines.append("| Agaute | Medicinal Plant Leaf Images | ODbL | NO (obfuscated mapping) |")
    lines.append("")
    lines.append("## 3. Global duplicate handling")
    lines.append("")
    lines.append(f"- Exact-duplicate MD5 registry used across ALL sources (global).")
    lines.append(f"- Cross-dataset duplicates skipped: **{len(cross_duplicates)}** (base-vs-MMPD).")
    lines.append(f"- Within-base duplicates were already quarantined in Phase 4 (57).")
    lines.append("")
    lines.append("## 4. Selected classes (30)")
    lines.append("")
    lines.append("| Class | Scientific name | Common name | Base | MMPD | Cross-dup removed | Final | Needed to 500 |")
    lines.append("|---|---|---|---:|---:|---:|---:|---:|")
    for cls, (sci, common, mmpd_cls) in FINAL_CLASSES.items():
        base_n = len(list_images(os.path.join(BASE_CLEANED, cls)))
        mmpd_n = len(list_images(os.path.join(MMPD_ROOT, mmpd_cls))) if mmpd_cls else 0
        cross = sum(1 for c in cross_duplicates if c[0] == cls)
        final = final_counts[cls]
        needed = max(0, 500 - final)
        lines.append(f"| {cls} | {sci} | {common} | {base_n} | {mmpd_n} | {cross} | {final} | {needed} |")
    lines.append("")
    lines.append("## 5. Summary")
    lines.append("")
    lines.append(f"- **Classes:** {len(final_counts)}")
    lines.append(f"- **Total unique original images:** {total}")
    lines.append(f"- **Min images/class:** {min(final_counts.values())}")
    lines.append(f"- **Max images/class:** {max(final_counts.values())}")
    lines.append(f"- **Mean images/class:** {total/len(final_counts):.1f}")
    lines.append("")
    below500 = [(c, n) for c, n in final_counts.items() if n < 500]
    lines.append("## 6. Requirement verdict (25-30 x >=500)")
    lines.append("")
    lines.append(f"- Classes meeting >=500: **{sum(1 for n in final_counts.values() if n>=500)}/{len(final_counts)}**")
    lines.append(f"- Classes below 500: **{len(below500)}**")
    lines.append("")
    lines.append("**STATEMENT:** The original 25-30 classes x >=500 images target is **NOT MET**. "
                 "Public sources meeting all constraints (clearly licensed, non-augmented, reliable "
                 "class mapping) provide up to ~270 images/class. No images were manufactured or "
                 "duplicated to inflate counts.")
    lines.append("")
    lines.append("## 7. Additional images required per class (to reach 500)")
    lines.append("")
    for c, n in below500:
        lines.append(f"- {c}: +{500-n}")
    lines.append("")
    lines.append("## 8. Provenance")
    lines.append("")
    lines.append(f"Full per-image provenance: `reports/dataset/image_provenance.csv` ({len(provenance)} rows).")
    lines.append("Generated by `training/scripts/04_build_final_dataset.py`.")
    lines.append("")

    report_md = os.path.join(REPORT_DIR, "final_dataset_report.md")
    with open(report_md, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] report -> {report_md}")

    # ------------------------------------------------------------------
    # Summary JSON
    # ------------------------------------------------------------------
    summary = {
        "created": CREATED,
        "target_classes": "25-30",
        "target_images_per_class": 500,
        "classes": len(final_counts),
        "total_images": total,
        "final_counts": final_counts,
        "min_per_class": min(final_counts.values()),
        "max_per_class": max(final_counts.values()),
        "mean_per_class": round(total / len(final_counts), 1),
        "cross_dataset_duplicates_removed": len(cross_duplicates),
        "classes_below_500": {c: n for c, n in below500},
        "additional_images_required_total": sum(500 - n for _, n in below500),
        "target_met": False,
        "sources": ["base_cc-by-4.0", "mmpd-30_cc-by-4.0"],
    }
    sum_json = os.path.join(REPORT_DIR, "final_dataset_summary.json")
    with open(sum_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[OK] summary -> {sum_json}")

    # ------------------------------------------------------------------
    # Figures (paper-quality)
    # ------------------------------------------------------------------
    classes = list(final_counts.keys())
    counts = [final_counts[c] for c in classes]
    base_only = [len(list_images(os.path.join(BASE_CLEANED, c))) for c in classes]
    mmpd_only = [len(list_images(os.path.join(MMPD_ROOT, FINAL_CLASSES[c][2]))) if FINAL_CLASSES[c][2] else 0 for c in classes]

    # Figure A: final class distribution (with 500-target line)
    plt.figure(figsize=(13, 6))
    colors = ["#d62728" if n < 500 else "#2ca02c" for n in counts]
    plt.bar(range(len(classes)), counts, color=colors)
    plt.axhline(500, color="black", linestyle="--", label="Target = 500")
    plt.xticks(range(len(classes)), classes, rotation=90)
    plt.ylabel("Unique original images")
    plt.title("Final Dataset — Images per Class (red = below 500 target)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "final_class_distribution.png"), dpi=200)
    plt.close()

    # Figure B: source contribution (stacked base + MMPD)
    plt.figure(figsize=(13, 6))
    plt.bar(range(len(classes)), base_only, color="#1f77b4", label="Base (CC BY 4.0)")
    plt.bar(range(len(classes)), mmpd_only, bottom=base_only, color="#ff7f0e", label="MMPD-30 (CC BY 4.0)")
    plt.xticks(range(len(classes)), classes, rotation=90)
    plt.ylabel("Images")
    plt.title("Final Dataset — Source Contribution per Class")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "final_source_contribution.png"), dpi=200)
    plt.close()

    # Figure C: cross-dataset duplicates by class
    dup_by_class = Counter(c for c, _, _, _ in cross_duplicates)
    dup_classes = sorted(dup_by_class.keys())
    dup_counts = [dup_by_class[c] for c in dup_classes]
    plt.figure(figsize=(10, 5))
    plt.bar(dup_classes, dup_counts, color="#9467bd")
    plt.xticks(rotation=90)
    plt.ylabel("Cross-dataset duplicates removed")
    plt.title("Cross-Dataset (Base vs MMPD-30) Exact Duplicates Removed")
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "final_cross_duplicates.png"), dpi=200)
    plt.close()

    # Figure D: classes below 500
    below = sorted(below500, key=lambda x: x[1])
    b_classes = [c for c, _ in below]
    b_counts = [n for _, n in below]
    plt.figure(figsize=(13, 6))
    plt.bar(b_classes, b_counts, color="#d62728")
    plt.axhline(500, color="black", linestyle="--", label="Target = 500")
    plt.xticks(rotation=90)
    plt.ylabel("Unique images")
    plt.title(f"Classes Below 500-Target ({len(below)}/{len(classes)}) — target NOT MET")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, "final_below_500.png"), dpi=200)
    plt.close()

    print(f"[OK] figures -> {FIG_DIR}")
    print("\n=== FINAL DATASET BUILD COMPLETE (Phase 5.5) ===")
    print(f"Classes: {len(classes)} | Total unique images: {total}")
    print(f"Cross-dataset duplicates removed: {len(cross_duplicates)}")
    print("STOP: model training NOT started (awaiting approval).")


if __name__ == "__main__":
    main()
