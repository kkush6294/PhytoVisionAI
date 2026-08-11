# Phase 3 — Dataset Inspection TODO

- [x] Confirm dataset extraction complete (40 class folders under `dataset/raw/Medicinal plant dataset/`)
- [x] Rewrite `training/scripts/01_inspect_dataset.py` to implement all 14 inspection points
- [x] Run the inspection script (no raw-data modification)
- [x] Verify outputs: `dataset_statistics.csv`, `dataset_report.md`, `dataset_summary.json`
- [x] Verify 6 figures in `research/figures/dataset/`
- [x] Present full statistics + requirement-14 verdict for approval
- [x] Update `PROJECT_STATUS.md` Phase 3 -> COMPLETE after approval

---

# Phase 4 — Data Cleaning TODO

- [x] Create `training/scripts/02_clean_dataset.py` (quarantine-based cleaning)
- [x] Run cleaning script (raw untouched; output to `dataset/cleaned/`)
- [x] Quarantine 57 exact duplicates to `dataset/cleaned/rejected/duplicate/`
- [x] Re-check for corruption / invalid files / low-quality (none found)
- [x] Verify `reports/dataset/cleaning_report.csv`, `.md`, `cleaning_summary.json`
- [x] Report final unique image count/class (5,888 total)

# Phase 5 — Dataset Split TODO

- [x] Create `training/scripts/03_split_dataset.py` (70/15/15, seed=42, stratified)
- [x] Run split script (output to `dataset/train|validation|test/`)
- [x] Verify per-class split counts in `reports/dataset/split_statistics.csv`
- [x] Verify `reports/dataset/split_report.md`, `split_summary.json`
- [x] Verify split figure `research/figures/dataset/split_distribution.png`
- [x] Verify leakage check: NO LEAKAGE (0 MD5 overlap)
- [x] Update `PROJECT_STATUS.md` Phases 4 & 5 -> COMPLETE
- [ ] (Gated) Await approval before Phase 6 (MobileNetV2 / EfficientNetB0 training)

---

# Phase 5.5 — Final Combined Dataset (Option A) TODO

- [x] Investigate supplemental datasets; verify licenses (MMPD-30 CC BY 4.0; Preetam=Unknown, Fuyad=augmented, Agaute=obfuscated → EXCLUDED)
- [x] Create `training/scripts/04_build_final_dataset.py` (base + MMPD-30, global dedup, provenance)
- [x] Run build → `dataset/final/` (30 classes, 5,382 unique original images)
- [x] Verify `image_provenance.csv` (5,382 rows), `final_dataset_report.md`, `final_dataset_summary.json`
- [x] Verify 4 figures in `research/figures/final/`
- [x] Confirm 500/class target NOT MET (documented honestly, no manufactured data)

---

# Phase 6 — Model Training TODO

- [x] Create `05_train_mobilenetv2.py` (two-stage transfer learning, 30 classes)
- [x] Fix `best.evaluate()` compile bug in `05` & `06`
- [x] Finish MobileNetV2 training → `mobilenetv2_best.keras`
- [x] Recover MobileNetV2 reporting artifacts via `finalize_mobilenetv2.py` (config/history/class_map/env) — val_acc 0.9161
- [ ] Finish EfficientNetB0 training (background, async) → `efficientnetb0_best.keras`
- [ ] Recover/finalize EfficientNetB0 reporting artifacts (if script completes, config/history written)
- [ ] Verify both model artifacts complete

---

# Phase 7-12 — Downstream Training Scripts (scaffolding)

- [x] `07_evaluate_models.py` (test-set evaluation — exists)
- [x] `08_model_comparison.py` (aggregate eval → CSV/JSON/MD)
- [x] `09_generate_graphs.py` (publication figures)
- [x] `10_calibrate.py` (Phase 11 calibration + Phase 12 unknown rejection)
- [x] `11_gradcam.py` (Phase 14 genuine Grad-CAM)
- [x] `12_model_selection.py` (Phase 10 weighted selection report)
- [ ] Run 07 (after both models done) → eval_results.json
- [ ] Run 08 → model_comparison.*
- [ ] Run 09 → research/figures/models/*
- [ ] Run 10 → calibration_<model>.json
- [ ] Run 11 → gradcam samples
- [ ] Run 12 → selected_model.json + model_selection.md

