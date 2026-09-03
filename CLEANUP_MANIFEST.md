# PHYTOVISIONAI — CLEANUP MANIFEST

**Date:** September 02, 2026  
**Scope:** Phase 3 Safe Codebase Cleanup  

---

## Summary of File Categorization

- **Category A (Production Runtime):** Retained (All active frontend, backend, AI service, configuration, and MobileNetV2 model files).
- **Category B (Training & Reproducibility):** Retained (All dataset split files, dataset preprocessing scripts, model training scripts, and calibration scripts).
- **Category C (Documentation & Reports):** Retained (README, reports, research figures, calibration JSONs).
- **Category D (Experimental Baseline):** Retained (`training/models/efficientnetb0/` retained for paper baseline comparison tables).
- **Category E & F (Obsolete / Temp / Empty Logs):** **DELETED.**

---

## Deleted Files Log

| Deleted File Path | Size | Category | Reason for Deletion | Evidence / Impact |
| :--- | :---: | :---: | :--- | :--- |
| `calib_stderr.log` | 0 B | F | Empty leftover log file from calibration run | Unreferenced, 0 impact |
| `calib_stdout.log` | 0 B | F | Empty leftover log file from calibration run | Unreferenced, 0 impact |
| `calib_u_stderr.log` | 0 B | F | Empty leftover log file from calibration run | Unreferenced, 0 impact |
| `calib_u_stdout.log` | 0 B | F | Empty leftover log file from calibration run | Unreferenced, 0 impact |
| `calib_run2_stderr.log` | 3,974 B | E | Leftover process error log in root | Unreferenced, 0 impact |
| `calib_run2_stdout.log` | 2,546 B | E | Leftover process stdout log in root | Unreferenced, 0 impact |
| `gradcam_mn_stderr.log` | 3,344 B | E | Leftover process error log from Grad-CAM test run | Unreferenced, 0 impact |
| `gradcam_mn_stdout.log` | 130 B | E | Leftover process stdout log from Grad-CAM test run | Unreferenced, 0 impact |
| `writetest.log` | 150 B | E | Scratch file created during disk write test | Unreferenced, 0 impact |
| `_marker_test.txt` | 5 B | E | Scratch marker file created during permission test | Unreferenced, 0 impact |
| `_writetest.txt` | 1 B | E | Scratch marker file created during permission test | Unreferenced, 0 impact |
| `response.json` | 60,371 B | E | Root debug dump of API response | Unreferenced, 0 impact |
| `training/calib_run.log` | 0 B | F | Empty leftover log file in training folder | Unreferenced, 0 impact |

---

## Retained Critical Artifacts Verification

- **Deployed Model:** `training/models/mobilenetv2/mobilenetv2_best.keras` (VERIFIED INTRACT)
- **Class Mapping:** `training/models/mobilenetv2/class_mapping.json` (VERIFIED INTACT)
- **Calibration Metadata:** `reports/models/calibration/calibration_results.json` (VERIFIED INTACT)
- **Reproducibility Scripts:** All 12 training scripts in `training/scripts/` (VERIFIED INTACT)
- **Dataset:** 6,788 images across 40 classes in `dataset/final_split/` (VERIFIED INTACT)
