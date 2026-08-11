# PROJECT STATUS

## PhytoVisionAI_Research — Independent Research Project

| Item            | Value             |
|-----------------|-------------------|
| OLD PROJECT     | **NOT USED**      |
| NEW PROJECT     | **ACTIVE**        |

---

## Isolation Checklist

| Requirement                              | Status      |
|------------------------------------------|-------------|
| New root folder (`PhytoVisionAI_Research/`) exists | ✅ Created |
| No old source files are imported         | ✅ New implementation |
| No old model is loaded                   | ✅ No OLD/Keras/H5 models used |
| No old dataset is used                   | ✅ New Kaggle download |
| No old seed data is used                 | ✅ No seed data reused |
| No old React component is imported       | ✅ New frontend |
| No old backend service is imported       | ✅ New backend |
| No old Grad-CAM implementation is used   | ✅ New implementation |
| No old hardcoded scientific data is used | ✅ Zero-hardcoding policy |

---

## Current Phase

**PHASE 5 — Train/Validation/Test split** (COMPLETE)

Follow the execution order: Phases 1 → 19. Do NOT skip phases.

- Phase 1: Create new project structure (COMPLETE)
- Phase 2: Download Kaggle dataset (COMPLETE)
- Phase 3: Inspect dataset (COMPLETE)
- Phase 4: Clean dataset (COMPLETE)
- Phase 5: Train/Validation/Test split (COMPLETE)
- Phase 6–19: Training, model comparison, calibration, Grad-CAM, AI service, scientific APIs, backend, frontend, evidence, testing, reports (PENDING — gated on dataset approval)

## Phase 4/5 Results (baseline)

- Dataset: `warcoder/indian-medicinal-plant-image-dataset` (Kaggle, public, CC BY 4.0)
- Raw: 40 classes, 5,945 images
- Cleaned: 5,888 unique images (57 exact duplicates quarantined to `dataset/cleaned/rejected/duplicate/`)
- No corruption, invalid files, or low-quality rejections
- Split: 70/15/15 (seed=42) → Train 4,116 / Validation 886 / Test 886
- Leakage check: **NO LEAKAGE** (0 MD5 overlap across splits)
- Reports: `reports/dataset/cleaning_report.*`, `reports/dataset/split_report.*`
- Figure: `research/figures/dataset/split_distribution.png`

## STOP GATE

Model training (MobileNetV2 / EfficientNetB0) is **NOT** started until the dataset statistics are reviewed and approved.
