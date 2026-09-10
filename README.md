# PhytoVisionAI
**AI-Based Medicinal Plant Identification and Bioactive Compound Analysis System**

PhytoVisionAI is a production-grade pharmacognosy platform that combines deep learning visual identification of botanical specimens with dynamic scientific literature retrieval, GBIF taxonomic verification, PubChem chemical compound profiling, dynamic laboratory extraction protocols, and explainable AI (Grad-CAM).

---

## 1. Project Overview

Medicinal plants have served as the foundation of traditional and modern pharmacology for millennia. Correct identification of botanical specimens is critical for safety, efficacy, and standardization. PhytoVisionAI provides an automated, end-to-end pharmacognosy pipeline:

1. **Leaf Specimen Identification**: Deep convolutional neural network (MobileNetV2) trained on 40 distinct medicinal plant taxa, calibrated with Temperature Scaling and Out-of-Distribution (OOD) rejection.
2. **Explainable AI (Grad-CAM)**: Visual activation heatmaps highlighting the exact morphological leaf regions contributing to classification.
3. **Botanical Taxonomy**: Dual-source taxonomic verification across Indian local names, English common names, binomial scientific names, family, genus, and species.
4. **Phytochemical & Bioactive Profiling**: Automated retrieval of verified chemical constituents from PubChem PUG REST, including Compound ID (CID), IUPAC nomenclature, and SMILES chemical notations.
5. **Laboratory Extraction Protocols**: 2-Tier dynamic extraction guidance with empirical parameters (plant part, extraction method, solvent system, concentration, temperature, duration, preparation) and DOI citations. Unavailable parameters are strictly omitted to eliminate fabricated scientific values.
6. **Pharmacovigilance & Safety**: Monograph-backed therapeutic dosage standards, toxicological cautions, and contraindications.
7. **Condition & Symptom Recommendations**: Catalog-matched indications allowing researchers to explore evidence-backed medicinal taxa for conditions such as respiratory distress ("cough"), skin inflammation, or digestive complaints.

---

## 2. Key Features

- **40 Botanical Classes**: High-specificity identification across 40 medicinal plant taxa.
- **Multilingual Botanical Names**:
  - Prominent Indian Local Name (e.g., *Amruta Balli*, *Arali*, *Tulasi*)
  - Binomial Scientific Name in italics (e.g., *Tinospora cordifolia*, *Nerium oleander*, *Ocimum tenuiflorum*)
  - English Common Name (e.g., *Heart-leaved Moonseed*, *Oleander*, *Holy Basil*)
- **Botanical Taxonomy**: Family, genus, species, and model class tracking.
- **Probabilistic Confidence & Calibration**: Temperature-scaled confidence scores ($T = 1.2504$) and rejection threshold ($\tau = 0.70$) for robust out-of-distribution detection.
- **Visual Explainability (Grad-CAM)**: Activation heatmaps extracted from the target feature layer (`Conv_1`) overlaid on original specimen imagery.
- **Dynamic Extraction Protocol**: Dynamic filtering where only parameters with recovered empirical evidence are rendered; missing fields are safely treated as `null` with no placeholder strings (*"Not reported in retrieved source"* eliminated).
- **Phytochemical Integration**: Direct integration with the PubChem PUG REST API for chemical structures and external monograph sources.
- **Pharmacovigilance & Safety Data**: Sourced from the *Ayurvedic Pharmacopoeia of India (API)* and *WHO Monographs on Selected Medicinal Plants*.
- **Condition-Based Recommendation Engine**: Search plants by symptom or indication with fuzzy match normalization and evidence citation.
- **Researcher Workspace & History**: User registration, JWT-based authentication, guest exploration mode, identification history logging, and personal saved plant collections.
- **Resilient UI with Error Boundary**: React 18 frontend with complete defensive data resolution and error boundaries preventing blank-screen render failures.

---

## 3. System Architecture

PhytoVisionAI operates as a modular, decoupled microservice architecture:

```
+-------------------------------------------------------------------------------+
|                                 USER BROWSER                                  |
|                 React 18 + Vite Frontend (Single-Page Application)            |
|       - ResultDashboard (7 Evidence Cards)    - AnalysisView (Grad-CAM & ECE) |
|       - RecommendationsView (Symptom Search)  - History & Saved Plants        |
+---------------------------------------+---------------------------------------+
                                        |
                             HTTP / REST (Port 5000)
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                             EXPRESS API GATEWAY                               |
|                       (Node.js / Express on Port 5000)                        |
|  - Security Headers (Helmet, CORS)            - Multer In-Memory Storage      |
|  - JWT Authentication & BCrypt                - Rate-limiting & Diagnostics   |
|  - Scientific Aggregator (GBIF, PubChem, Europe PMC, Crossref)                |
+-------------------+---------------------------------------+-------------------+
                    |                                       |
          HTTP POST /predict                      Mongoose / MongoDB
           (Multipart Stream)                    (Port 27017: phyto_vision_cache)
                    |                                       |
                    v                                       v
+---------------------------------------+   +-----------------------------------+
|          FASTAPI AI SERVICE           |   |          MONGODB DATABASE         |
|   (Python / FastAPI on Port 8000)     |   | - 40 Botanical Taxa Records       |
| - MobileNetV2 Neural Network          |   | - Pharmacopoeial Monographs       |
| - Temperature Scaling Calibration     |   | - User Accounts (JWT / Bcrypt)    |
| - Softmax Rejection Engine            |   | - Identification History Logs     |
| - Grad-CAM Activation Visualizer      |   | - Saved Plant Collections         |
+---------------------------------------+   +-----------------------------------+
```

---

## 4. Technology Stack

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.2.0 / 8.2.1
- **HTTP Client**: Axios 1.6.8
- **Styling**: Modern Responsive CSS (Glassmorphism, Card Grids, CSS Variables)
- **Error Handling**: Custom React `ErrorBoundary` wrapper

### Backend API Gateway
- **Runtime**: Node.js (>= 18.0.0)
- **Framework**: Express 4.19.2
- **Database Driver**: Mongoose 8.3.1 / MongoDB
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **File Upload**: `multer` (MemoryStorage buffer processing)
- **Security**: `helmet`, `cors`

### AI & Deep Learning Inference Service
- **Framework**: FastAPI 0.110.0
- **Server**: Uvicorn 0.28.0
- **ML / DL Framework**: PyTorch / TensorFlow 2.21.0 / Keras
- **Image Processing**: Pillow 10.2.0, NumPy 2.2.6, SciPy >= 1.14.1

### Persistence & Databases
- **Database**: MongoDB (Local or Atlas)
- **Database Name**: `phyto_vision_cache`
- **Collections**: `plants`, `users`, `histories`, `savedplants`

---

## 5. Machine Learning Pipeline

```
Leaf Specimen (JPG/PNG/WebP)
             │
             ▼
   [224x224 RGB Resize]
             │
             ▼
  [Normalized Tensor Buffer]
             │
             ▼
  [MobileNetV2 Feature Backbone]
             │
             ▼
    [Conv_1 Target Layer] ─────────► [Grad-CAM Backpropagation]
             │                                   │
             ▼                                   ▼
 [Dense Classifier (40 Classes)]        [Heatmap & Overlay JPG]
             │
             ▼
      [Raw Logits z_i]
             │
             ▼
[Temperature Scaling (T = 1.2504)]
             │
             ▼
  [Calibrated Softmax Probabilities]
             │
             ├──► If max(P) >= 0.70 ──► Confirmed Plant Prediction
             └──► If max(P) < 0.70  ──► Out-of-Distribution Rejection
```

- **Backbone Architecture**: MobileNetV2 pre-trained on ImageNet and fine-tuned in two stages across 40 medicinal plant classes.
- **Input Dimension**: $224 \times 224 \times 3$ RGB.
- **Calibration Method**: Post-hoc Temperature Scaling applied to unnormalized logits:
  $$\hat{p}_i = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}$$
- **Confidence Calibration Factor**: $T = 1.2504$.
- **Rejection Threshold**: $\tau = 0.70$ (samples with $\max_i \hat{p}_i < \tau$ trigger rejection).
- **Visual Explainability**: Grad-CAM computes gradients of the predicted class score with respect to feature maps in the final convolutional layer (`Conv_1`), highlighting discriminative leaf venation and morphology.

---

## 6. Plant Metadata & Taxonomy

Every cataloged taxon in PhytoVisionAI provides comprehensive multi-attribute botanical metadata:

| Field | Description | Example 1 | Example 2 | Example 3 |
| :--- | :--- | :--- | :--- | :--- |
| **`localName`** | Prominent Indian / Regional Name | **Amruta Balli** | **Arali** | **Tulasi** |
| **`scientificName`** | Botanical Binomial (Italics) | *Tinospora cordifolia* | *Nerium oleander* | *Ocimum tenuiflorum* |
| **`commonName`** | English Vernacular Name | Heart-leaved Moonseed | Oleander | Holy Basil |
| **`taxonomy.family`**| Botanical Plant Family | Menispermaceae | Apocynaceae | Lamiaceae |
| **`taxonomy.genus`** | Genus | Tinospora | Nerium | Ocimum |
| **`taxonomy.species`**| Specific Epithet | cordifolia | oleander | tenuiflorum |
| **`modelClass`** | Internal Classifier Identifier | `Amruta_Balli` | `Arali` | `Tulasi` |

All 40 botanical taxa in MongoDB are searchable via their local name, scientific name, or common name.

---

## 7. Dynamic Laboratory Extraction Protocol

PhytoVisionAI implements an evidence-grounded laboratory extraction protocol:
- **8 Protocol Parameters**:
  1. Plant Part (e.g., Leaves, Stem, Roots)
  2. Extraction Method (e.g., Soxhlet Extraction, Maceration, Decoction)
  3. Solvent System (e.g., Ethanol, Aqueous Methanol, Water)
  4. Solvent Concentration (e.g., 70% v/v)
  5. Temperature (e.g., 45°C - 50°C)
  6. Extraction Duration (e.g., 6 Hours)
  7. Sample Preparation (e.g., Shade-dried coarse powder)
  8. Literature Reference & DOI link
- **Zero-Placeholder Guarantee**: Missing parameters are represented strictly as `null` and filtered from the DOM.
- **Dynamic Completeness Counter**: Displays `Available protocol parameters: X of 8 parameters available`.
- **Empty-State Guard**: If no valid empirical parameters exist in retrieved literature, a clean notice is rendered without broken layout cards.

---

## 8. REST API Overview

### Plant Identification & Analysis
| Method | Endpoint | Description | Request / Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/predict` | Identifies plant from uploaded leaf image, computes Grad-CAM, and aggregates scientific data | Multipart `FormData` (`image`: file buffer) |

### Botanical Knowledge Base
| Method | Endpoint | Description | Request / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/plants` | Lists all 40 medicinal plant records (with optional regex search) | Query `?search=...` (optional) |
| `GET` | `/api/plants/:idOrClass`| Retrieves plant metadata by ID, class, scientific name, or local name | URL parameter (e.g., `/api/plants/Amruta%20Balli`) |

### Specialized Scientific Services
| Method | Endpoint | Description | Request / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/extraction/:idOrClass` | Retrieves laboratory extraction guidance and DOI references | URL parameter (`idOrClass`) |
| `GET` | `/api/safety/:idOrClass` | Retrieves toxicity rating, recommended dosage, and precautions | URL parameter (`idOrClass`) |
| `GET` | `/api/recommendations/condition/:condition` | Recommends evidence-backed medicinal taxa for symptoms/conditions | URL parameter (e.g., `cough`, `skin`, `digestive`) |

### Researcher Authentication & History
| Method | Endpoint | Description | Request / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registers new researcher account | JSON `{ name, email, password }` |
| `POST` | `/api/auth/login` | Authenticates user and issues JWT | JSON `{ email, password }` |
| `POST` | `/api/auth/guest` | Issues temporary guest researcher session | Empty JSON |
| `GET` | `/api/auth/me` | Fetches active researcher profile | `Bearer <JWT_TOKEN>` header |
| `GET` | `/api/history` | Retrieves user identification history | `Bearer <JWT_TOKEN>` header |
| `POST` | `/api/history` | Saves prediction to user history | JSON `{ scientificName, confidence, notes }` |
| `GET` | `/api/saved-plants` | Retrieves saved plants collection | `Bearer <JWT_TOKEN>` header |
| `POST` | `/api/saved-plants/:plantId` | Saves plant to user library | URL parameter (`plantId`) |
| `DELETE`| `/api/saved-plants/:plantId` | Removes plant from collection | URL parameter (`plantId`) |

---

## 9. Project Structure

```
PhytoVisionAI/
├── ai_service/                            # Python FastAPI Inference Microservice
│   ├── app/
│   │   ├── routes/
│   │   │   └── predict.py                 # POST /predict route with Grad-CAM
│   │   ├── services/
│   │   │   ├── inference_service.py       # MobileNetV2 inference & calibration
│   │   │   └── gradcam_service.py         # Conv_1 feature map visualizer
│   │   └── main.py                        # FastAPI application entry point
│   ├── Dockerfile
│   └── requirements.txt
│
├── backend/                               # Node.js / Express API Gateway
│   ├── config/
│   │   └── config.js                      # Environment and server configuration
│   ├── controllers/
│   │   ├── authController.js              # Authentication controller
│   │   ├── extractionController.js        # Dynamic extraction controller
│   │   ├── historyController.js           # Identification history controller
│   │   ├── plantController.js             # Plant query and local-name search
│   │   ├── predictController.js           # Gateway upload & aggregator controller
│   │   ├── recommendationController.js    # Symptom-based recommendation controller
│   │   ├── safetyController.js            # Pharmacological safety controller
│   │   └── savedPlantController.js        # User saved-plants collection controller
│   ├── middleware/
│   │   └── auth.js                        # JWT validation & guest check middleware
│   ├── models/
│   │   ├── History.js                     # Identification history Mongoose schema
│   │   ├── Plant.js                       # 40-Taxa Botanical knowledge schema
│   │   ├── SavedPlant.js                  # User saved plants Mongoose schema
│   │   └── User.js                        # Researcher user account Mongoose schema
│   ├── routes/                            # Express REST route definitions
│   ├── seed/
│   │   ├── buildData.js                   # Seed dataset generator script
│   │   ├── plantEvidenceData.js           # Curated monographs & indications
│   │   ├── plantsData.json                # Compiled 40-taxa seed payload
│   │   ├── scientific_map.json            # Canonical taxonomy & local name mapping
│   │   └── seedPlants.js                  # MongoDB database population script
│   ├── services/
│   │   ├── authService.js                 # Authentication service helper
│   │   └── scientific/
│   │       ├── conditionService.js        # Symptom indication indexer
│   │       ├── crossrefService.js         # Crossref publication and DOI fetcher
│   │       ├── europePmcService.js        # Europe PMC biomedical literature fetcher
│   │       ├── extractionService.js       # Dynamic extraction parser & monograph fallback
│   │       ├── gbifService.js             # GBIF botanical taxonomy matcher
│   │       ├── pubchemService.js          # PubChem chemical structure lookup
│   │       ├── researchService.js         # Master scientific orchestrator
│   │       └── safetyService.js           # Pharmacological safety monograph service
│   ├── tests/                             # Automated backend integration test suites
│   ├── db.js                              # MongoDB connection lifecycle manager
│   ├── server.js                          # Express gateway server entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                              # React 18 / Vite Web Client
│   ├── src/
│   │   ├── assets/                        # Botanical logos and imagery
│   │   ├── components/
│   │   │   ├── AnalysisView.jsx           # Screen 7: Dedicated AI & Grad-CAM analysis
│   │   │   ├── AuthModal.jsx              # Login / registration modal dialog
│   │   │   ├── HistoryView.jsx            # Identification history viewer
│   │   │   ├── Navbar.jsx                 # Global header with authentication status
│   │   │   ├── ProfileView.jsx            # User profile and saved plant library
│   │   │   ├── RecommendationsView.jsx    # Dedicated condition search explorer
│   │   │   └── ResultDashboard.jsx        # Screen 6: Main 7-card scientific dashboard
│   │   ├── services/
│   │   │   └── api.js                     # Centralized Axios client for all backend routes
│   │   ├── AnalysisView.css               # Analysis screen stylesheet
│   │   ├── App.css                        # Application core styling
│   │   ├── App.jsx                        # Root React component with ErrorBoundary
│   │   ├── index.css                      # Global baseline stylesheet
│   │   ├── main.jsx                       # React DOM root entry point
│   │   └── ResultDashboard.css            # Result dashboard card grid stylesheet
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile
│   └── package.json
│
├── dataset/                               # Curated Botanical Image Dataset (40 Classes)
│   ├── cleaned/                           # De-duplicated images per class
│   └── final_split/                       # Stratified train, val, and test splits
│
├── reports/                               # Verification & Evaluation Metrics
│   ├── dataset/                           # Cleaning and split statistics
│   └── models/                            # PyTorch weights, ECE calibration & manifests
│
├── tests/                                 # Root Integration Tests
│   └── integration/
│       └── test_foundation.py             # Python requests-based end-to-end test
│
├── .env.example                           # Template for environment configuration
├── .gitignore                             # Git exclusion rules
├── docker-compose.yml                     # Docker Compose multi-service deployment
├── FINAL_PROJECT_ARCHITECTURE.md          # Technical architecture reference
├── PROJECT_DATA_FLOW.md                   # End-to-end data flow documentation
├── PROJECT_STRUCTURE.md                   # Clean post-cleanup codebase structure
├── README.md                              # Main project documentation (this file)
└── start_all.bat                          # One-click Windows startup script
```

---

## 10. Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or later
- **Python**: v3.10 or v3.11
- **MongoDB**: Community Server v6.0+ (running locally on `localhost:27017` or MongoDB Atlas)

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-org/PhytoVisionAI.git
cd PhytoVisionAI
cp .env.example .env
```

### 2. Configure Environment Variables (`.env`)
```env
# Gateway Ports & Hosts
PORT=5000
AI_SERVICE_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173

# Database & Authentication
MONGODB_URI=mongodb://127.0.0.1:27017/phyto_vision_cache
JWT_SECRET=your_secure_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Install Dependencies

#### Backend Gateway
```bash
cd backend
npm install
```

#### Frontend Client
```bash
cd ../frontend
npm install
```

#### AI Inference Service
```bash
cd ../ai_service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Seed Botanical Database (MongoDB)
Ensure MongoDB is running, then execute the seeding script to populate all 40 medicinal plant taxa:
```bash
cd ../backend
node seed/seedPlants.js
```
*Expected Output:* `Database seeded successfully with 40 plant records.`

---

## 11. Running the System

### Option A: One-Click Startup (Windows)
Double-click `start_all.bat` or run:
```cmd
start_all.bat
```

### Option B: Manual Service Startup (3 Terminals)

**Terminal 1 — FastAPI AI Service (Port 8000):**
```bash
cd ai_service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Express API Gateway (Port 5000):**
```bash
cd backend
node server.js
```

**Terminal 3 — React Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 12. Testing & Verification

PhytoVisionAI includes 7 automated test suites covering authentication, botanical taxonomy, extraction parameters, symptom recommendations, and image uploads:

```bash
# Run all backend integration suites
node backend/tests/test_phase2_4.js
node backend/tests/test_phase2_5.js
node backend/tests/test_phase2_6.js
node backend/tests/test_phase2_8.js
node backend/tests/test_indications.js
node backend/tests/test_local_names_and_dynamic_extraction.js
node backend/tests/test_upload_prediction.js
```

### Production Build Verification
To ensure zero compilation or bundler errors in the frontend:
```bash
cd frontend
npm run build
```

---

## 13. Medical & Pharmacognosy Disclaimer

> [!IMPORTANT]
> **Scientific & Medical Disclaimer**  
> PhytoVisionAI is designed strictly for research, educational, and computational pharmacognosy purposes. It does **not** provide clinical diagnosis, medical treatment, or prescription advice. Pharmacological preparations should never be consumed or applied based solely on automated computational identifications. Always consult a qualified physician or healthcare professional.

---

## 14. License

This project is licensed under the MIT License — see the repository files for details.
