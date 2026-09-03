# PHYTOVISIONAI — COMPLETE READ-ONLY AUDIT REPORT

**Audit Date:** September 02, 2026  
**Auditor:** Antigravity AI (Google DeepMind Team)  
**Project Workspace:** `PhytoVisionAI_Research`  
**Audit Scope:** 100% Read-Only Codebase & Dataset Inspection  

> [!IMPORTANT]
> **READ-ONLY AUDIT GUARANTEE**  
> No project files, dataset splits, trained models, configurations, or source code files were created, modified, retrained, renamed, moved, or deleted during this audit. All findings in this document are strictly grounded in empirical analysis of the actual source code files in the repository.

---

## PART 1 — COMPLETE FILE STRUCTURE

### Project File Tree & Codebase Inventory

```
PhytoVisionAI_Research/
│
├── .env                                       # Local environment variables (Port: 5000, AI_URL: http://127.0.0.1:8000)
├── .env.example                               # Environment template
├── .gitignore                                 # Git ignore patterns
├── PROJECT_STATUS.md                          # Phase tracking documentation (partially outdated wrt final dataset size)
├── README.md                                  # Architectural overview doc (contains aspirational/unimplemented claims)
├── TODO.md                                    # Project TODO checklist
│
├── ai_service/                                # Python FastAPI AI Inference Service
│   ├── requirements.txt                       # Python dependencies (fastapi, uvicorn, tensorflow, pillow, numpy, scipy)
│   └── app/
│       ├── main.py                            # FastAPI entry point & lifespan manager (loads model on startup)
│       ├── routes/
│       │   └── predict.py                     # POST /predict route with image validation & Grad-CAM invocation
│       └── services/
│           ├── inference_service.py           # Model loading, preprocessing, inference, T-scaling, rejection logic
│           └── gradcam_service.py             # Conv_1 feature map extraction, gradient tape, jet heatmap generation
│
├── backend/                                   # Node.js / Express API Gateway
│   ├── package.json                           # Node dependencies (express, cors, dotenv, axios, multer, form-data)
│   ├── package-lock.json                      # Locked npm dependency tree
│   ├── server.js                              # Express server entry point (Port 5000, CORS, logging, health route)
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
│           ├── safetyService.js               # Hardcoded static pharmacological safety & dosage dictionary
│           └── extractionService.js           # Hardcoded static laboratory extraction guidance dictionary
│
├── frontend/                                  # React 18 / Vite Web Application
│   ├── package.json                           # Frontend dependencies (react, react-dom, vite, axios)
│   ├── vite.config.js                         # Vite dev server configuration
│   ├── index.html                             # HTML entry template
│   ├── eslint.config.js                       # ESLint configuration
│   └── src/
│       ├── main.jsx                           # React root mounting script
│       ├── App.jsx                            # Single-file main React UI component (upload, prediction, Grad-CAM, research tabs)
│       ├── App.css                            # Complete CSS styles for the web application
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
│   │   │   ├── mobilenetv2_best.keras         # Final deployed Keras model file (25.91 MB)
│   │   │   ├── class_mapping.json             # Index-to-class JSON mapping (40 classes)
│   │   │   ├── config.json                    # Model architecture & hyperparameter log
│   │   │   ├── history.json                   # Epoch-by-epoch training/val loss and accuracy
│   │   │   ├── environment.json               # System environment metadata (TensorFlow version, GPU, seeds)
│   │   │   └── training_log.csv               # CSV training logs
│   │   └── efficientnetb0/
│   │       ├── efficientnetb0_best.keras      # Experimental EfficientNetB0 model file (20.1 MB)
│   │       ├── class_mapping.json             # Index-to-class JSON mapping
│   │       └── history.json                   # Training history (poor performance baseline)
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

---

### Detailed File Analysis

| File Path | 1. Primary Function | 2. Actually Used? | 3. Called / Imported By | 4. Code Status |
| :--- | :--- | :--- | :--- | :--- |
| `ai_service/app/main.py` | FastAPI app startup & model initializer | YES | Execution entry point (`uvicorn app.main:app`) | Active |
| `ai_service/app/routes/predict.py` | `/predict` endpoint handler | YES | Included by `main.py` router | Active |
| `ai_service/app/services/inference_service.py` | Runs inference, T-scaling, rejection | YES | Called by `routes/predict.py` | Active |
| `ai_service/app/services/gradcam_service.py` | Generates Grad-CAM heatmap & overlay | YES | Called by `routes/predict.py` | Active |
| `backend/server.js` | Express HTTP gateway on port 5000 | YES | Execution entry point (`node server.js`) | Active |
| `backend/routes/predict.js` | Express `/api/predict` route + Multer | YES | Mounted by `server.js` | Active |
| `backend/controllers/predictController.js` | Receives image, calls AI service & APIs | YES | Called by `backend/routes/predict.js` | Active |
| `backend/services/scientific/researchService.js` | Scientific API orchestrator | YES | Called by `predictController.js` | Active |
| `backend/services/scientific/gbifService.js` | Fetches taxonomy from GBIF API | YES | Called by `researchService.js` | Active |
| `backend/services/scientific/pubchemService.js` | Fetches chemical properties from PubChem | YES | Called by `researchService.js` | Active |
| `backend/services/scientific/europePmcService.js` | Fetches papers from Europe PMC API | YES | Called by `researchService.js` | Active |
| `backend/services/scientific/crossrefService.js` | Fetches papers from Crossref API | YES | Called by `researchService.js` | Active |
| `backend/services/scientific/safetyService.js` | Returns safety/dosage data | YES | Called by `researchService.js` | Active (Static Data) |
| `backend/services/scientific/extractionService.js` | Returns extraction protocol data | YES | Called by `researchService.js` | Active (Static Data) |
| `frontend/src/App.jsx` | Single-page UI component | YES | Mounted by `main.jsx` | Active |
| `training/models/mobilenetv2/mobilenetv2_best.keras` | Deployed MobileNetV2 model | YES | Loaded by `inference_service.py` | Active Final Model |
| `training/models/efficientnetb0/efficientnetb0_best.keras` | EfficientNetB0 baseline | NO (Inference) | Loaded only by evaluation scripts | Legacy/Experiment |
| `training/scripts/05_train_mobilenetv2.py` | MobileNetV2 training script | NO (Runtime) | Run offline during training phase | Offline Pipeline |
| `training/scripts/10_calibrate.py` | Temperature calibration script | NO (Runtime) | Run offline to generate `calibration_results.json` | Offline Pipeline |
| `reports/models/calibration/calibration_results.json` | Stores T=0.8037 and Threshold=0.6234 | NO (Directly) | Embedded as constants in `inference_service.py` | Static Metadata |

---

## PART 2 — ACTUAL TECHNOLOGY STACK

### Detailed Technology Audit

- **Frontend:**
  - **Framework:** React `18.2.0`
  - **Build Tool:** Vite `5.2.0`
  - **HTTP Client:** Axios `1.6.8`
  - **State Management:** Local React `useState` hooks inside single-component `App.jsx` (No Redux, Zustand, or Context API).
  - **Styling:** Custom CSS stylesheet (`App.css`, `index.css`). No Tailwind, Material UI, or Bootstrap.

- **Backend:**
  - **Framework:** Express `4.19.2`
  - **Runtime:** Node.js (`>=18.0.0`)
  - **Middleware:** `cors` `2.8.5`, `express.json()`, `express.urlencoded()`, `multer` `1.4.5-lts.1` (`memoryStorage()`).
  - **Authentication:** **NONE** (No JWT, `bcrypt`, session management, or Passport.js implemented).

- **AI Service:**
  - **Framework:** FastAPI `0.110.0`
  - **ASGI Server:** Uvicorn `0.28.0`
  - **ML Framework:** TensorFlow `2.21.0` / Keras
  - **Image & Numerical Libraries:** Pillow `10.2.0`, NumPy `2.2.6`, SciPy `>=1.14.1`, Matplotlib (headless `Agg` mode for Grad-CAM).

- **Database:**
  - **Status:** **NOT PRESENT**
  - **Verification:** No database drivers (`mongoose`, `mongodb`, `pg`, `mysql2`, `sequelize`, `prisma`) exist in `backend/package.json`. No active database connection or ORM code exists.

- **Storage:**
  - **Image Storage:** In-memory buffers (`multer.memoryStorage()` in Express, `io.BytesIO()` in FastAPI). Images are processed on-the-fly and never persisted to disk during normal prediction requests.
  - **Model File:** Local filesystem (`training/models/mobilenetv2/mobilenetv2_best.keras`).
  - **Grad-CAM Artifacts:** Transmitted directly to frontend as Base64-encoded Data URLs (`data:image/jpeg;base64,...`). No cloud storage (Cloudinary or AWS S3) is used.

- **External Services Audit:**
  - **GBIF API:** **ACTUALLY USED** (`https://api.gbif.org/v1/species/match` & `/species/{key}`) in `gbifService.js`.
  - **PubChem PUG REST API:** **ACTUALLY USED** (`https://pubchem.ncbi.nlm.nih.gov/rest/pug`) in `pubchemService.js`.
  - **Europe PMC REST API:** **ACTUALLY USED** (`https://www.ebi.ac.uk/europepmc/webservices/rest/search`) in `europePmcService.js`.
  - **Crossref API:** **ACTUALLY USED** (`https://api.crossref.org/works`) in `crossrefService.js`.
  - **OpenWeatherMap:** **NOT USED** (0 mentions in source code).
  - **Gemini API:** **NOT USED** (0 mentions in backend or AI service code).
  - **Cloudinary:** **NOT USED** (0 mentions in source code).

---

## PART 3 — COMPLETE IMAGE-TO-RESULT FLOW

```
[User selects image] 
       │
       ▼
[frontend/src/App.jsx] -> handleFileChange() stores file in local state
       │
       ▼
[frontend/src/App.jsx] -> handlePredict() sends HTTP POST request
       │  (Endpoint: http://127.0.0.1:5000/api/predict, Body: FormData 'image')
       ▼
[backend/routes/predict.js] -> Multer memoryStorage intercepts file
       │
       ▼
[backend/controllers/predictController.js] -> predictImage()
       │  Validates MIME type & size (<5MB), constructs FormData, forwards request via Axios
       ▼
[ai_service/app/routes/predict.py] -> predict()
       │  Endpoint: POST http://127.0.0.1:8000/predict
       │  Validates image integrity & dimensions via PIL
       ▼
[ai_service/app/services/inference_service.py] -> InferenceService.predict()
       │  1. Preprocessing: Resizes PIL image to 224x224 RGB, applies mobilenet_preprocess() (scales [-1, 1])
       │  2. MobileNetV2 inference: Raw softmax probabilities output from model.predict()
       │  3. Logit extraction: logits = np.log(np.clip(raw_probs, 1e-12, 1.0))
       │  4. Calibration: calibrated_logits = logits / 0.8037
       │  5. Calibrated Softmax: calibrated_probs = softmax(calibrated_logits)
       │  6. Rejection check: Is max(calibrated_probs) < 0.6234?
       │     If YES -> Set class="Unknown", scientificName="Unknown", rejected=true
       ▼
[ai_service/app/services/gradcam_service.py] -> GradcamService.generate_gradcam()
       │  Generates Grad-CAM Base64 images (original, heatmap, overlay) using target layer Conv_1
       ▼
[ai_service/app/routes/predict.py] returns JSON prediction object to Express backend
       │
       ▼
[backend/controllers/predictController.js]
       │  If prediction is accepted (!rejected):
       │     Calls backend/services/scientific/researchService.js -> getResearchData()
       │     Concurrent Promise.all calls to:
       │       - gbifService.js (Taxonomy lookup)
       │       - pubchemService.js (Bioactive compound verification)
       │       - europePmcService.js (Medicinal literature search)
       │       - crossrefService.js (Research paper search)
       │     Synchronous local lookup calls to:
       │       - safetyService.js (Pharmacological safety & dosage)
       │       - extractionService.js (Laboratory extraction protocols)
       ▼
[backend/controllers/predictController.js] merges AI prediction + scientific evidence into final JSON
       │
       ▼
[frontend/src/App.jsx] receives HTTP 200 response -> updates 'result' state
       │
       ▼
[frontend/src/App.jsx] renders prediction card, confidence bar, Grad-CAM visualization, and 6 research tabs
```

---

## PART 4 — MOBILENETV2 MODEL

### Implementation Details

- **Model Architecture:**
  - Base Backbone: `MobileNetV2` (ImageNet pre-trained weights, input `224x224x3`, `include_top=False`)
  - Global Average Pooling: `GlobalAveragePooling2D()`
  - Dense Layer 1: `Dense(256, activation="relu", name="dense")`
  - Dropout Layers: `Dropout(0.2)`
  - Classification Head: `Dense(40, activation="softmax", name="classifier")`
- **Model File Path:** `training/models/mobilenetv2/mobilenetv2_best.keras`
- **Model Parameters:** Total: `2,596,200` | Trainable: `2,019,560` | Size: `25.91 MB`
- **Model Loading Code:**
  ```python
  # ai_service/app/services/inference_service.py (Lines 76–77)
  self.model = tf.keras.models.load_model(model_path, compile=False)
  ```
- **Preprocessing:** `tensorflow.keras.applications.mobilenet_v2.preprocess_input` (scales pixel values to `[-1.0, 1.0]`).
- **Class Mapping File:** `training/models/mobilenetv2/class_mapping.json` (40 target classes mapped from index `0` to `39`).

### Calibration & Rejection Audit

In `ai_service/app/services/inference_service.py`:
```python
TEMPERATURE = 0.8037
REJECTION_THRESHOLD = 0.6234
```

> [!NOTE]
> **VERIFICATION CONFIRMED**  
> `TEMPERATURE = 0.8037` and `REJECTION_THRESHOLD = 0.6234` are **ACTUALLY IMPLEMENTED** in the active inference pipeline in `inference_service.py`. While inline code comments contain leftover draft numbers (`0.8126` and `0.5982`), the actual executed code variables strictly enforce `0.8037` and `0.6234`.

---

## PART 5 — DATASET

### Structure & Splits

- **Raw Dataset:** `dataset/raw/Medicinal plant dataset/` (5,945 raw images across 40 folders).
- **Cleaned Dataset:** `dataset/cleaned/` (5,888 unique images; 57 exact duplicate images removed by MD5 checksum).
- **Final Merged Dataset:** `dataset/final/` (6,788 total images across 40 classes, enriched with `preetam_medicinal_leaf` dataset).
- **Final Split (`dataset/final_split/`):**
  - **Train:** 4,740 images (70%)
  - **Validation:** 990 images (15%)
  - **Test:** 1,058 images (15%)
  - **Total:** 6,788 images across 40 valid medicinal plant classes.
- **Cross-Split Leakage Check:** **0 cross-split duplicate overlap** (verified by `verify_leakage()` in `training/scripts/common.py`).

### Verified 40 Plant Classes

1. `Aloevera`
2. `Amla`
3. `Amruta_Balli` *(Previously missing - verified present)*
4. `Arali` *(Previously missing - verified present)*
5. `Ashoka`
6. `Ashwagandha`
7. `Avacado` *(Previously missing - verified present)*
8. `Bamboo` *(Previously missing - verified present)*
9. `Basale` *(Previously missing - verified present)*
10. `Betel`
11. `Betel_Nut` *(Previously missing - verified present)*
12. `Brahmi`
13. `Castor`
14. `Curry_Leaf`
15. `Doddapatre`
16. `Ekka` *(Previously missing - verified present)*
17. `Ganike` *(Previously missing - verified present)*
18. `Gauva`
19. `Geranium`
20. `Henna`
21. `Hibiscus`
22. `Honge`
23. `Insulin`
24. `Jasmine`
25. `Lemon`
26. `Lemon_grass`
27. `Mango`
28. `Mint`
29. `Nagadali`
30. `Neem`
31. `Nithyapushpa` *(Previously missing - verified present)*
32. `Nooni` *(Previously missing - verified present)*
33. `Pappaya`
34. `Pepper`
35. `Pomegranate`
36. `Raktachandini`
37. `Rose`
38. `Sapota`
39. `Tulasi`
40. `Wood_sorel`

---

## PART 6 — MODEL TRAINING CODE

| Script Path | Model Target | Status | Outcome / Note |
| :--- | :--- | :--- | :--- |
| `training/scripts/05_train_mobilenetv2.py` | MobileNetV2 | Primary Baseline | Initial 40-class training run |
| `training/scripts/06_train_efficientnetb0.py` | EfficientNetB0 | Experimental Baseline | Poor convergence (Top-1 Test Acc: 4.44%) |
| `training/scripts/finalize_mobilenetv2.py` | MobileNetV2 | **FINAL DEPLOYED MODEL** | Trained on final 6,788 image dataset |

### Training Hyperparameters (MobileNetV2 Final)
- **Phase 1 (Classification Head):** 25 Epochs, Learning Rate = `1e-4`, Adam Optimizer, Frozen Backbone.
- **Phase 2 (Fine-tuning):** 20 Epochs, Learning Rate = `1e-5`, Unfrozen top layers of MobileNetV2 backbone.
- **Augmentation (Train only):** Random flip, random rotation (0.2), random zoom (0.15), random translation (0.1), random brightness/contrast.

---

## PART 7 — GRAD-CAM

### Verification of Grad-CAM Implementation

- **Service File:** `ai_service/app/services/gradcam_service.py`
- **Backbone Layer Targeted:** `Conv_1` layer inside `mobilenetv2_1.00_224` (feature map shape `7x7x1280`).
- **Gradient Calculation:**
  ```python
  with tf.GradientTape() as tape:
      conv_output, backbone_output = target_model(preprocessed_img, training=False)
      # Forward pass through head
      ...
      class_score = predictions[:, class_index]
  gradients = tape.gradient(class_score, conv_output)
  ```
- **Heatmap Computation:** Global average pooling of gradients $\alpha_k = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{i,j}^k}$, followed by ReLU combination $L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k A^k\right)$.
- **Color Overlay:** Upsampled to `224x224`, mapped using Matplotlib `jet` colormap, blended via $0.6 \times I_{\text{orig}} + 0.4 \times I_{\text{heatmap}}$.
- **Target Class Verification:** **VERIFIED**. `GradcamService.generate_gradcam()` receives `predicted_idx` (the index of the highest predicted class) directly from `inference_service.predict()`.

---

## PART 8 — DATABASE

> [!WARNING]
> **DATABASE STATUS: NOT IMPLEMENTED**  
> The current PhytoVisionAI implementation does **NOT** contain a database. No MongoDB, PostgreSQL, SQLite, or ORM is connected or installed.

### Storage Reality Table

| Data Type | Stored Where | Collection / File Path | Permanent? |
| :--- | :--- | :--- | :--- |
| **Users / Authentication** | Nowhere | None | No |
| **Plant Taxonomy** | External API | GBIF API (`api.gbif.org`) | No (Live API) |
| **Bioactive Compounds** | Local Code + API | `pubchemService.js` + PubChem PUG REST | Mixed (Candidates in file, properties live) |
| **Extraction Information** | **Local JS File** | `backend/services/scientific/extractionService.js` | **Permanent in file (Hardcoded)** |
| **Safety & Dosage Data** | **Local JS File** | `backend/services/scientific/safetyService.js` | **Permanent in file (Hardcoded)** |
| **Medicinal Literature** | External API | Europe PMC REST API | No (Live API) |
| **Research Papers** | External API | Crossref REST API | No (Live API) |
| **Comments / Community** | Nowhere | None | No |
| **Favorites / Likes** | Nowhere | None | No |
| **Prediction History** | HTTP Response Only | Transient React state (`App.jsx`) | No (Lost on page refresh) |

---

## PART 9 — EXTERNAL DATA SOURCES

| External Service | Actually Used? | Primary File | Primary Function | Endpoint Called | Purpose | Stored? |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **GBIF** | **YES** | `gbifService.js` | `getTaxonomy()` | `/v1/species/match` & `/v1/species/{key}` | Botanical taxonomy classification | No |
| **PubChem** | **YES** | `pubchemService.js` | `searchCompounds()` | `/rest/pug/compound/name/...` | Chemical property lookup (CID, SMILES) | No |
| **Europe PMC** | **YES** | `europePmcService.js` | `searchMedicinalEvidence()` | `/europepmc/webservices/rest/search` | Literature abstracts & citation counts | No |
| **Crossref** | **YES** | `crossrefService.js` | `searchResearchPapers()` | `https://api.crossref.org/works` | DOI & journal paper metadata | No |
| **OpenWeatherMap** | **NO** | None | None | None | None | No |
| **Gemini AI** | **NO** | None | None | None | None | No |
| **Cloudinary** | **NO** | None | None | None | None | No |

---

## PART 10 — PUBCHEM / BIOACTIVE COMPOUNDS

### Flow & Storage Breakdown

1. **Taxonomy & Name Resolution:** Plant class name (e.g., `Neem`) is resolved via internal name normalizer in `pubchemService.js`.
2. **Candidate Phytochemical Mapping:** Candidate compound names (e.g., `Azadirachtin`, `Nimbin`, `Nimbolide`, `Quercetin`, `Catechin`) are retrieved from the hardcoded dictionary `PLANT_COMPOUND_CANDIDATES` in `pubchemService.js`.
3. **Dynamic PubChem CID Resolution:** Each candidate name is queried against PubChem via `searchCompoundByName()` to retrieve verified PubChem CIDs.
4. **Property Lookup:** Chemical properties (`Title`, `IUPACName`, `ConnectivitySMILES`) are dynamically queried for verified CIDs via PubChem PUG REST API.
5. **Fallback:** If PubChem returns no records or fails, `searchCompounds()` returns an empty array with an explicit message: `"No verified PubChem compound records were found for the configured phytochemical candidates."`

> [!NOTE]
> **COMPOUND STORAGE STATUS:** **HYBRID (Candidates hardcoded, chemical properties dynamically retrieved from PubChem).** Candidate names are pre-configured in code, but their chemical structures, CIDs, SMILES strings, and IUPAC names are queried live from PubChem.

---

## PART 11 — EXTRACTION INFORMATION

### Audit of Extraction Protocol Claims

> [!CAUTION]
> **STATEMENT AUDIT:**  
> *"The system automatically retrieves evidence-grounded extraction protocols from peer-reviewed scientific literature and extracts method, solvent, temperature, duration, preparation procedure, and citation."*  
> **VERDICT:** **FALSE.**

### Exact Implementation Details

1. **Does extraction information exist?** YES.
2. **Where is it stored?** Inside `backend/services/scientific/extractionService.js`.
3. **Is it MongoDB?** NO.
4. **Is it JSON?** NO (It is a JavaScript object).
5. **Is it JavaScript?** YES (`PLANT_EXTRACTION_GUIDANCE` object in `extractionService.js`).
6. **Is it hardcoded?** **YES.** All extraction protocols for all 40 plant classes are statically hardcoded in JavaScript.
7. **Is it manually curated?** YES (Curated from literature references into code).
8. **Is it retrieved dynamically?** **NO.**
9. **Are scientific papers or Gemini involved?** **NO.** Europe PMC, Crossref, PubChem, and Gemini are **NOT** queried for extraction protocols.
10. **Is there a fallback?** YES (`available: false` with message `"Information unavailable from retrieved scientific sources."` for unknown plants).
11. **Backend Route:** Returned in POST `/api/predict` via `predictController.js`.
12. **Frontend Component:** Rendered under the **"Extraction Guidance"** tab (`activeResearchTab === "extraction"`) in `App.jsx`.

---

## PART 12 — SAFETY / DOSAGE / TOXICITY

### Audit of Safety Information

- **Source:** Hardcoded static JavaScript dictionary `PLANT_SAFETY_EVIDENCE` inside `backend/services/scientific/safetyService.js`.
- **Fields Provided:** `recommendedDosage`, `toxicityLevel`, `precautions` (Array), `safetyNotes`, `source` (Monograph citation).
- **Dynamic Retrieval / AI Generation:** **NONE.** Values like `"Recommended Dosage: 300-600 mg standardized root extract daily"`, `"Toxicity Level: Low to Moderate"`, `"Precautions: Contraindicated during pregnancy"` are **100% hardcoded static text** in `safetyService.js`.
- **Frontend Display:** Rendered under the **"Safety & Dosage"** tab (`activeResearchTab === "safety"`) in `App.jsx`.

---

## PART 13 — MEDICINAL INFORMATION

- **Data Source:** Dynamic API response from Europe PMC REST API (`https://www.ebi.ac.uk/europepmc/webservices/rest/search`).
- **Query Flow:** `europePmcService.js` queries `"${scientificName}" AND (medicinal OR medicinal plant OR pharmacological OR therapeutic)`.
- **Returned Data:** Paper titles, journals, authors, publication dates, DOIs, PMIDs, abstracts, and `citedByCount`.
- **Frontend Render:** Displayed under the **"Medicinal Evidence"** tab (`activeResearchTab === "medicinal"`) in `App.jsx`.

---

## PART 14 — SCIENTIFIC LITERATURE

- **Primary Literature APIs:** Europe PMC REST API (`europePmcService.js`) and Crossref REST API (`crossrefService.js`).
- **Crossref Query:** `"${scientificName}" medicinal` returning DOI, title, authors, publication date, journal, publisher, and type.
- **Caching:** **NONE.** Requests are fetched live on each accepted prediction request.

---

## PART 15 — GBIF TAXONOMY

- **Endpoints:** `https://api.gbif.org/v1/species/match` (Name match) and `https://api.gbif.org/v1/species/{usageKey}` (Taxonomy tree).
- **Returned Taxonomy:** Kingdom, Phylum, Class, Order, Family, Genus, Species, Rank.
- **Why "Taxonomy Unavailable" Occurs:** If GBIF API fails to match the scientific name (e.g., spelling mismatch or unlisted species) or if the HTTP request times out (10s limit), `gbifService.js` returns `available: false`, triggering the UI fallback warning.

---

## PART 16 — FRONTEND

- **Architecture:** Single-page React application contained entirely within `frontend/src/App.jsx`.
- **Data Binding Summary:**
  - **Identified Plant Card:** Binds to `result.prediction.commonName`, `result.prediction.scientificName`, `result.prediction.calibratedConfidence`.
  - **Top Predictions List:** Binds to `result.prediction.topPredictions` (Top 5).
  - **Grad-CAM Analysis:** Binds to `result.gradcam.original`, `result.gradcam.heatmap`, `result.gradcam.overlay`.
  - **Research Tabs:** Toggles local state `activeResearchTab` between `"safety"`, `"extraction"`, `"taxonomy"`, `"compounds"`, `"medicinal"`, `"papers"`.

---

## PART 17 — API INVENTORY

| Method | Endpoint | Source File | Controller / Handler | Purpose | Input | Output JSON |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/predict` | `backend/routes/predict.js` | `predictController.predictImage` | Main gateway API for plant prediction + evidence | `multipart/form-data` (`image` file) | Complete prediction, Grad-CAM, taxonomy, compounds, safety, extraction JSON |
| **GET** | `/health` | `backend/server.js` | Inline handler | Backend health check | None | `{"status": "healthy"}` |
| **POST** | `/predict` | `ai_service/app/routes/predict.py` | `predict()` | AI inference & Grad-CAM generation | `multipart/form-data` (`file` file) | `prediction`, `model`, `gradcam` JSON |
| **GET** | `/health` | `ai_service/app/main.py` | `health_check()` | AI service health check | None | `{"status": "healthy"}` |

---

## PART 18 — STORAGE MAP

| Data Item | Storage Method | Location / File Path |
| :--- | :--- | :--- |
| **Uploaded Leaf Image** | IN-MEMORY BUFFER | Express Multer buffer & FastAPI RAM |
| **MobileNetV2 Model File** | LOCAL FILE | `training/models/mobilenetv2/mobilenetv2_best.keras` |
| **Class Mapping** | LOCAL FILE | `training/models/mobilenetv2/class_mapping.json` |
| **Prediction Result** | IN-MEMORY | Transient React state (`App.jsx`) |
| **User Data / Auth** | **NONE** | Unimplemented |
| **Plant Taxonomy** | EXTERNAL API | GBIF API (`api.gbif.org`) |
| **Bioactive Compounds** | HYBRID | Candidate list in `pubchemService.js`; properties from PubChem API |
| **Extraction Protocols** | **LOCAL FILE** | `backend/services/scientific/extractionService.js` |
| **Safety & Dosage Data** | **LOCAL FILE** | `backend/services/scientific/safetyService.js` |
| **Scientific Literature** | EXTERNAL API | Europe PMC & Crossref APIs |
| **Grad-CAM Images** | IN-MEMORY | Base64 Data URL strings in HTTP response |

---

## PART 19 — SECURITY AUDIT

> [!CAUTION]
> **SECURITY AUDIT FINDINGS**
> 1. **No Authentication / Authorization:** All endpoints are completely public. Anyone can upload images without rate limits or API keys.
> 2. **CORS Wildcard Allowed:** FastAPI allows origins `["*"]`, enabling any third-party domain to invoke the AI service directly.
> 3. **Missing Security Headers:** `helmet` is not installed or configured in Express.
> 4. **No Rate Limiting:** `express-rate-limit` is not installed, exposing the backend to Denial of Service (DoS) and API quota exhaustion on external services (PubChem, Europe PMC).

---

## PART 20 — UNUSED / OBSOLETE FILES

| File / Folder Path | Why It Exists | Used in Production? | Safe to Remove? | Reason |
| :--- | :--- | :---: | :---: | :--- |
| `training/models/efficientnetb0/` | Experimental model checkpoint | **NO** | YES | Defeated by MobileNetV2 (Top-1 Acc: 4.44%) |
| `calib_*.log`, `gradcam_*.log` | Temporary stdout/stderr logs | **NO** | YES | Leftover execution log files |
| `_marker_test.txt`, `_writetest.txt` | Scratch disk write test files | **NO** | YES | Temporary test artifacts |
| `response.json` | Saved sample API response | **NO** | YES | Static debug dump |

---

## PART 21 — PAPER VS ACTUAL SOFTWARE

| Claim / Feature | Audit Status | Exact Source Evidence |
| :--- | :---: | :--- |
| **1. 40-Class Plant Identification** | **SUPPORTED** | `inference_service.py` (40 classes mapped and evaluated) |
| **2. MobileNetV2 Architecture** | **SUPPORTED** | `training/models/mobilenetv2/mobilenetv2_best.keras` |
| **3. Temperature Calibration ($T=0.8037$)** | **SUPPORTED** | `inference_service.py` (Line 9 & Line 120) |
| **4. Rejection Handling ($\text{Threshold}=0.6234$)**| **SUPPORTED** | `inference_service.py` (Line 10 & Line 136) |
| **5. Grad-CAM Activation Mapping** | **SUPPORTED** | `gradcam_service.py` (Target layer `Conv_1`) |
| **6. Bioactive Compound Property Verification**| **SUPPORTED** | `pubchemService.js` (PUG REST API queries) |
| **7. GBIF Taxonomy Lookup** | **SUPPORTED** | `gbifService.js` (`api.gbif.org`) |
| **8. Europe PMC Literature Retrieval** | **SUPPORTED** | `europePmcService.js` (`ebi.ac.uk`) |
| **9. Crossref Paper Metadata Retrieval** | **SUPPORTED** | `crossrefService.js` (`api.crossref.org`) |
| **10. Dynamic Literature Extraction Protocols** | **NOT SUPPORTED** | Hardcoded static object in `extractionService.js` |
| **11. Dynamic Safety & Dosage Monographs** | **NOT SUPPORTED** | Hardcoded static object in `safetyService.js` |
| **12. MongoDB Cache Layer** | **NOT SUPPORTED** | 0 MongoDB code or dependencies in backend |
| **13. User Authentication / Profiles** | **NOT SUPPORTED** | 0 Auth routes or JWT code in system |

---

## PART 22 — COMPLETE DATA FLOW DIAGRAM

```
                     +-----------------------+
                     |     User Browser      |
                     |  (frontend/App.jsx)   |
                     +-----------+-----------+
                                 |
                        POST /api/predict
                        (Multipart Image)
                                 |
                                 v
                     +-----------------------+
                     |    Express Gateway    |
                     |  (backend/server.js)  |
                     +-----------+-----------+
                                 |
                          Forward Image
                         POST /predict
                                 |
                                 v
                     +-----------------------+
                     |   FastAPI AI Service  |
                     | (ai_service/main.py)  |
                     +-----------+-----------+
                                 |
            +--------------------+--------------------+
            |                                         |
            v                                         v
+-----------------------+                 +-----------------------+
|  Inference Service    |                 |   Grad-CAM Service    |
| (MobileNetV2 Model)   |                 |    (Layer Conv_1)     |
+-----------+-----------+                 +-----------+-----------+
            |                                         |
    Softmax Probabilities                      Base64 Heatmap
    Temperature Scaling (T=0.8037)                    |
    Rejection Check (Thr=0.6234)                      |
            |                                         |
            +--------------------+--------------------+
                                 |
                         Return AI Response
                                 |
                                 v
                     +-----------------------+
                     |  Predict Controller   |
                     |  (researchService.js) |
                     +-----------+-----------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
+-----------------+     +-----------------+     +-----------------+
|   GBIF API      |     |  PubChem API    |     | Europe PMC API  |
|  (Taxonomy)     |     |  (Compounds)    |     |  (Literature)   |
+-----------------+     +-----------------+     +-----------------+
         |                       |                       |
         +-----------------------+-----------------------+
                                 |
            +--------------------+--------------------+
            |                                         |
            v                                         v
+-----------------------+                 +-----------------------+
|   Safety Service      |                 |  Extraction Service   |
| (Static Dictionary)   |                 |  (Static Dictionary)  |
+-----------+-----------+                 +-----------+-----------+
            |                                         |
            +--------------------+--------------------+
                                 |
                      Aggregated JSON Response
                                 |
                                 v
                     +-----------------------+
                     |     User Browser      |
                     |  Render Result Cards  |
                     +-----------------------+
```

---

## PART 23 — ONE COMPLETE EXAMPLE: TRACING `Neem/1780.jpg`

1. **File Location:** `dataset/final_split/test/Neem/1780.jpg`
2. **User Upload:** User selects file via `<input type="file">` in `App.jsx`. Preview rendered locally via `URL.createObjectURL()`.
3. **API Request:** `handlePredict()` sends `POST http://127.0.0.1:5000/api/predict` with `FormData` containing the image buffer.
4. **Backend Gateway:** `backend/routes/predict.js` uses Multer to load image into memory buffer (`req.file.buffer`).
5. **AI Forwarding:** `predictController.js` constructs `FormData` and posts to `http://127.0.0.1:8000/predict`.
6. **FastAPI Validation:** `ai_service/app/routes/predict.py` verifies image integrity and RGB dimensions using PIL `Image.open()`.
7. **Preprocessing:** `inference_service.py` resizes image to `224x224`, expands batch dimension `(1, 224, 224, 3)`, and applies `mobilenet_v2.preprocess_input` (scaling pixels to `[-1.0, 1.0]`).
8. **MobileNetV2 Forward Pass:** Model executes forward pass, outputting raw softmax probability vector of length 40. Class `Neem` (Index 29) receives raw probability $\approx 0.96$.
9. **Calibration:** Logits computed: $\text{logits} = \ln(0.96) \approx -0.0408$. Scaled by temperature: $\text{logits}_{\text{cal}} = -0.0408 / 0.8037 \approx -0.0508$. Calibrated confidence $\approx 0.975$ ($97.5\%$).
10. **Rejection Decision:** Calibrated confidence ($0.975$) $\ge$ Rejection Threshold ($0.6234$). Prediction **ACCEPTED** (`rejected = false`).
11. **Scientific Mapping:** Index `29` mapped via `CLASS_SCIENTIFIC_MAP` to Scientific Name: *"Azadirachta indica"*, Common Name: *"Neem"*.
12. **Grad-CAM Execution:** `GradcamService.generate_gradcam()` extracts feature map from backbone layer `Conv_1`, computes gradients of `Neem` class score, applies ReLU, overlays jet heatmap onto original image, and returns Base64 strings.
13. **Scientific Data Fetching:** Express backend receives AI response and calls `researchService.getResearchData()`:
    - **GBIF API:** Searches *"Azadirachta indica"*, receives Kingdom: *Plantae*, Family: *Meliaceae*, Genus: *Azadirachta*.
    - **PubChem API:** Looks up candidates (`Azadirachtin`, `Nimbin`, `Nimbolide`, `Quercetin`, `Catechin`), resolves CIDs (e.g., CID `5281303` for Azadirachtin), and retrieves SMILES & IUPAC names.
    - **Europe PMC API:** Searches `"Azadirachta indica" AND medicinal`, returning peer-reviewed abstracts and DOIs.
    - **Crossref API:** Searches `"Azadirachta indica" medicinal`, returning paper titles and publication metadata.
    - **Safety Service:** Reads static dictionary in `safetyService.js` for `Neem` (Dosage: *1-2 g leaf powder daily*, Toxicity: *Moderate for leaf/High for seed oil in children*, Precautions: *Avoid in infants/pregnancy*).
    - **Extraction Service:** Reads static dictionary in `extractionService.js` for `Neem` (Method: *Maceration / Soxhlet*, Solvent: *95% Ethanol*, Temp: *50°C*, Time: *4-6 hours*).
14. **Final Response:** Express returns unified JSON to React frontend.
15. **Frontend Rendering:** `App.jsx` renders identified plant header (*Neem / Azadirachta indica*), 97.5% confidence bar, Grad-CAM activation heatmap, and populates all 6 interactive scientific evidence tabs.

---

## PART 24 — FINAL PROJECT SUMMARY

```
================================================================================
# ACTUAL PHYTOVISIONAI SYSTEM — ONE PAGE SUMMARY
================================================================================

TECH STACK:
  - Frontend: React 18.2.0, Vite 5.2.0, Axios 1.6.8, Vanilla CSS
  - Backend: Node.js, Express 4.19.2, Multer 1.4.5 (In-memory storage)
  - AI Service: FastAPI 0.110.0, Uvicorn 0.28.0, TensorFlow 2.21.0 / Keras
  - Database: NONE (No database implemented)
  - External APIs: GBIF, PubChem, Europe PMC, Crossref

ML MODEL:
  - Architecture: MobileNetV2 (ImageNet pre-trained backbone + Custom Classification Head)
  - Model File: training/models/mobilenetv2/mobilenetv2_best.keras (25.91 MB)
  - Parameters: 2,596,200 Total | 2,019,560 Trainable
  - Input Size: 224x224x3 RGB | Preprocessing: mobilenet_v2.preprocess_input [-1, 1]

DATASET & METRICS:
  - Total Valid Images: 6,788 | Classes: 40
  - Split Ratio: 70/15/15 (Train: 4,740 | Val: 990 | Test: 1,058)
  - Cross-Split Duplicate Overlap: ZERO (Verified by MD5 checksum)
  - Best Validation Accuracy: 91.31%
  - Test Top-1 Accuracy: 89.70% | Test Top-3 Accuracy: 97.83% | Test Top-5 Accuracy: 98.96%
  - Macro Precision: 90.34% | Macro Recall: 89.47% | Macro F1: 89.59% | Weighted F1: 89.76%

CALIBRATION & GRAD-CAM:
  - Temperature Scaling Factor (T): 0.8037 (Fitted on validation logits)
  - Expected Calibration Error (ECE): 0.0110 (Test set)
  - Rejection Threshold: 0.6234 (Calibrated confidence threshold)
  - Grad-CAM Layer: Conv_1 layer of MobileNetV2 backbone (7x7x1280 feature maps)

EVIDENCE SOURCES:
  - Botanical Taxonomy: Dynamic GBIF API
  - Bioactive Compounds: Dynamic PubChem PUG REST API (Verified CIDs & SMILES)
  - Literature & Papers: Dynamic Europe PMC & Crossref APIs
  - Extraction Protocols: HARDCODED STATIC DICTIONARY (extractionService.js)
  - Safety & Dosage: HARDCODED STATIC DICTIONARY (safetyService.js)

SECURITY & AUTHENTICATION:
  - Authentication: NONE (Public APIs)
  - Security Middleware: Wildcard CORS (*), No Helmet, No Rate Limiting

================================================================================
```

---

## PART 25 — TEACH ME THE PROJECT (CSE STUDENT GUIDE)

### "If I upload a Neem leaf image, what happens behind the scenes?"

#### 1. Image Selection & Upload
- **Technical:** In `frontend/src/App.jsx`, clicking the upload card fires `handleFileChange()`, which stores the `File` object in React state and generates a local browser blob URL (`URL.createObjectURL()`) to display the preview image.
- **Simple Explanation:** You pick an image on your computer, and React shows a quick preview on the screen before sending it anywhere.

#### 2. Sending the Image to the Backend Gateway
- **Technical:** Clicking "Identify Plant" executes `handlePredict()`, sending an HTTP POST request via Axios to `http://127.0.0.1:5000/api/predict` with a `FormData` payload containing the raw image binary.
- **Simple Explanation:** React packages your image into a digital envelope and mails it to the Node.js Express backend server.

#### 3. Forwarding to the Python AI Service
- **Technical:** In `backend/controllers/predictController.js`, Express receives the file into memory via Multer (`multer.memoryStorage()`), validates its MIME type (`image/jpeg`, `image/png`, `image/webp`), and forwards the binary buffer to the FastAPI AI service at `http://127.0.0.1:8000/predict`.
- **Simple Explanation:** Express acts like a receptionist. It verifies your image is valid and passes it straight to the Python AI engine for heavy mathematical processing.

#### 4. Preprocessing & MobileNetV2 Prediction
- **Technical:** In `ai_service/app/services/inference_service.py`, FastAPI resizes the image to $224 \times 224$ pixels, normalizes pixel values to $[-1, 1]$, and feeds it into `MobileNetV2`. The model outputs 40 raw probabilities corresponding to the 40 plant classes.
- **Simple Explanation:** The AI shrinks your image to a standard square, converts every pixel into numbers between $-1$ and $1$, and runs it through millions of artificial neural connections to figure out which plant it looks like.

#### 5. Confidence Calibration & Rejection Check
- **Technical:** The raw logit score is divided by temperature $T = 0.8037$ ($\text{logit} / 0.8037$) and passed through a calibrated Softmax function. If the maximum calibrated probability is less than $0.6234$, the model rejects the image as "Unknown". Otherwise, it outputs `"Neem"`.
- **Simple Explanation:** Raw neural network scores are often overconfident. Temperature scaling adjusts the score so that if the model says $95\%$ confident, it is actually right $95\%$ of the time. If the score is too low, it admits it doesn't know.

#### 6. Grad-CAM Explainable AI Generation
- **Technical:** In `ai_service/app/services/gradcam_service.py`, `tf.GradientTape()` calculates gradients of the `Neem` output score relative to feature activations at convolutional layer `Conv_1`. It generates a $224 \times 224$ jet colormap heatmap, overlays it onto the original image, and encodes the resulting images as Base64 text strings.
- **Simple Explanation:** The AI highlights the exact regions of the leaf (like leaf edges or vein patterns) that convinced it to choose "Neem".

#### 7. Gathering Scientific Evidence
- **Technical:** Once Express receives the prediction `"Neem" ("Azadirachta indica")`, `predictController.js` triggers `researchService.js` to perform concurrent external API requests to GBIF (taxonomy), PubChem (chemical structures), Europe PMC (medical studies), and Crossref (journals), while pulling safety guidelines and extraction protocols from local JavaScript dictionaries.
- **Simple Explanation:** Express takes the name "Neem" and simultaneously searches scientific databases around the world to collect its family tree, chemicals, and medical research papers.

#### 8. Displaying Results on the Web Dashboard
- **Technical:** Express returns a unified JSON object back to React. `App.jsx` updates its `result` state, triggering a re-render to display the identified plant, confidence meter, Grad-CAM overlay, and tabbed scientific research profile.
- **Simple Explanation:** React unpackages the complete response and presents all the images, graphs, and research tabs nicely on your screen.

---

## PART 26 — LEARNING ORDER FOR A NEW DEVELOPER

If you are reading this codebase for the first time, follow this exact file reading order:

1. **`ai_service/app/services/inference_service.py`**
   - *What to understand:* How MobileNetV2 is loaded, image preprocessing, temperature scaling calibration, and rejection logic.
   - *Why it matters:* Core AI logic of the entire project.

2. **`ai_service/app/services/gradcam_service.py`**
   - *What to understand:* How TensorFlow gradients are calculated from layer `Conv_1` to generate visual heatmaps.
   - *Why it matters:* Explainable AI (XAI) engine.

3. **`ai_service/app/routes/predict.py` & `ai_service/app/main.py`**
   - *What to understand:* FastAPI lifespan initialization, file input validation, and endpoint structure.
   - *Why it matters:* Shows how the Python AI microservice is exposed.

4. **`backend/controllers/predictController.js` & `backend/routes/predict.js`**
   - *What to understand:* How Node.js receives image uploads using Multer in-memory storage and forwards them to FastAPI.
   - *Why it matters:* Primary API Gateway connecting frontend to AI service.

5. **`backend/services/scientific/researchService.js`**
   - *What to understand:* How scientific data retrieval is orchestrated across external APIs and local services.
   - *Why it matters:* Main scientific evidence aggregator.

6. **`backend/services/scientific/gbifService.js` & `pubchemService.js`**
   - *What to understand:* How live HTTP REST queries are constructed for GBIF and PubChem.
   - *Why it matters:* Demonstrates dynamic API integrations for taxonomy and chemical properties.

7. **`backend/services/scientific/extractionService.js` & `safetyService.js`**
   - *What to understand:* How static plant monographs are structured in JavaScript objects.
   - *Why it matters:* Clarifies how safety notes and laboratory extraction parameters are provided.

8. **`frontend/src/App.jsx`**
   - *What to understand:* React state management, file uploading, API integration, and tabbed rendering of Grad-CAM and scientific data.
   - *Why it matters:* Complete user interface and presentation layer.

9. **`training/scripts/common.py` & `training/scripts/10_calibrate.py`**
   - *What to understand:* Dataset pipeline construction, MD5 leakage verification, and offline temperature fitting algorithm.
   - *Why it matters:* Essential for understanding paper metrics, calibration fitting, and reproducibility.

---
*End of Complete Read-Only Audit Report.*
