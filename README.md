# PhytoVisionAI_Research

A genuinely new, independent research & AI system for medicinal plant identification and scientific evidence retrieval.

> **Isolation note:** This is a complete, from-scratch implementation. The previous legacy project is reference-only and is **NOT** used, imported, or depended upon.

---

## Project Structure

```
PhytoVisionAI_Research/
│
├── dataset/                         # Raw + processed image data
│   ├── raw/                         # Original Kaggle download (read-only)
│   ├── cleaned/                     # Cleaned data (reproducible pipeline)
│   ├── train/                       # 70% stratified train split
│   ├── validation/                  # 15% stratified validation split
│   └── test/                        # 15% stratified test split
│
├── training/                        # ML training pipeline
│   ├── scripts/                     # 01_inspect / 02_clean / 03_split / ...
│   ├── configs/                     # Experiment YAML/dict configs
│   ├── models/
│   │   ├── mobilenetv2/             # Independent MobileNetV2 experiment
│   │   └── efficientnetb0/          # Independent EfficientNetB0 experiment
│   ├── checkpoints/
│   ├── logs/                        # TensorBoard / training logs
│   ├── results/
│   ├── reports/figures/
│   └── notebooks/
│
├── ai_service/                      # New FastAPI service
│   ├── app/routes/                  # /predict /gradcam /quality
│   ├── app/services/                # model serving, gradcam, quality
│   ├── app/models/                  # TF/Keras model wrappers
│   ├── app/utils/
│   ├── tests/
│   └── requirements.txt
│
├── backend/                         # New Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   │   ├── scientific/              # GBIF, PubChem, Europe PMC, Crossref...
│   │   ├── evidence/                # source tracking & summaries
│   │   └── cache/                   # MongoDB cache layer
│   ├── utils/
│   ├── tests/
│   └── package.json
│
├── frontend/                        # New React/Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/                   # Home, Identify, Result, Plant, Compounds...
│   │   ├── services/                # API client
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── assets/
│   ├── public/
│   └── package.json
│
├── research/                        # Paper-grade research outputs
│   ├── dataset/
│   ├── experiments/                 # experiment_metadata.json
│   ├── model_comparison/
│   ├── figures/dataset|models/
│   ├── tables/
│   ├── evidence/
│   └── paper_material/
│
├── reports/                         # Generated reports (csv/md)
│   ├── dataset/
│   ├── model/
│   ├── scientific_evidence/
│   └── final/
│
├── docs/                            # Architecture/API/setup/experiments docs
├── tests/                           # dataset|model|backend|frontend|integration
├── .env.example
├── README.md
└── PROJECT_STATUS.md
```

---

## Core Design Principles

1. **Zero hardcoding.** No fake confidences, compounds, extraction, safety, papers, or Grad-CAM.
2. **Real ML.** Confidence comes from the trained model + calibration, never hardcoded.
3. **Real Grad-CAM.** Uses actual network activations of the selected model.
4. **Real scientific evidence.** Dynamic retrieval from GBIF, PubChem, Europe PMC, Crossref, etc. — each from the source that actually provides it.
5. **MongoDB as cache only.** Scientific findings come from live APIs; cache is a fallback/performance layer.
6. **Reproducibility.** Fixed seeds, stratified splits, full experiment metadata, leakage prevention.
7. **Fair model comparison.** MobileNetV2 vs EfficientNetB0 under identical protocol; final model chosen by evidence.

---

## Dataset

Source: `warcoder/indian-medicinal-plant-image-dataset` (public Kaggle dataset, no auth required).

```
curl.exe -L -o medicinal_plants.zip "https://www.kaggle.com/api/v1/datasets/download/warcoder/indian-medicinal-plant-image-dataset"
```

Target: 25–30 classes × 500+ **original** images/class (15,000+ total). No duplication/augmentation inflation.

---

## Execution Order

| Phase | Description                          | Status  |
|-------|--------------------------------------|---------|
| 1     | Project structure                    | ✅ Done |
| 2     | Download Kaggle dataset              | Pending |
| 3     | Inspect dataset                      | Pending |
| 4     | Clean dataset                        | Pending |
| 5     | Train/Val/Test split                 | Pending |
| 6–19  | Train, compare, calibrate, Grad-CAM, services, reports | Gated |

**STOP GATE:** Model training does not start until dataset statistics are reviewed and approved.

---

## Getting Started

1. Install Python 3.10+, Node.js 18+, and MongoDB.
2. `pip install -r ai_service/requirements.txt`
3. `npm install` in `backend/` and `frontend/`
4. Copy `.env.example` → `.env` and fill values.
5. Follow the numbered training scripts in `training/scripts/`.

