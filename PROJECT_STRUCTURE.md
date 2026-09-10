# PhytoVisionAI — Codebase Structure

**Project:** PhytoVisionAI — AI-Based Medicinal Plant Identification and Bioactive Compound Analysis System  
**Updated:** September 05, 2026  

---

## Clean Directory Map

```
PhytoVisionAI/
├── .env                                       # Local environment configuration
├── .env.example                               # Environment template
├── .gitignore                                 # Git ignore rules
├── docker-compose.yml                         # Multi-container service configuration
├── FINAL_PROJECT_ARCHITECTURE.md              # Software system architecture guide
├── PROJECT_DATA_FLOW.md                       # Complete request/response data flow documentation
├── PROJECT_STRUCTURE.md                       # This repository directory structure
├── README.md                                  # Main application project documentation
├── start_all.bat                              # One-click Windows development startup script
│
├── ai_service/                                # Python FastAPI AI Inference Service (Port 8000)
│   ├── Dockerfile                             # Container build file
│   ├── requirements.txt                       # Python dependencies (FastAPI, PyTorch/TensorFlow, Pillow, NumPy)
│   └── app/
│       ├── main.py                            # FastAPI entry point & CORS configuration
│       ├── routes/
│       │   └── predict.py                     # POST /predict route with image validation & Grad-CAM invocation
│       └── services/
│           ├── gradcam_service.py             # Feature map extraction (Conv_1) & Grad-CAM visualizer
│           └── inference_service.py           # MobileNetV2 loader, preprocessing, T-scaling & rejection logic
│
├── backend/                                   # Node.js / Express API Gateway (Port 5000)
│   ├── Dockerfile                             # Container build file
│   ├── package.json                           # Node dependencies (express, mongoose, axios, multer, jwt)
│   ├── package-lock.json                      # Locked npm dependency tree
│   ├── server.js                              # Express gateway server entry point
│   ├── db.js                                  # MongoDB connection lifecycle manager
│   ├── config/
│   │   └── config.js                          # Environment loader & default configuration
│   ├── controllers/
│   │   ├── authController.js                  # User registration, login, and guest session handling
│   │   ├── extractionController.js            # Dynamic laboratory extraction guidance endpoint
│   │   ├── historyController.js               # User plant identification history logging
│   │   ├── plantController.js                 # 40-class plant metadata & local-name search
│   │   ├── predictController.js               # Gateway image upload & scientific service aggregator
│   │   ├── recommendationController.js        # Symptom- and indication-based recommendation engine
│   │   ├── safetyController.js                # Pharmacovigilance, toxicity, and dosage guidance
│   │   └── savedPlantController.js            # User personal saved-plants library manager
│   ├── middleware/
│   │   └── auth.js                            # JWT authentication & guest permission verification
│   ├── models/
│   │   ├── History.js                         # Mongoose schema for identification history
│   │   ├── Plant.js                           # Mongoose schema for 40 botanical taxa records
│   │   ├── SavedPlant.js                      # Mongoose schema for saved plant bookmarks
│   │   └── User.js                            # Mongoose schema for researcher user accounts
│   ├── routes/
│   │   ├── auth.js                            # /api/auth routes
│   │   ├── condition.js                       # /api/conditions routes
│   │   ├── extraction.js                      # /api/extraction routes
│   │   ├── history.js                         # /api/history routes
│   │   ├── plant.js                           # /api/plants routes
│   │   ├── predict.js                         # /api/predict routes
│   │   ├── recommendation.js                  # /api/recommendations routes
│   │   ├── safety.js                          # /api/safety routes
│   │   └── savedPlant.js                      # /api/saved-plants routes
│   ├── seed/
│   │   ├── buildData.js                       # Seed dataset generator script
│   │   ├── plantEvidenceData.js               # Curated monographs, indications, and safety data
│   │   ├── plantsData.json                    # Compiled JSON dataset for 40 botanical taxa
│   │   ├── scientific_map.json                # Canonical mapping for local, scientific, and common names
│   │   └── seedPlants.js                      # MongoDB population script
│   ├── services/
│   │   ├── authService.js                     # Authentication token generator
│   │   └── scientific/
│   │       ├── conditionService.js            # Symptom query normalizer and matcher
│   │       ├── crossrefService.js             # Crossref publication and DOI fetcher
│   │       ├── europePmcService.js            # Europe PMC biomedical literature fetcher
│   │       ├── extractionService.js           # Dynamic extraction parser & monograph fallback
│   │       ├── gbifService.js                 # GBIF botanical taxonomy matcher
│   │       ├── pubchemService.js              # PubChem chemical structure & CID fetcher
│   │       ├── researchService.js             # Master scientific aggregator service
│   │       └── safetyService.js               # Pharmacological safety monograph service
│   └── tests/                                 # Backend integration test suites
│       ├── test_indications.js               # Condition recommendation test suite
│       ├── test_leaf_rgb.jpg                  # Test fixture image
│       ├── test_local_names_and_dynamic_extraction.js # Local names & extraction validation suite
│       ├── test_phase2_4.js                   # Auth, history, and saved-plants suite
│       ├── test_phase2_5.js                   # Extraction and safety guidance suite
│       ├── test_phase2_6.js                   # Advanced integration suite
│       ├── test_phase2_8.js                   # System orchestration test suite
│       └── test_upload_prediction.js          # Direct image upload test suite
│
├── frontend/                                  # React 18 / Vite Single-Page Application (Port 5173)
│   ├── Dockerfile                             # Frontend container build file
│   ├── index.html                             # Single-page HTML application entry point
│   ├── nginx.conf                             # Production web server configuration
│   ├── package.json                           # Frontend dependencies (react, vite, axios)
│   ├── package-lock.json                      # Locked npm dependency tree
│   ├── vite.config.js                         # Vite build and proxy configuration
│   └── src/
│       ├── App.css                            # Global styles and layout
│       ├── App.jsx                            # Root component with ErrorBoundary and view router
│       ├── index.css                          # CSS baseline resets
│       ├── main.jsx                           # React DOM mount point
│       ├── ResultDashboard.css                # Styling for 7-card scientific dashboard
│       ├── AnalysisView.css                   # Styling for Grad-CAM analysis screen
│       ├── assets/                            # Botanical branding assets
│       ├── components/
│       │   ├── AnalysisView.jsx               # Dedicated AI model and Grad-CAM view
│       │   ├── AuthModal.jsx                  # Researcher authentication dialog
│       │   ├── HistoryView.jsx                # User identification history view
│       │   ├── Navbar.jsx                     # Top navigation header
│       │   ├── ProfileView.jsx                # Researcher profile & saved plants library
│       │   ├── RecommendationsView.jsx        # Symptom-based recommendation explorer
│       │   └── ResultDashboard.jsx            # Main 7-card identification dashboard
│       └── services/
│           └── api.js                         # Centralized Axios client for all backend REST endpoints
│
├── dataset/                                   # Botanical Image Datasets (40 Classes)
│   ├── cleaned/                               # De-duplicated images per botanical class
│   └── final_split/                           # Stratified train, val, and test splits
│
├── reports/                                   # Verification & Reproducibility Metrics
│   ├── dataset/                               # Dataset cleaning and split verification reports
│   └── models/                                # Model weights, calibration JSONs, manifests
│       ├── mobilenetv2_best.pth               # PyTorch model weights file
│       ├── test_manifest.csv                  # Test set split manifest
│       ├── train_manifest.csv                 # Training set split manifest
│       ├── val_manifest.csv                   # Validation set split manifest
│       └── calibration/                       # Temperature scaling calibration metadata
│
├── tests/                                     # Root Integration Tests
│   └── integration/
│       └── test_foundation.py                 # End-to-end Python requests test suite
│
└── training/                                  # Model Training & Reproducibility Pipeline
    ├── configs/                               # Training configurations
    ├── logs/                                  # Training execution logs
    ├── models/                                # Model architecture checkpoints & history
    │   ├── efficientnetb0/
    │   └── mobilenetv2/
    └── scripts/                               # Numbered reproducible pipeline scripts (01–12)
```
