# PHYTOVISIONAI — PROJECT STRUCTURE

**Version:** 1.1.0  
**Updated:** September 02, 2026  

---

## Directory Overview

```
PhytoVisionAI_Research/
│
├── .env                                       # Local environment configuration
├── .env.example                               # Environment template
├── .gitignore                                 # Git ignore patterns
├── CLEANUP_MANIFEST.md                        # Log of obsolete/temp files deleted during Phase 3
├── PAPER_VS_CODE_FINAL_AUDIT.md               # Audit comparing research paper claims against actual code
├── PROJECT_DATA_FLOW.md                       # Comprehensive data flow documentation
├── PROJECT_IMPLEMENTATION_STATUS.md           # Implementation status table
├── PROJECT_STRUCTURE.md                       # Workspace structure documentation
├── FINAL_PROJECT_ARCHITECTURE.md              # System architecture documentation
├── PROJECT_AUDIT_REPORT.md                    # Complete read-only audit report
├── PROJECT_AUDIT_SUMMARY.json                 # Machine-readable audit summary
├── README.md                                  # Architectural overview
├── TODO.md                                    # Implementation checklist
│
├── ai_service/                                # Python FastAPI AI Inference Service
│   ├── requirements.txt                       # Python dependencies (fastapi, uvicorn, tensorflow, pillow, numpy, scipy)
│   └── app/
│       ├── main.py                            # FastAPI entry point & CORS configuration
│       ├── routes/
│       │   └── predict.py                     # POST /predict route with image validation & Grad-CAM invocation
│       └── services/
│           ├── inference_service.py           # MobileNetV2 loading, preprocessing, inference, T-scaling, rejection logic
│           └── gradcam_service.py             # Conv_1 feature map extraction, gradient tape, jet heatmap generation
│
├── backend/                                   # Node.js / Express API Gateway
│   ├── package.json                           # Node dependencies (express, cors, dotenv, axios, multer, form-data)
│   ├── package-lock.json                      # Locked npm dependency tree
│   ├── server.js                              # Express server entry point (Port 5000, security headers, logging)
│   ├── config/
│   │   └── config.js                          # Environment loader (.env) & default configurations
│   ├── routes/
│   │   └── predict.js                         # POST /api/predict route with Multer memoryStorage upload handling
│   ├── controllers/
│   │   └── predictController.js               # Express controller forwarding image to AI service & calling research services
│   └── services/
│       └── scientific/
│           ├── researchService.js             # Aggregator orchestrating GBIF, PubChem, Europe PMC, Crossref, Safety, Extraction
│           ├── gbifService.js                 # Dynamic GBIF API taxonomy lookup (species/match & species/{key})
│           ├── pubchemService.js              # Candidate phytochemical lookup & PubChem PUG REST property query
│           ├── europePmcService.js            # Dynamic Europe PMC REST search for medicinal evidence literature
│           ├── crossrefService.js             # Dynamic Crossref API search for research paper metadata
│           ├── safetyService.js               # Pharmacological safety & dosage monograph service
│           └── extractionService.js           # 2-Tier dynamic literature extraction pipeline + curated monograph fallback
│
├── frontend/                                  # React 18 / Vite Web Application
│   ├── package.json                           # Frontend dependencies (react, react-dom, vite, axios)
│   ├── vite.config.js                         # Vite dev server configuration
│   ├── index.html                             # HTML entry template
│   ├── eslint.config.js                       # ESLint configuration
│   └── src/
│       ├── main.jsx                           # React root mounting script
│       ├── App.jsx                            # Single-file main React UI component (upload, prediction, Grad-CAM, 6 research tabs)
│       ├── App.css                            # CSS styles for the web application (with dynamic/static badge styles)
│       └── index.css                          # Base Global CSS resets
│
├── dataset/                                   # Image Dataset Directories
│   ├── raw/                                   # Initial raw Kaggle dataset download (5,945 images)
│   ├── cleaned/                               # Duplicate-cleaned dataset (5,888 unique images)
│   ├── external/                              # Additional dataset downloads (preetam_medicinal_leaf)
│   ├── final/                                 # Merged 40-class dataset (6,788 images)
│   └── final_split/                           # Stratified train (4,740), val (990), test (1,058) split folders
│
├── training/                                  # ML Pipeline & Models
│   ├── models/
│   │   ├── mobilenetv2/
│   │   │   ├── mobilenetv2_best.keras         # Deployed Keras model file (25.91 MB)
│   │   │   ├── class_mapping.json             # Index-to-class JSON mapping (40 classes)
│   │   │   ├── config.json                    # Model architecture & hyperparameter log
│   │   │   ├── history.json                   # Epoch-by-epoch training/val loss and accuracy
│   │   │   ├── environment.json               # System environment metadata (TensorFlow version, GPU, seeds)
│   │   │   └── training_log.csv               # CSV training logs
│   │   └── efficientnetb0/
│   │       ├── efficientnetb0_best.keras      # Experimental EfficientNetB0 baseline model file (20.1 MB)
│   │       ├── class_mapping.json             # Index-to-class JSON mapping
│   │       └── history.json                   # Training history
│   └── scripts/
│       ├── common.py                          # Shared ML utilities (seeds, dataset builder, MD5 leakage verifier, metrics)
│       ├── 01_inspect_dataset.py              # Dataset resolution, format, and corruption scanner
│       ├── 02_clean_dataset.py                # MD5 exact-duplicate removal script
│       ├── 03_split_dataset.py                # 70/15/15 stratified split generator
│       ├── 04_build_final_dataset.py          # Final dataset merging script (6,788 images)
│       ├── 05_train_mobilenetv2.py            # MobileNetV2 2-phase training script
│       ├── 06_train_efficientnetb0.py         # EfficientNetB0 training script
│       ├── 07_evaluate_models.py              # Model evaluation script on test split
│       ├── 08_model_comparison.py             # Metric comparison generator
│       ├── 09_generate_graphs.py              # Graph plot generator
│       ├── 10_calibrate.py                    # Temperature scaling fitting & ECE computation script
│       ├── 11_gradcam.py                      # Standalone Grad-CAM visualizer script
│       ├── 12_model_selection.py              # Weighted rubric model selection script
│       └── finalize_mobilenetv2.py            # Final MobilenetV2 training & evaluation wrapper
│
├── reports/                                   # Evaluation Reports & Manifests
│   ├── dataset/                               # Dataset cleaning, sample metadata, and split statistics CSV/MD reports
│   └── models/
│       ├── eval_mobilenetv2.json              # Detailed MobileNetV2 test set evaluation metrics & confusion matrix
│       ├── eval_efficientnetb0.json           # Detailed EfficientNetB0 test set evaluation metrics
│       ├── selected_model.json                # Model selection rubric scoring result
│       ├── test_predictions_mobilenetv2.npz   # Saved raw logit array for test set
│       └── calibration/
│           ├── calibration_results.json       # Temperature T (0.8037) & Rejection Threshold (0.6234) results
│           ├── confidence_mobilenetv2.csv     # Per-sample test confidence CSV
│           └── reliability_mobilenetv2.csv    # Calibration bin accuracy CSV
│
└── research/                                  # Paper Materials & Figures
    └── figures/                               # Publication-ready PNG plots (loss curves, confusion matrix, Grad-CAM)
```
